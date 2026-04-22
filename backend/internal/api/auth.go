package api

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"clicker-game/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

// generateJWT creates a JWT token for the given user
func (h *AuthHandler) generateJWT(userID int, username string) (string, error) {
	token := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, token).SignedString([]byte(os.Getenv("JWT_SECRET")))
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to hash password"})
		return
	}

	// Insert user
	user := models.User{
		Username: req.Username,
		Email:    req.Email,
	}

	err = h.db.QueryRow(
		"INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at, updated_at",
		user.Username, user.Email, hashedPassword,
	).Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{Error: "username or email already exists"})
		return
	}

	// Initialize game state
	_, err = h.db.Exec(
		"INSERT INTO game_state (user_id, coins) VALUES ($1, $2)",
		user.ID, 0,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to initialize game state"})
		return
	}

	// Initialize levels
	for i := 1; i <= 10; i++ {
		unlocked := i == 1
		_, err = h.db.Exec(
			"INSERT INTO user_levels (user_id, level_number, unlocked) VALUES ($1, $2, $3)",
			user.ID, i, unlocked,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to initialize levels"})
			return
		}
	}

	// Initialize upgrades
	var upgradeIDs []int
	rows, err := h.db.Query("SELECT id FROM upgrades")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to fetch upgrades"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		rows.Scan(&id)
		upgradeIDs = append(upgradeIDs, id)
	}

	for _, upgradeID := range upgradeIDs {
		_, err = h.db.Exec(
			"INSERT INTO user_upgrades (user_id, upgrade_id, owned_count) VALUES ($1, $2, $3)",
			user.ID, upgradeID, 0,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to initialize upgrades"})
			return
		}
	}

	// Generate JWT token
	tokenString, err := h.generateJWT(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		Token: tokenString,
		User: &models.User{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
		},
	})
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	user := models.User{}
	var hashedPassword string

	err := h.db.QueryRow(
		"SELECT id, username, email, password_hash FROM users WHERE username = $1",
		req.Username,
	).Scan(&user.ID, &user.Username, &user.Email, &hashedPassword)

	if err != nil || err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid credentials"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid credentials"})
		return
	}

	// Generate JWT token
	tokenString, err := h.generateJWT(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: tokenString,
		User: &models.User{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
		},
	})
}
