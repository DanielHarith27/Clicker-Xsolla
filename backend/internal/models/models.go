package models

import "time"

// Constants for game configuration
const (
	LevelPrice = 299 // Price in cents ($2.99)
)

// LevelPricesMap defines the price for each level
var LevelPricesMap = map[int]int{
	2:  LevelPrice,
	3:  LevelPrice,
	4:  LevelPrice,
	5:  LevelPrice,
	6:  LevelPrice,
	7:  LevelPrice,
	8:  LevelPrice,
	9:  LevelPrice,
	10: LevelPrice,
}

// User represents a game user
type User struct {
	ID        int       `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GameState represents the player's game state
type GameState struct {
	ID             int       `json:"id"`
	UserID         int       `json:"user_id"`
	Coins          int64     `json:"coins"`
	CoinsPerSecond float64   `json:"coins_per_second"`
	CurrentLevel   int       `json:"current_level"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Upgrade represents an available upgrade
type Upgrade struct {
	ID                 int     `json:"id"`
	Name               string  `json:"name"`
	Description        string  `json:"description"`
	BaseCost           int64   `json:"base_cost"`
	CoinsPerSecondGain float64 `json:"coins_per_second_gain"`
	Icon               string  `json:"icon"`
	OwnedCount         int     `json:"owned_count"`
}

// Level represents a game level
type Level struct {
	ID            int   `json:"id"`
	LevelNumber   int   `json:"level_number"`
	CoinThreshold int64 `json:"coin_threshold"`
	UnlockCost    *int  `json:"unlock_cost"`
	Unlocked      bool  `json:"unlocked"`
}

// PaymentRecord represents a payment transaction
type PaymentRecord struct {
	ID              int       `json:"id"`
	UserID          int       `json:"user_id"`
	XsollaPaymentID string    `json:"xsolla_payment_id"`
	LevelNumber     int       `json:"level_number"`
	AmountCents     int       `json:"amount_cents"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents an authentication response
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

// GameStateResponse represents the full game state response
type GameStateResponse struct {
	Coins          int64     `json:"coins"`
	CoinsPerSecond float64   `json:"coins_per_second"`
	CurrentLevel   int       `json:"current_level"`
	Upgrades       []Upgrade `json:"upgrades"`
	Levels         []Level   `json:"levels"`
}

// ClickRequest represents a click action
type ClickRequest struct {
	CoinsPerClick int64 `json:"coins_per_click"`
}

// BuyUpgradeRequest represents an upgrade purchase
type BuyUpgradeRequest struct {
	UpgradeID int `json:"upgrade_id" binding:"required"`
}

// UnlockLevelRequest represents a level unlock request
type UnlockLevelRequest struct {
	LevelNumber int `json:"level_number" binding:"required"`
}

// UnlockLevelPaymentRequest represents a payment-based level unlock
type UnlockLevelPaymentRequest struct {
	LevelNumber     int    `json:"level_number" binding:"required"`
	XsollaPaymentID string `json:"xsolla_payment_id" binding:"required"`
	AmountCents     int    `json:"amount_cents" binding:"required"`
}

// UpdateCoinsRequest represents a passive income update
type UpdateCoinsRequest struct {
	SecondsPassed int `json:"seconds_passed" binding:"required"`
}

// SaveGameRequest represents a game save request
type SaveGameRequest struct {
	Coins          int64   `json:"coins"`
	CoinsPerSecond float64 `json:"coins_per_second"`
	CurrentLevel   int     `json:"current_level"`
}

// XsollaTokenRequest represents a Xsolla token request
type XsollaTokenRequest struct {
	LevelNumber int `json:"level_number" binding:"required"`
}

// XsollaTokenResponse represents a Xsolla token response
type XsollaTokenResponse struct {
	Token string `json:"token"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}
