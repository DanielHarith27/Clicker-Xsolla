# Clicker Game - Idle Game with Xsolla Payments

A complete idle clicker game built with **Go backend** (Gin framework) and HTML5/CSS3/JavaScript frontend. Features 15 upgrades, 10 levels, user authentication, and Xsolla payment integration.

## Features

✅ **Core Gameplay**
- Click a large coin button to earn coins
- Passive income system from upgrades (idle mechanic)
- 15 progressively scaled upgrades
- 10 levels with coin thresholds

✅ **Level System**
- Levels are locked by default
- Unlock via coin threshold OR payment
- Level thresholds: 100, 500, 2.5K, 10K, 50K, 250K, 1M, 5M, 25M coins

✅ **Xsolla Payment Integration**
- PayStation widget for level unlocks
- Payment verification and recording
- Transaction history tracking

✅ **Authentication**
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt

✅ **Data Persistence**
- PostgreSQL database
- Save/load game state
- Upgrade ownership tracking
- Level unlock history

✅ **UI/UX**
- Dark theme with gradient accents
- Smooth animations and floating numbers
- Fully responsive design (desktop, tablet, mobile)
- Real-time coin counter and CPS display

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Go 1.21, Gin Web Framework
- **Database**: PostgreSQL
- **Authentication**: JWT (golang-jwt/jwt v5.0.0), bcrypt
- **Payment**: Xsolla PayStation
- **Key Dependencies**:
  - gin-gonic/gin
  - lib/pq (PostgreSQL driver)
  - golang-jwt/jwt
  - golang.org/x/crypto (bcrypt)
  - github.com/joho/godotenv

## Project Structure

```
XsollaGame/
├── backend/                     # Go backend
│   ├── cmd/server/
│   │   └── main.go              # Application entry point
│   ├── internal/
│   │   ├── api/
│   │   │   ├── auth.go          # Authentication handlers
│   │   │   ├── game.go          # Game operation handlers
│   │   │   └── xsolla.go        # Payment system handlers
│   │   ├── db/
│   │   │   └── db.go            # Database initialization
│   │   ├── middleware/
│   │   │   └── middleware.go    # Auth & CORS middleware
│   │   └── models/
│   │       └── models.go        # Data structures
│   ├── go.mod                   # Go module dependencies
│   └── Makefile                 # Build commands
├── frontend/                    # Frontend code
│   ├── public/
│   │   └── index.html           # Game UI
│   └── src/
│       ├── game.js              # Game logic
│       └── styles.css           # Styling
├── database.sql                 # PostgreSQL schema & seeds
├── .env                         # Configuration (create this)
└── README.md                    # This file
```

## Setup Instructions

### 1. Prerequisites

- **Go** 1.21 or higher - [Download](https://golang.org/dl/)
- **PostgreSQL** 12 or higher - [Download](https://www.postgresql.org/download/)
- A text editor or IDE (VSCode recommended)

### 2. Clone/Extract the Project

```bash
cd XsollaGame
```

### 3. Create Environment Configuration

Create a `.env` file in the project root:

```env
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=clickergame

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production

# Server Configuration
SERVER_PORT=8080
```

Replace `your_password_here` with your PostgreSQL password.

### 4. Setup PostgreSQL Database

**Create the database:**

```bash
# Using PostgreSQL CLI
createdb clickergame
```

**Import the schema:**

```bash
# Run the SQL schema file
psql clickergame < database.sql
```

This command will:
- Create all necessary tables
- Create indexes for performance
- Seed 15 upgrades and 10 levels

### 5. Download Go Dependencies

```bash
cd backend
go mod download
go mod tidy
```

### 6. Run the Backend

**Development mode (recommended for testing):**

```bash
cd backend
make dev
# or
go run ./cmd/server/main.go
```

**Production build:**

```bash
cd backend
make build
./bin/server
```

### 7. Access the Game

Open your browser and navigate to:

```
http://localhost:8080
```

## Make Commands

```bash
cd backend

make build      # Compile the backend to bin/server
make run        # Build and run the backend
make dev        # Run in development mode (auto-reload capable)
make clean      # Remove build artifacts
make test       # Run tests
make deps       # Download and tidy dependencies
make lint       # Run linter (if golangci-lint installed)
```

## API Endpoints

### Authentication (2 endpoints)

**Register**
- `POST /api/auth/register`
- Body: `{ "username": "user", "email": "user@example.com", "password": "pass" }`
- Returns: JWT token and user object

**Login**
- `POST /api/auth/login`
- Body: `{ "username": "user", "password": "pass" }`
- Returns: JWT token and user object

### Game Operations (7 endpoints)

**Get Game State**
- `GET /api/game/state`
- Headers: `Authorization: Bearer {token}`
- Returns: Current coins, CPS, level, upgrades, levels

**Click Coin**
- `POST /api/game/click`
- Body: `{ "coinsPerClick": 1 }`
- Headers: `Authorization: Bearer {token}`
- Returns: Updated coins

**Buy Upgrade**
- `POST /api/game/buy-upgrade`
- Body: `{ "upgradeId": 1 }`
- Headers: `Authorization: Bearer {token}`
- Returns: Updated coins and CPS

**Unlock Level (with coins)**
- `POST /api/game/unlock-level`
- Body: `{ "levelNumber": 2 }`
- Headers: `Authorization: Bearer {token}`
- Returns: Success message

**Unlock Level (with payment)**
- `POST /api/game/unlock-level-payment`
- Body: `{ "levelNumber": 2, "xsollaPaymentId": "txn123", "amountCents": 299 }`
- Headers: `Authorization: Bearer {token}`
- Returns: Success message

**Update Coins (passive income)**
- `POST /api/game/update-coins`
- Body: `{ "secondsPassed": 5 }`
- Headers: `Authorization: Bearer {token}`
- Returns: Updated coins

**Save Game**
- `POST /api/game/save`
- Body: `{ "coins": 1000, "coinsPerSecond": 10.5, "currentLevel": 3 }`
- Headers: `Authorization: Bearer {token}`
- Returns: Success message

### Payment System (1 endpoint)

**Generate Payment Token**
- `POST /api/xsolla/token`
- Body: `{ "levelNumber": 2 }`
- Headers: `Authorization: Bearer {token}`
- Returns: `{ "token": "base64_encoded_token" }`

## Game Mechanics

### Upgrades (15 Total)

| Upgrade | Base Cost | CPS Gain | Scaling |
|---------|-----------|----------|---------|
| Cursor | 10 | 0.1 | 1.15^n |
| Grandma | 100 | 1 | 1.15^n |
| Farm | 500 | 5 | 1.15^n |
| Factory | 2K | 20 | 1.15^n |
| Bank | 10K | 100 | 1.15^n |
| Wizard | 50K | 500 | 1.15^n |
| Robot | 250K | 2.5K | 1.15^n |
| Alien | 1M | 10K | 1.15^n |
| Wizard Tower | 5M | 50K | 1.15^n |
| Time Machine | 25M | 250K | 1.15^n |
| Spaceship | 100M | 1M | 1.15^n |
| Portal | 500M | 5M | 1.15^n |
| Infinity Engine | 2B | 20M | 1.15^n |
| Multiverse | 10B | 100M | 1.15^n |
| God Mode | 50B | 500M | 1.15^n |

### Levels (10 Total)

| Level | Coin Threshold | Payment Option |
|-------|----------------|----------------|
| 1 | 0 (Default) | N/A |
| 2 | 100 | $2.99 |
| 3 | 500 | $2.99 |
| 4 | 2,500 | $2.99 |
| 5 | 10,000 | $2.99 |
| 6 | 50,000 | $2.99 |
| 7 | 250,000 | $2.99 |
| 8 | 1,000,000 | $2.99 |
| 9 | 5,000,000 | $2.99 |
| 10 | 25,000,000 | $2.99 |

### Authentication System
- Secure password hashing with bcrypt
- JWT tokens for API authentication (golang-jwt/jwt)
- Session persistence with localStorage
- Token validation on all protected endpoints

### Database Schema
- **users**: Authentication and user profiles
- **game_state**: Per-user coins, CPS, current level
- **upgrades**: Master list of 15 upgrades (seeded on startup)
- **user_upgrades**: Tracks quantity owned by each user
- **levels**: Master list of 10 levels (seeded on startup)
- **user_levels**: Tracks unlock status for each user
- **payment_records**: Xsolla transaction history

All tables created and seeded automatically on first run.

### Passive Income
- Automatic coin generation based on upgrades
- Updates synced with server
- Saves idle progress when returning

### Payment Integration
- Xsolla PayStation widget integration
- Mock token generation (ready for real API)
- Transaction recording
- Immediate level unlock on success

### Responsive Design
- Desktop layout (3-column grid)
- Tablet layout (stacked panels)
- Mobile layout (full-width responsive)
- Touch-friendly button sizes
- Optimized for all screen sizes

## Troubleshooting

**Database connection failed**
```
error connecting to database
```
Solution:
- Ensure PostgreSQL is running
- Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
- Verify database `clickergame` exists
- Test: `psql -U postgres -h localhost -c "SELECT version();"`

**Port already in use**
```
Error: listen tcp :8080: bind: address already in use
```
Solution:
- Change SERVER_PORT in .env
- macOS/Linux: `lsof -i :8080` then `kill -9 <PID>`
- Windows: `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`

**Frontend API calls failing**
- Check browser console (F12)
- Verify backend is running: `http://localhost:8080`
- Check CORS is enabled (should be)
- Verify JWT token in browser localStorage

**Go build errors**
```
go.mod not found
```
Solution:
- Ensure you're in the `backend` directory
- Run `go mod download` first

**Database schema not created**
- First run should auto-create tables
- Check PostgreSQL logs
- Manually run: `psql clickergame < database.sql`

## Development Guide

### Backend Architecture
- **Entry point**: `backend/cmd/server/main.go` - Gin router setup
- **Database layer**: `backend/internal/db/db.go` - SQL queries
- **API handlers**: `backend/internal/api/*.go` - Endpoint logic
- **Models**: `backend/internal/models/models.go` - Type definitions
- **Middleware**: `backend/internal/middleware/middleware.go` - Auth & CORS

### Adding New Features

**New Upgrade:**
1. Insert into `upgrades` table in database.sql
2. Run `psql clickergame < database.sql`
3. Frontend will load automatically

**New Level:**
1. Insert into `levels` table in database.sql
2. Run schema update
3. Frontend will load automatically

**New Endpoint:**
1. Add handler to `backend/internal/api/*.go`
2. Add route in `main.go`
3. Add model to `models.go` if needed
4. Update frontend game.js

## Performance Optimization

- Database indexes on user_id for fast queries
- JWT tokens validated per request
- Passive income calculated client-side
- Auto-save every 30 seconds (configurable)
- Coin amounts limited to prevent overflow

## Deployment

**Production Checklist:**
- [ ] Change JWT_SECRET to secure random value
- [ ] Set DB_PASSWORD to strong password
- [ ] Update Xsolla credentials
- [ ] Build: `make -C backend build`
- [ ] Test all endpoints
- [ ] Setup HTTPS/SSL
- [ ] Configure nginx reverse proxy
- [ ] Setup database backups
- [ ] Monitor logs

**Example nginx config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Future Enhancements

- Prestige/reset system
- Achievements and badges
- Sound effects and music
- Multiplayer features
- More cosmetic upgrades
- Real Xsolla API integration
- Trading system
- Leaderboard
- Admin panel

## License

MIT

## Support

For issues, questions, or contributions:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check Go server logs for errors
4. Verify PostgreSQL logs for database errors
5. Check browser console (F12) for frontend errors
# Clicker-Xsolla
