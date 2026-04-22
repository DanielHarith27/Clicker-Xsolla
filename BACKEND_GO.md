# Go Backend Architecture

Complete overview of the Clicker Game Go backend implementation using Gin framework and PostgreSQL.

## Overview

The backend is built with Go 1.21+ and implements a RESTful API using the Gin web framework. It handles:
- User authentication and JWT token management
- Game state persistence and operations
- Upgrade purchasing with exponential cost scaling
- Level unlocking via coins or payments
- Xsolla payment integration
- Passive income calculations

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point, router setup
├── internal/
│   ├── api/
│   │   ├── auth.go              # Register, Login endpoints
│   │   ├── game.go              # Game operation handlers (7 endpoints)
│   │   └── xsolla.go            # Payment token generation
│   ├── db/
│   │   └── db.go                # Database connection, schema creation
│   ├── middleware/
│   │   └── middleware.go        # Auth validation, CORS handling
│   ├── models/
│   │   └── models.go            # Type definitions for all DTOs
│   └── handlers/                # Reserved for future use
├── config/                      # Reserved for configuration files
├── pkg/                         # Reserved for shared packages
├── go.mod                       # Module dependencies
└── Makefile                     # Build and run commands
```

## Entry Point (main.go)

**Purpose**: Initialize the application, setup database, configure router

**Key Responsibilities**:
1. Load environment variables from .env
2. Initialize database connection
3. Create handler instances
4. Setup Gin router with all routes
5. Configure middleware (CORS, Auth)
6. Start HTTP server

**Route Groups**:
- `/api/auth/*` - Authentication endpoints
- `/api/game/*` - Game operation endpoints
- `/api/xsolla/*` - Payment endpoints
- Static file serving for frontend

**Example**:
```go
func init() {
    // Load .env
    godotenv.Load()
    
    // Initialize database
    db := db.InitDB()
    
    // Create handlers
    authHandler := api.NewAuthHandler(db)
    gameHandler := api.NewGameHandler(db)
    
    // Setup router
    r.POST("/api/auth/register", authHandler.Register)
    r.POST("/api/auth/login", authHandler.Login)
}
```

## Database Layer (internal/db/db.go)

**Purpose**: Handle database initialization, schema creation, and all SQL operations

**Key Functions**:

### InitDB()
- Creates PostgreSQL connection from environment variables
- Automatically creates tables if they don't exist
- Seeds 15 upgrades and 10 levels
- Creates indexes for performance

### createTables()
Runs SQL schema with 7 tables:
1. **users** - User accounts (id, username, email, password_hash, created_at)
2. **game_state** - Per-user game progress (user_id, coins, cps, current_level)
3. **upgrades** - Master upgrade list (id, name, description, icon, base_cost, cps_gain)
4. **user_upgrades** - Ownership tracking (user_id, upgrade_id, owned_count)
5. **levels** - Master level list (level_number, coin_threshold, description)
6. **user_levels** - Unlock status (user_id, level_number, unlocked, unlocked_at)
7. **payment_records** - Transaction history (user_id, level_number, amount, xsolla_id, timestamp)

**Indexes**:
- user_id indexes on all user-specific tables for fast queries
- Unique constraints on user_upgrades and user_levels

**Example**:
```go
func InitDB() *sql.DB {
    connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_HOST"),
        os.Getenv("DB_PORT"),
        os.Getenv("DB_NAME"),
    )
    db, err := sql.Open("postgres", connStr)
    // ... error handling ...
    createTables(db)
    return db
}
```

## Models (internal/models/models.go)

Type definitions for all API requests and responses, organized by category:

### Core Models
- **User**: id, username, email, created_at (from JWT extraction)
- **GameState**: coins, coinsPerSecond, currentLevel
- **Upgrade**: id, name, description, icon, base_cost, coins_per_second_gain, owned_count
- **Level**: level_number, coin_threshold, description, unlocked
- **PaymentRecord**: id, user_id, level_number, amount_cents, xsolla_payment_id, timestamp

### Request Models
- **RegisterRequest**: username, email, password
- **LoginRequest**: username, password
- **ClickRequest**: coinsPerClick (default 1)
- **BuyUpgradeRequest**: upgradeId
- **UnlockLevelRequest**: levelNumber
- **UnlockLevelPaymentRequest**: levelNumber, xsollaPaymentId, amountCents
- **UpdateCoinsRequest**: secondsPassed
- **SaveGameRequest**: coins, coinsPerSecond, currentLevel
- **XsollaTokenRequest**: levelNumber

### Response Models
- **AuthResponse**: token, user (User object)
- **GameStateResponse**: coins, coinsPerSecond, currentLevel, upgrades, levels
- **SuccessResponse**: message, data
- **ErrorResponse**: error
- **XsollaTokenResponse**: token

**JSON Marshaling Example**:
```go
type User struct {
    ID        int       `json:"id"`
    Username  string    `json:"username"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

type AuthResponse struct {
    Token string `json:"token"`
    User  User   `json:"user"`
}
```

## Middleware (internal/middleware/middleware.go)

### AuthMiddleware
- Extracts Bearer token from Authorization header
- Validates JWT token using golang-jwt/jwt
- Extracts user_id from token claims
- Stores user_id in Gin context for handlers
- Returns 401 Unauthorized if token invalid/missing

**Usage**:
```go
protected := r.Group("/api/game").Use(middleware.AuthMiddleware())
protected.GET("/state", gameHandler.GetState)
protected.POST("/click", gameHandler.Click)
```

### CORSMiddleware
- Allows requests from any origin (configurable)
- Handles preflight OPTIONS requests
- Sets appropriate CORS headers
- Allows common HTTP methods (GET, POST, PUT, DELETE)

## API Handlers

### Authentication (internal/api/auth.go)

**Register Handler**
- Creates new user with username, email, password
- Hashes password using bcrypt
- Creates initial game_state record (0 coins, 0 CPS, level 1)
- Initializes user_upgrades (all owned_count = 0)
- Initializes user_levels (all unlocked = false)
- Generates JWT token
- Returns AuthResponse

**Login Handler**
- Looks up user by username
- Verifies password using bcrypt
- Generates JWT token
- Returns AuthResponse

**JWT Generation**
- Claims: user_id, iat (issued at), exp (expires in 7 days)
- Signed with RS256 algorithm
- Secret from environment variable

### Game Operations (internal/api/game.go)

**GetState Handler**
- Retrieves user's game_state
- Fetches all upgrades with owned_count
- Fetches all levels with unlock status
- Returns GameStateResponse

**Click Handler**
- Increments coins by coinsPerClick value
- Updates game_state
- Returns updated coins

**BuyUpgrade Handler**
- Validates user has enough coins
- Calculates cost: baseCost * 1.15^owned
- Deducts coins, increments owned_count
- Adds coins_per_second_gain to CPS
- Returns updated coins and CPS

**UnlockLevel Handler**
- Validates coins >= threshold
- Deducts coins if threshold > 0
- Marks level as unlocked
- Returns success message

**UnlockLevelPayment Handler**
- Records payment transaction
- Marks level as unlocked
- Returns success message

**UpdateCoins Handler**
- Calculates passive income: CPS * secondsPassed
- Adds to coins
- Returns updated coins

**SaveGame Handler**
- Updates game_state in database
- Persists coins, CPS, current level
- Returns success message

### Payment (internal/api/xsolla.go)

**CreateToken Handler**
- Takes levelNumber from request
- Looks up level price (hardcoded for now)
- Creates token with user_id, level, amount, timestamp
- Encodes as base64
- Returns token for Xsolla widget

Mock implementation ready for real Xsolla API integration.

## Database Queries Pattern

All queries follow this pattern:

```go
// Single row query
row := h.db.QueryRow("SELECT col1, col2 FROM table WHERE id = $1", userID)
err := row.Scan(&col1, &col2)

// Multiple row query
rows, err := h.db.Query("SELECT col1, col2 FROM table WHERE user_id = $1", userID)
defer rows.Close()
for rows.Next() {
    err := rows.Scan(&col1, &col2)
}

// Insert/Update/Delete
result, err := h.db.Exec("UPDATE table SET col1 = $1 WHERE user_id = $2", value, userID)
```

## Error Handling

All handlers use consistent error handling:

```go
if err != nil {
    c.JSON(http.StatusInternalServerError, models.ErrorResponse{
        Error: "descriptive error message",
    })
    return
}
```

Common HTTP Status Codes:
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing/invalid token
- 404 Not Found - Resource not found
- 500 Internal Server Error - Database/server error

## Environment Variables

Required in .env:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=clickergame

# JWT
JWT_SECRET=your-secret-key

# Server
SERVER_PORT=8080
```

## Build & Run

### Development
```bash
cd backend
make dev
# or
go run ./cmd/server/main.go
```

### Production
```bash
cd backend
make build
./bin/server
```

### Testing
```bash
make test
```

## Performance Considerations

1. **Database Indexes**: Indexed on user_id for fast lookups
2. **Passive Income**: Calculated client-side, synced periodically
3. **Auto-save**: Every 30 seconds to reduce load
4. **Query Efficiency**: Fetches all data at once rather than multiple queries
5. **Cost Calculation**: Done in handler memory, not database

## Security

1. **Password Hashing**: bcrypt with salt
2. **JWT Validation**: Checked on every protected endpoint
3. **Input Validation**: Type-safe models with JSON unmarshaling
4. **SQL Injection**: Prevented using parameterized queries ($1, $2, etc.)
5. **CORS**: Configured to allow cross-origin requests

## Future Enhancements

1. Real Xsolla API integration
2. Rate limiting on API endpoints
3. Caching layer (Redis)
4. Logging and monitoring
5. Unit and integration tests
6. API documentation (Swagger/OpenAPI)
7. Database connection pooling optimization
8. Metrics collection (Prometheus)
