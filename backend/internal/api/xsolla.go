package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"clicker-game/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type XsollaHandler struct {
	db     *sql.DB
	client *XsollaAPIClient
}

func NewXsollaHandler(db *sql.DB) *XsollaHandler {
	return &XsollaHandler{
		db:     db,
		client: NewXsollaAPIClient(),
	}
}

// GetLoginURL returns a prebuilt OAuth login URL for the frontend.
func (h *XsollaHandler) GetLoginURL(c *gin.Context) {
	state, err := generateOAuthState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create oauth state"})
		return
	}

	loginURL, err := buildXsollaLoginURL(state)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":   loginURL,
		"state": state,
	})
}

// HandleOAuthCallback exchanges auth code, fetches Xsolla user and returns app JWT.
func (h *XsollaHandler) HandleOAuthCallback(c *gin.Context) {
	var req models.XsollaOAuthCallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	tokenResp, err := h.client.ExchangeCodeForToken(req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "failed to exchange auth code"})
		return
	}

	userInfo, err := h.client.GetUserInfo(tokenResp.AccessToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "failed to get xsolla user info"})
		return
	}

	user, err := h.findOrCreateUser(userInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to sync user"})
		return
	}

	jwtToken, err := generateJWT(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: jwtToken,
		User: &models.User{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
		},
	})
}

// CreateToken creates a payment token for Xsolla via real API
func (h *XsollaHandler) CreateToken(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.XsollaTokenRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	// Validate level number
	price, exists := models.LevelPricesMap[req.LevelNumber]
	if !exists {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid level"})
		return
	}

	// Get user email and xsolla_id from database
	var email string
	var xsollaID sql.NullString
	err := h.db.QueryRow("SELECT email, xsolla_id FROM users WHERE id = $1", userID).Scan(&email, &xsollaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to get user info"})
		return
	}

	// Use Xsolla UUID as the user ID in the token — required for Pay Station to
	// recognise the user. Fall back to the internal DB id only if no Xsolla ID
	// is stored (e.g. classic-login accounts).
	xsollaUserID := strconv.Itoa(userID)
	if xsollaID.Valid && xsollaID.String != "" {
		xsollaUserID = xsollaID.String
	}

	// Create payment token via Xsolla API
	token, err := h.client.CreatePaymentToken(xsollaUserID, email, req.LevelNumber, price)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create payment token: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.XsollaTokenResponse{
		Token:   token,
		Sandbox: h.client.sandboxMode,
	})
}

// HandlePaymentWebhook processes payment webhook from Xsolla
func (h *XsollaHandler) HandlePaymentWebhook(c *gin.Context) {
	var webhook models.XsollaPaymentWebhook

	if err := c.ShouldBindJSON(&webhook); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	// Verify signature
	if !h.client.VerifyWebhookSignature(webhook.UserID, webhook.PaymentID, webhook.Signature) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{Error: "invalid signature"})
		return
	}

	// Only process completed payments
	if webhook.Status != "completed" {
		c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
		return
	}

	userID, _ := strconv.Atoi(webhook.UserID)

	_, err := h.db.Exec(
		"INSERT INTO payment_records (user_id, xsolla_payment_id, amount_cents, status) VALUES ($1, $2, $3, $4)",
		userID, webhook.PaymentID, int(webhook.Amount*100), "completed",
	)
	if err != nil {
		// Log error but return success to Xsolla
		c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{Success: true})
}

func buildXsollaLoginURL(state string) (string, error) {
	clientID := os.Getenv("XSOLLA_CLIENT_ID")
	loginProjectID := os.Getenv("XSOLLA_LOGIN_PROJECT_ID")
	redirectURI := os.Getenv("XSOLLA_REDIRECT_URI")
	locale := os.Getenv("XSOLLA_LOGIN_LOCALE")
	if locale == "" {
		locale = "en"
	}

	if clientID == "" || loginProjectID == "" || redirectURI == "" {
		return "", fmt.Errorf("missing xsolla oauth configuration")
	}

	values := url.Values{}
	values.Set("projectId", loginProjectID)
	values.Set("locale", locale)
	values.Set("response_type", "code")
	values.Set("client_id", clientID)
	values.Set("redirect_uri", redirectURI)
	values.Set("state", state)
	values.Set("scope", "offline")

	return "https://login-widget.xsolla.com/latest/?" + values.Encode(), nil
}

func generateOAuthState() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func generateJWT(userID int, username string) (string, error) {
	token := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, token).SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func (h *XsollaHandler) findOrCreateUser(xsollaUser *models.XsollaUserResponse) (*models.User, error) {
	email := strings.TrimSpace(xsollaUser.Email)
	if email == "" {
		email = fmt.Sprintf("xsolla_%s@xsolla.local", xsollaUser.ID)
	}
	xsollaUUID := strings.TrimSpace(xsollaUser.ID)

	user := &models.User{}

	// Try to find by xsolla_id first (most reliable), then fall back to email
	err := h.db.QueryRow(
		"SELECT id, username, email, COALESCE(xsolla_id, ''), created_at, updated_at FROM users WHERE xsolla_id = $1",
		xsollaUUID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.XsollaID, &user.CreatedAt, &user.UpdatedAt)

	if err == nil {
		// Ensure email stays in sync in case user changed it in Xsolla
		_, _ = h.db.Exec("UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", email, user.ID)
		return user, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	// Not found by xsolla_id — try email (handles accounts created before this column existed)
	err = h.db.QueryRow(
		"SELECT id, username, email, COALESCE(xsolla_id, ''), created_at, updated_at FROM users WHERE email = $1",
		email,
	).Scan(&user.ID, &user.Username, &user.Email, &user.XsollaID, &user.CreatedAt, &user.UpdatedAt)

	if err == nil {
		// Backfill xsolla_id on existing account
		_, _ = h.db.Exec("UPDATE users SET xsolla_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", xsollaUUID, user.ID)
		user.XsollaID = xsollaUUID
		return user, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	// Brand-new user — create them
	baseUsername := strings.TrimSpace(xsollaUser.Username)
	if baseUsername == "" {
		baseUsername = strings.TrimSpace(xsollaUser.Login)
	}
	if baseUsername == "" {
		baseUsername = "xsolla_player"
	}

	username, err := h.makeUniqueUsername(baseUsername)
	if err != nil {
		return nil, err
	}

	randomPassword := fmt.Sprintf("xsolla_%s_%d", xsollaUUID, time.Now().UnixNano())
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	err = h.db.QueryRow(
		"INSERT INTO users (username, email, password_hash, xsolla_id) VALUES ($1, $2, $3, $4) RETURNING id, username, email, COALESCE(xsolla_id, ''), created_at, updated_at",
		username, email, string(hashedPassword), xsollaUUID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.XsollaID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if err := h.initializeUserProgress(user.ID); err != nil {
		return nil, err
	}

	return user, nil
}

func (h *XsollaHandler) makeUniqueUsername(base string) (string, error) {
	clean := strings.ToLower(strings.TrimSpace(base))
	clean = strings.ReplaceAll(clean, " ", "_")
	if clean == "" {
		clean = "xsolla_player"
	}

	candidate := clean
	for i := 1; i <= 100; i++ {
		var exists bool
		err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)", candidate).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s_%d", clean, i+1)
	}

	return "", fmt.Errorf("failed to generate unique username")
}

func (h *XsollaHandler) initializeUserProgress(userID int) error {
	if _, err := h.db.Exec("INSERT INTO game_state (user_id, coins) VALUES ($1, $2)", userID, 0); err != nil {
		return err
	}

	for level := 1; level <= 20; level++ {
		unlocked := level == 1
		if _, err := h.db.Exec(
			"INSERT INTO user_levels (user_id, level_number, unlocked) VALUES ($1, $2, $3)",
			userID, level, unlocked,
		); err != nil {
			return err
		}
	}

	rows, err := h.db.Query("SELECT id FROM upgrades")
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var upgradeID int
		if err := rows.Scan(&upgradeID); err != nil {
			return err
		}
		if _, err := h.db.Exec(
			"INSERT INTO user_upgrades (user_id, upgrade_id, owned_count) VALUES ($1, $2, $3)",
			userID, upgradeID, 0,
		); err != nil {
			return err
		}
	}

	return rows.Err()
}
