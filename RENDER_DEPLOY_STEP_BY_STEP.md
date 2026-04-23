# Deploy XsollaGame to Render (Step by Step)

This guide is tailored for your current project structure (Go backend + static frontend served by Gin) and your Render URL:

- https://clicker-xsolla.onrender.com

## 1. Push your code to GitHub first

Render deploys from a Git repo.

1. Commit your latest code.
2. Push to GitHub (main branch recommended).
3. Confirm your repo contains:
   - `backend/cmd/server/main.go`
   - `frontend/public/index.html`
   - `frontend/src/*`

## 2. Create a PostgreSQL database on Render

1. In Render dashboard: `New` -> `PostgreSQL`.
2. Choose name (example: `clicker-xsolla-db`).
3. Create it.
4. Open the DB service and copy these values from the `Connections` tab:
   - Host
   - Port
   - Database
   - User
   - Password

You will map these into your backend env vars:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## 3. Create the Web Service for your Go app

1. Render dashboard: `New` -> `Web Service`.
2. Connect your GitHub repo.
3. Configure:
   - Name: `clicker-xsolla`
   - Environment: `Go`
   - Region: same as your DB region
   - Branch: `main`
   - Root Directory: `backend`
   - Build Command:
     `go build -o bin/server ./cmd/server/main.go`
   - Start Command:
     `./bin/server`

Render will expose `PORT` automatically, but your app uses `SERVER_PORT`, so set that manually in env vars (next step).

## 4. Add environment variables in Render (Web Service)

In your Web Service -> `Environment` -> `Add Environment Variable`.

### Required app vars

- `SERVER_PORT` = `10000`
- `JWT_SECRET` = (long random secret)

### Required DB vars (from Render Postgres)

- `DB_HOST` = (from Render Postgres host)
- `DB_PORT` = (usually `5432`)
- `DB_NAME` = (from Render Postgres database)
- `DB_USER` = (from Render Postgres user)
- `DB_PASSWORD` = (from Render Postgres password)

### Required Xsolla vars

- `XSOLLA_LOGIN_PROJECT_ID` = your login project id
- `XSOLLA_CLIENT_ID` = your oauth client id
- `XSOLLA_CLIENT_SECRET` = your oauth client secret
- `XSOLLA_REDIRECT_URI` = `https://clicker-xsolla.onrender.com/auth/callback`
- `XSOLLA_MERCHANT_ID` = your merchant id
- `XSOLLA_API_KEY` = your api key
- `XSOLLA_PROJECT_ID` = your project id
- `XSOLLA_SANDBOX` = `true` (keep true while testing)

## 5. Trigger deploy

1. Click `Manual Deploy` -> `Deploy latest commit` (or auto deploy on push).
2. Wait until status is `Live`.
3. Open:
   - https://clicker-xsolla.onrender.com

## 6. Update Xsolla Publisher Account (very important)

In Xsolla Login project settings:

1. Add callback URL:
   - `https://clicker-xsolla.onrender.com/auth/callback`
2. Set OAuth redirect URI exactly the same.

In Xsolla webhook settings:

1. Set payment webhook URL to:
   - `https://clicker-xsolla.onrender.com/api/xsolla/webhook/payment`

If these do not exactly match, login/payment will fail.

## 7. Verify everything works

1. Open your site URL.
2. Register/login (or Xsolla login).
3. Play and trigger a protected API request.
4. Test a sandbox payment for a locked level.
5. Check Render logs for errors (`Logs` tab in web service).

## 8. Common Render fixes

### App is live but DB connection fails

Usually one of these is wrong:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- DB and Web Service in different regions/network issues

### App crashes at startup

Check Render logs. Most common causes:
- missing env var (`JWT_SECRET`, DB vars, Xsolla vars)
- wrong build/start command

### Login redirect mismatch

Make sure these are identical:
- `XSOLLA_REDIRECT_URI` in Render
- Callback/redirect URL in Xsolla Publisher Account

## 9. Production switch later

When ready for real payments:

1. Set `XSOLLA_SANDBOX=false` in Render.
2. Ensure your Xsolla project is in production mode.
3. Redeploy.

---

## Quick copy block (Web Service env vars)

```env
SERVER_PORT=10000
JWT_SECRET=replace_with_strong_random_secret

DB_HOST=replace_me
DB_PORT=5432
DB_NAME=replace_me
DB_USER=replace_me
DB_PASSWORD=replace_me

XSOLLA_LOGIN_PROJECT_ID=replace_me
XSOLLA_CLIENT_ID=replace_me
XSOLLA_CLIENT_SECRET=replace_me
XSOLLA_REDIRECT_URI=https://clicker-xsolla.onrender.com/auth/callback
XSOLLA_MERCHANT_ID=replace_me
XSOLLA_API_KEY=replace_me
XSOLLA_PROJECT_ID=replace_me
XSOLLA_SANDBOX=true
```

If you want, I can also create a `render.yaml` blueprint so deployment is mostly one-click next time.