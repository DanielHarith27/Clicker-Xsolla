# ✅ Xsolla Integration - OAuth Login + Paystation

## Current State
- Login uses Xsolla OAuth redirect flow.
- Backend exchanges callback `code` and issues your local JWT.
- Paystation purchase flow remains server-side token generation.

## Active Endpoints
- `GET /api/xsolla/login-url`
- `POST /api/xsolla/oauth-callback`
- `POST /api/xsolla/token`
- `POST /api/xsolla/webhook/payment`

## Required Publisher Account Values
- `Login project ID`
- `OAuth client ID`
- `OAuth client secret`
- `Merchant ID`
- `API key`
- `Project ID`

## Callback and Webhook
- OAuth callback URL (dev): `http://localhost:3000/auth/callback`
- OAuth callback URL (prod): `https://clicker-xsolla.onrender.com/auth/callback`
- Webhook URL: `https://clicker-xsolla.onrender.com/api/xsolla/webhook/payment`

## Runtime Notes
- Only one `XSOLLA_REDIRECT_URI` should be active in `.env`.
- For local development keep localhost callback.
- Switch to Render callback in production.
