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
	11: LevelPrice,
	12: LevelPrice,
	13: LevelPrice,
	14: LevelPrice,
	15: LevelPrice,
	16: LevelPrice,
	17: LevelPrice,
	18: LevelPrice,
	19: LevelPrice,
	20: LevelPrice,
}

// User represents a game user
type User struct {
	ID        int       `json:"id"`
	XsollaID  string    `json:"xsolla_id,omitempty"`
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
	MaxOwnedCount      int     `json:"max_owned_count"`
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

// XsollaOAuthCallbackRequest represents Xsolla OAuth callback
type XsollaOAuthCallbackRequest struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state"`
}

// XsollaUserInfo represents user info from Xsolla
type XsollaUserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Login string `json:"login"`
}

// XsollaTokenRequest represents a request for Xsolla payment token
type XsollaTokenRequest struct {
	LevelNumber int `json:"level_number" binding:"required"`
}

// XsollaTokenResponse represents Xsolla payment token response
type XsollaTokenResponse struct {
	Token   string `json:"token" binding:"required"`
	Sandbox bool   `json:"sandbox"`
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

// --- XSOLLA API STRUCTURES ---

// XsollaConfig holds Xsolla API credentials
type XsollaConfig struct {
	MerchantID     int    // From Publisher Account
	APIKey         string // API Key from Publisher Account
	ProjectID      int    // Project ID
	LoginProjectID int    // Login project ID
	ClientID       string // OAuth 2.0 Client ID
	ClientSecret   string // OAuth 2.0 Client Secret
	RedirectURI    string // OAuth redirect URI
	SandboxMode    bool   // Use sandbox environment
}

// XsollaPaymentTokenRequest is for server-side token generation
type XsollaPaymentTokenRequest struct {
	User struct {
		ID struct {
			Value string `json:"value"`
		} `json:"id"`
		Email struct {
			Value string `json:"value"`
		} `json:"email"`
	} `json:"user"`
	Purchase struct {
		Checkout struct {
			Currency string  `json:"currency"`
			Amount   float64 `json:"amount"`
		} `json:"checkout"`
	} `json:"purchase"`
	Settings struct {
		ProjectID int    `json:"project_id"`
		Mode      string `json:"mode,omitempty"`
	} `json:"settings"`
}

// XsollaPaymentTokenAPIResponse is response from Xsolla payment token API
type XsollaPaymentTokenAPIResponse struct {
	Token string `json:"token"`
}

// XsollaOAuthTokenRequest is for exchanging auth code for token
type XsollaOAuthTokenRequest struct {
	GrantType    string `json:"grant_type"` // "authorization_code"
	Code         string `json:"code"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURI  string `json:"redirect_uri"`
}

// XsollaOAuthTokenResponse is response from OAuth token endpoint
type XsollaOAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// XsollaUserResponse is response from user info endpoint
type XsollaUserResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Login    string `json:"login"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
}

// XsollaPaymentWebhook represents webhook from Xsolla
type XsollaPaymentWebhook struct {
	UserID    string  `json:"user_id"`
	PaymentID int     `json:"payment_id"`
	Status    string  `json:"status"`
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
	OrderID   string  `json:"order_id"`
	Timestamp int64   `json:"timestamp"`
	Signature string  `json:"signature"`
}
