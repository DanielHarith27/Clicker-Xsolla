package api

import (
	"database/sql"
	"math"
	"net/http"

	"clicker-game/backend/internal/models"

	"github.com/gin-gonic/gin"
)

type GameHandler struct {
	db *sql.DB
}

func NewGameHandler(db *sql.DB) *GameHandler {
	return &GameHandler{db: db}
}

var upgradeMaxOwnedCounts = map[string]int{
	"Cursor":               25,
	"Grandma":              15,
	"Farm":                 12,
	"Factory":              10,
	"Bank":                 8,
	"Wizard":               7,
	"Robot":                6,
	"Alien":                5,
	"Wizard Tower":         5,
	"Time Machine":         4,
	"Spaceship":            4,
	"Portal":               3,
	"Infinity Engine":      3,
	"Multiverse Generator": 2,
	"God Mode":             2,
	"Quantum Mine":         2,
	"Nebula Forge":         2,
	"Black Hole Vault":     1,
	"Celestial Bazaar":     1,
	"Singularity Core":     1,
}

func getUpgradeMaxOwnedCount(name string) int {
	if maxCount, exists := upgradeMaxOwnedCounts[name]; exists {
		return maxCount
	}

	return 1
}

// getUpgradeTotalGain returns the total passive gain from an upgrade at a given owned count.
// Example with base 0.1: 1 owned => 0.10, 2 owned => 0.15, 3 owned => 0.20.
func getUpgradeTotalGain(baseGain float64, ownedCount int) float64 {
	if ownedCount <= 0 {
		return 0
	}

	growthMultiplier := 1 + (0.5 * float64(ownedCount-1))
	return baseGain * growthMultiplier
}

// bindJSON consolidates JSON binding error handling
func (h *GameHandler) bindJSON(c *gin.Context, req interface{}) bool {
	if err := c.ShouldBindJSON(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return false
	}
	return true
}

// GetState retrieves the current game state
func (h *GameHandler) GetState(c *gin.Context) {
	userID := c.GetInt("user_id")

	// Get game state
	gameState := models.GameState{}
	err := h.db.QueryRow(
		"SELECT id, user_id, coins, coins_per_second, level FROM game_state WHERE user_id = $1",
		userID,
	).Scan(&gameState.ID, &gameState.UserID, &gameState.Coins, &gameState.CoinsPerSecond, &gameState.CurrentLevel)

	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "game state not found"})
		return
	}

	// Get upgrades
	rows, err := h.db.Query(`
		SELECT u.id, u.name, u.description, u.base_cost, u.coins_per_second_gain, u.icon, 
		       COALESCE(uu.owned_count, 0) as owned_count
		FROM upgrades u
		LEFT JOIN user_upgrades uu ON u.id = uu.upgrade_id AND uu.user_id = $1
		ORDER BY u.id
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch upgrades"})
		return
	}
	defer rows.Close()

	upgrades := []models.Upgrade{}
	for rows.Next() {
		var upgrade models.Upgrade
		rows.Scan(&upgrade.ID, &upgrade.Name, &upgrade.Description, &upgrade.BaseCost,
			&upgrade.CoinsPerSecondGain, &upgrade.Icon, &upgrade.OwnedCount)
		upgrade.MaxOwnedCount = getUpgradeMaxOwnedCount(upgrade.Name)
		upgrades = append(upgrades, upgrade)
	}

	// Get levels
	levelRows, err := h.db.Query(`
		SELECT l.id, l.level_number, l.coin_threshold, l.unlock_cost,
		       COALESCE(ul.unlocked, FALSE) as unlocked
		FROM levels l
		LEFT JOIN user_levels ul ON l.level_number = ul.level_number AND ul.user_id = $1
		ORDER BY l.level_number
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch levels"})
		return
	}
	defer levelRows.Close()

	levels := []models.Level{}
	for levelRows.Next() {
		var level models.Level
		levelRows.Scan(&level.ID, &level.LevelNumber, &level.CoinThreshold,
			&level.UnlockCost, &level.Unlocked)
		levels = append(levels, level)
	}

	response := models.GameStateResponse{
		Coins:          gameState.Coins,
		CoinsPerSecond: gameState.CoinsPerSecond,
		CurrentLevel:   gameState.CurrentLevel,
		Upgrades:       upgrades,
		Levels:         levels,
	}

	c.JSON(http.StatusOK, response)
}

// Click handles a click action
func (h *GameHandler) Click(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.ClickRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		req.CoinsPerClick = 1
	}

	var coins int64
	err := h.db.QueryRow(
		"UPDATE game_state SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING coins",
		req.CoinsPerClick, userID,
	).Scan(&coins)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update coins"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"coins": coins})
}

// BuyUpgrade handles upgrade purchase
func (h *GameHandler) BuyUpgrade(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.BuyUpgradeRequest

	if !h.bindJSON(c, &req) {
		return
	}

	// Get upgrade details
	var upgrade models.Upgrade
	err := h.db.QueryRow(
		"SELECT id, name, base_cost, coins_per_second_gain FROM upgrades WHERE id = $1",
		req.UpgradeID,
	).Scan(&upgrade.ID, &upgrade.Name, &upgrade.BaseCost, &upgrade.CoinsPerSecondGain)

	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "upgrade not found"})
		return
	}

	// Get current owned count
	var ownedCount int
	err = h.db.QueryRow(
		"SELECT COALESCE(owned_count, 0) FROM user_upgrades WHERE user_id = $1 AND upgrade_id = $2",
		userID, req.UpgradeID,
	).Scan(&ownedCount)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get upgrade ownership"})
		return
	}
	if err == sql.ErrNoRows {
		ownedCount = 0
	}

	// Get current coins
	var currentCoins int64
	var cps float64
	err = h.db.QueryRow(
		"SELECT coins, coins_per_second FROM game_state WHERE user_id = $1",
		userID,
	).Scan(&currentCoins, &cps)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get game state"})
		return
	}

	maxOwnedCount := getUpgradeMaxOwnedCount(upgrade.Name)
	if ownedCount >= maxOwnedCount {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           "upgrade limit reached",
			"message":         "This upgrade is maxed out",
			"upgrade_id":      req.UpgradeID,
			"upgrade_name":    upgrade.Name,
			"owned_count":     ownedCount,
			"max_owned_count": maxOwnedCount,
			"current_coins":   currentCoins,
		})
		return
	}

	previousTotalGain := getUpgradeTotalGain(upgrade.CoinsPerSecondGain, ownedCount)
	newTotalGain := getUpgradeTotalGain(upgrade.CoinsPerSecondGain, ownedCount+1)
	purchaseGain := newTotalGain - previousTotalGain

	cost := int64(math.Ceil(float64(upgrade.BaseCost) * math.Pow(1.15, float64(ownedCount))))

	if currentCoins < cost {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":            "not enough coins",
			"required_coins":   cost,
			"current_coins":    currentCoins,
			"upgrade_id":       req.UpgradeID,
			"owned_count":      ownedCount,
			"max_owned_count":  maxOwnedCount,
			"coins_per_second": cps,
		})
		return
	}

	// Deduct coins and add upgrade
	_, err = h.db.Exec(
		"UPDATE game_state SET coins = coins - $1, coins_per_second = coins_per_second + $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3",
		cost, purchaseGain, userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to purchase upgrade"})
		return
	}

	result, err := h.db.Exec(
		"UPDATE user_upgrades SET owned_count = owned_count + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND upgrade_id = $2",
		userID, req.UpgradeID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update upgrade count"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to confirm upgrade purchase"})
		return
	}

	if rowsAffected == 0 {
		_, err = h.db.Exec(
			"INSERT INTO user_upgrades (user_id, upgrade_id, owned_count) VALUES ($1, $2, 1)",
			userID, req.UpgradeID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create upgrade ownership"})
			return
		}
	}

	cps += purchaseGain
	newCoins := currentCoins - cost
	nextCost := int64(math.Ceil(float64(upgrade.BaseCost) * math.Pow(1.15, float64(ownedCount+1))))
	if ownedCount+1 >= maxOwnedCount {
		nextCost = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"coins":            newCoins,
		"coins_per_second": cps,
		"upgrade_gain":     purchaseGain,
		"next_cost":        nextCost,
		"max_owned_count":  maxOwnedCount,
	})
}

// UnlockLevel handles level unlock via coins
func (h *GameHandler) UnlockLevel(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.UnlockLevelRequest

	if !h.bindJSON(c, &req) {
		return
	}

	// Get level requirements
	var levelThreshold int64
	err := h.db.QueryRow(
		"SELECT coin_threshold FROM levels WHERE level_number = $1",
		req.LevelNumber,
	).Scan(&levelThreshold)

	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "level not found"})
		return
	}

	// Get current coins
	var currentCoins int64
	err = h.db.QueryRow(
		"SELECT coins FROM game_state WHERE user_id = $1",
		userID,
	).Scan(&currentCoins)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get game state"})
		return
	}

	if currentCoins < levelThreshold {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "not enough coins to unlock this level"})
		return
	}

	// Unlock level
	_, err = h.db.Exec(
		"INSERT INTO user_levels (user_id, level_number, unlocked, unlocked_at) VALUES ($1, $2, true, CURRENT_TIMESTAMP) ON CONFLICT (user_id, level_number) DO UPDATE SET unlocked = true, unlocked_at = CURRENT_TIMESTAMP",
		userID, req.LevelNumber,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to unlock level"})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{Success: true, Message: "Level unlocked!"})
}

// UnlockLevelPayment handles level unlock via payment
func (h *GameHandler) UnlockLevelPayment(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.UnlockLevelPaymentRequest

	if !h.bindJSON(c, &req) {
		return
	}

	// Record payment
	_, err := h.db.Exec(
		"INSERT INTO payment_records (user_id, xsolla_payment_id, level_number, amount_cents, status) VALUES ($1, $2, $3, $4, 'completed')",
		userID, req.XsollaPaymentID, req.LevelNumber, req.AmountCents,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to record payment"})
		return
	}

	// Unlock level
	_, err = h.db.Exec(
		"INSERT INTO user_levels (user_id, level_number, unlocked, unlocked_at) VALUES ($1, $2, true, CURRENT_TIMESTAMP) ON CONFLICT (user_id, level_number) DO UPDATE SET unlocked = true, unlocked_at = CURRENT_TIMESTAMP",
		userID, req.LevelNumber,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to unlock level"})
		return
	}

	// Add coins equal to payment amount (convert cents to coins)
	coinsToAdd := int64(req.AmountCents)
	var newCoins int64
	err = h.db.QueryRow(
		"UPDATE game_state SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING coins",
		coinsToAdd, userID,
	).Scan(&newCoins)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to add coins"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Level unlocked via payment!",
		"coins":   newCoins,
	})
}

// UpdateCoins handles passive income updates
func (h *GameHandler) UpdateCoins(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.UpdateCoinsRequest

	if !h.bindJSON(c, &req) {
		return
	}

	// Get current CPS
	var cps float64
	err := h.db.QueryRow(
		"SELECT coins_per_second FROM game_state WHERE user_id = $1",
		userID,
	).Scan(&cps)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get game state"})
		return
	}

	coinsGained := int64(cps * float64(req.SecondsPassed))

	var coins int64
	err = h.db.QueryRow(
		"UPDATE game_state SET coins = coins + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING coins",
		coinsGained, userID,
	).Scan(&coins)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to update coins"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"coins": coins})
}

// SaveGame handles game save
func (h *GameHandler) SaveGame(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.SaveGameRequest

	if !h.bindJSON(c, &req) {
		return
	}

	_, err := h.db.Exec(
		"UPDATE game_state SET coins = $1, coins_per_second = $2, level = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4",
		req.Coins, req.CoinsPerSecond, req.CurrentLevel, userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to save game"})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
}
