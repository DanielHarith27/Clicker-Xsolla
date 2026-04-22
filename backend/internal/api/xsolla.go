package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"

	"clicker-game/backend/internal/models"

	"github.com/gin-gonic/gin"
)

type XsollaHandler struct {
	db *sql.DB
}

func NewXsollaHandler(db *sql.DB) *XsollaHandler {
	return &XsollaHandler{db: db}
}

// CreateToken creates a payment token for Xsolla
func (h *XsollaHandler) CreateToken(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.XsollaTokenRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "invalid request"})
		return
	}

	price, exists := models.LevelPricesMap[req.LevelNumber]
	if !exists {
		price = models.LevelPrice
	}

	// Create mock token (in production, call Xsolla API)
	tokenData := map[string]interface{}{
		"user_id":      userID,
		"level":        req.LevelNumber,
		"amount_cents": price,
		"timestamp":    int64(0), // Would be time.Now().Unix()
	}

	tokenJSON, err := json.Marshal(tokenData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "failed to create token"})
		return
	}

	// Encode as base64 for demo purposes
	mockToken := base64.StdEncoding.EncodeToString(tokenJSON)

	c.JSON(http.StatusOK, models.XsollaTokenResponse{
		Token: mockToken,
	})
}
