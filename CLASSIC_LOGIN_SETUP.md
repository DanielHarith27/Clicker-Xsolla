# Xsolla Login + Paystation Setup

## Overview
- Login: Xsolla OAuth 2.0
- Payments: Xsolla Paystation server-side token flow
- Local app JWT: issued by backend after OAuth callback

## Publisher Account Setup

### 1) Login project and OAuth client
1. Open your Login project in Publisher Account.
2. Add callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://clicker-xsolla.onrender.com/auth/callback`
3. Set default callback URL and error callback URL to your active environment URL.
4. In Security > OAuth 2.0, create an OAuth client and copy:
   - Login project ID
   - Client ID
   - Client secret

### 2) Catalog and Paystation
1. Create `virtual_items` SKUs for `level_2` through `level_20`.
2. Set each price to `2.99 USD`.
3. Copy Merchant ID, API key, and Project ID.

### 3) Webhook
Use this in Publisher Account:
- `https://clicker-xsolla.onrender.com/api/xsolla/webhook/payment`

## Environment Variables

```env
JWT_SECRET=change-me

XSOLLA_LOGIN_PROJECT_ID=your_login_project_uuid
XSOLLA_CLIENT_ID=your_client_id
XSOLLA_CLIENT_SECRET=your_client_secret

# local dev
XSOLLA_REDIRECT_URI=http://localhost:3000/auth/callback
# production (switch when deploying)
# XSOLLA_REDIRECT_URI=https://clicker-xsolla.onrender.com/auth/callback

XSOLLA_MERCHANT_ID=your_merchant_id
XSOLLA_API_KEY=your_api_key
XSOLLA_PROJECT_ID=your_project_id
XSOLLA_SANDBOX=true
```

## API Endpoints

### Xsolla Login
- `GET /api/xsolla/login-url`
- `POST /api/xsolla/oauth-callback` body: `{ "code": "...", "state": "..." }`

### Paystation
- `POST /api/xsolla/token` (JWT required)
- `POST /api/xsolla/webhook/payment`

## Local Test Flow
1. Run backend and frontend.
2. Open `http://localhost:3000`.
3. Click `Login with Xsolla`.
4. After redirect back to `/auth/callback?code=...`, backend exchanges the code and issues app JWT.
5. Open locked level, click buy, complete sandbox payment.

## Troubleshooting
- `failed to exchange auth code`: verify client ID/secret and redirect URI match exactly.
- `invalid request` on callback: ensure callback URL in Xsolla includes `/auth/callback`.
- payment token 401/404: verify merchant ID and API key pair.
