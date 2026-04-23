package api

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"clicker-game/backend/internal/models"
)

// XsollaAPIClient handles communication with Xsolla API
type XsollaAPIClient struct {
	merchantID   int
	apiKey       string
	projectID    int
	clientID     string
	clientSecret string
	redirectURI  string
	sandboxMode  bool
	httpClient   *http.Client
}

// NewXsollaAPIClient creates a new Xsolla API client
func NewXsollaAPIClient() *XsollaAPIClient {
	return &XsollaAPIClient{
		merchantID:   getEnvInt("XSOLLA_MERCHANT_ID"),
		apiKey:       os.Getenv("XSOLLA_API_KEY"),
		projectID:    getEnvInt("XSOLLA_PROJECT_ID"),
		clientID:     os.Getenv("XSOLLA_CLIENT_ID"),
		clientSecret: os.Getenv("XSOLLA_CLIENT_SECRET"),
		redirectURI:  os.Getenv("XSOLLA_REDIRECT_URI"),
		sandboxMode:  os.Getenv("XSOLLA_SANDBOX") == "true",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// CreatePaymentToken generates a payment token via Xsolla API
func (c *XsollaAPIClient) CreatePaymentToken(userID string, email string, levelNumber int, priceInCents int) (string, error) {
	// Amount in dollars
	amount := float64(priceInCents) / 100.0

	tokenReq := models.XsollaPaymentTokenRequest{}
	tokenReq.User.ID.Value = userID
	tokenReq.User.Email.Value = email
	tokenReq.Purchase.Checkout.Currency = "USD"
	tokenReq.Purchase.Checkout.Amount = amount
	tokenReq.Settings.ProjectID = c.projectID
	if c.sandboxMode {
		tokenReq.Settings.Mode = "sandbox"
	}

	// Set order ID with level number for tracking
	orderID := fmt.Sprintf("level_%d_user_%s_%d", levelNumber, userID, time.Now().Unix())

	payload, err := json.Marshal(tokenReq)
	if err != nil {
		return "", err
	}

	url := "https://api.xsolla.com/merchant/v2/merchants/" + strconv.Itoa(c.merchantID) + "/token"

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}

	// Add basic auth
	req.SetBasicAuth(strconv.Itoa(c.merchantID), c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Order-Id", orderID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("xsolla api error: %d - %s", resp.StatusCode, string(body))
	}

	var tokenResp models.XsollaPaymentTokenAPIResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	return tokenResp.Token, nil
}

// GetUserInfo retrieves user info from Xsolla using OAuth token
func (c *XsollaAPIClient) GetUserInfo(accessToken string) (*models.XsollaUserResponse, error) {
	url := "https://login.xsolla.com/api/users/me"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info: %d", resp.StatusCode)
	}

	var userResp models.XsollaUserResponse
	if err := json.Unmarshal(body, &userResp); err != nil {
		return nil, err
	}

	return &userResp, nil
}

// ExchangeCodeForToken exchanges OAuth code for access token
func (c *XsollaAPIClient) ExchangeCodeForToken(code string) (*models.XsollaOAuthTokenResponse, error) {
	endpoint := "https://login.xsolla.com/api/oauth2/token"

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("client_id", c.clientID)
	form.Set("redirect_uri", c.redirectURI)
	if c.clientSecret != "" {
		form.Set("client_secret", c.clientSecret)
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBufferString(form.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to exchange code: %d - %s", resp.StatusCode, string(body))
	}

	var tokenResp models.XsollaOAuthTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// VerifyWebhookSignature verifies Xsolla webhook signature
// Format: MD5(user_id + payment_id + api_key)
func (c *XsollaAPIClient) VerifyWebhookSignature(userID string, paymentID int, signature string) bool {
	data := userID + strconv.Itoa(paymentID) + c.apiKey
	hash := fmt.Sprintf("%x", md5.Sum([]byte(data)))
	return hash == signature
}

// Helper function to get int from environment variable
func getEnvInt(key string) int {
	val := os.Getenv(key)
	if val == "" {
		return 0
	}
	intVal, _ := strconv.Atoi(val)
	return intVal
}
