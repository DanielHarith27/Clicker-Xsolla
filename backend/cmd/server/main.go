package main

import (
	"clicker-game/backend/internal/api"
	"clicker-game/backend/internal/db"
	"clicker-game/backend/internal/middleware"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables - try multiple possible .env locations
	if err := godotenv.Load("../../.env"); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			godotenv.Load(".env")
		}
	}

	// Initialize database
	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Initialize Gin router
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORSMiddleware())

	// Initialize handlers
	authHandler := api.NewAuthHandler(database)
	gameHandler := api.NewGameHandler(database)
	xsollaHandler := api.NewXsollaHandler(database)

	// Auth routes
	router.POST("/api/auth/register", authHandler.Register)
	router.POST("/api/auth/login", authHandler.Login)

	// Game routes (protected)
	router.GET("/api/game/state", middleware.AuthMiddleware(), gameHandler.GetState)
	router.POST("/api/game/click", middleware.AuthMiddleware(), gameHandler.Click)
	router.POST("/api/game/buy-upgrade", middleware.AuthMiddleware(), gameHandler.BuyUpgrade)
	router.POST("/api/game/unlock-level", middleware.AuthMiddleware(), gameHandler.UnlockLevel)
	router.POST("/api/game/unlock-level-payment", middleware.AuthMiddleware(), gameHandler.UnlockLevelPayment)
	router.POST("/api/game/update-coins", middleware.AuthMiddleware(), gameHandler.UpdateCoins)
	router.POST("/api/game/save", middleware.AuthMiddleware(), gameHandler.SaveGame)

	// Xsolla routes
	router.GET("/api/xsolla/login-url", xsollaHandler.GetLoginURL)
	router.POST("/api/xsolla/oauth-callback", xsollaHandler.HandleOAuthCallback)
	router.POST("/api/xsolla/token", middleware.AuthMiddleware(), xsollaHandler.CreateToken)
	router.POST("/api/xsolla/webhook/payment", xsollaHandler.HandlePaymentWebhook)

	// Serve frontend
	router.StaticFile("/", "../frontend/public/index.html")
	router.StaticFile("/auth/callback", "../frontend/public/index.html")
	router.StaticFile("/favicon.ico", "../frontend/public/favicon.ico")
	router.Static("/src", "../frontend/src")

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s", port)
	router.Run(":" + port)
}
