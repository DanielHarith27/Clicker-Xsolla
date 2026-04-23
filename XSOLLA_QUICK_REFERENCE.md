# Xsolla Integration Quick Reference

## 🎯 Credentials You Need to Get from Publisher Account

Print this page and fill it in as you collect credentials from Publisher Account.

### Login Credentials
```
Login Project ID:           _____________________________
Client ID:                  _____________________________
Client Secret:              _____________________________
Redirect URI:               _____________________________
                            (http://localhost:3000/auth/callback)
```

### Payment Credentials
```
Merchant ID:                _____________________________
API Key:                    _____________________________
Project ID:                 _____________________________
```

---

## 📋 Publisher Account Checklist

- [ ] Created/Selected Main Project
- [ ] Created Login Project in Players > Login
- [ ] Enabled Passwordless login
- [ ] Set Callback URLs (dev & production)
- [ ] Created OAuth 2.0 client
- [ ] Copied Client ID and Client Secret
- [ ] Noted Login Project ID
- [ ] Created payment catalog items (Level 2-20 @ $2.99 each)
- [ ] Found Merchant ID
- [ ] Generated/Copied API Key
- [ ] Noted Project ID

---

## 🔧 .env Configuration

```env
XSOLLA_LOGIN_PROJECT_ID=[Login Project ID from above]
XSOLLA_CLIENT_ID=[Client ID from above]
XSOLLA_CLIENT_SECRET=[Client Secret from above]
XSOLLA_REDIRECT_URI=http://localhost:3000/auth/callback
XSOLLA_MERCHANT_ID=[Merchant ID from above]
XSOLLA_API_KEY=[API Key from above]
XSOLLA_PROJECT_ID=[Project ID from above]
XSOLLA_SANDBOX=true
```

---

## 🎮 Frontend Code Update

In `frontend/src/game.js` (around line 106):

```javascript
const projectId = "[Login Project ID]";
const clientId = "[Client ID]";
```

---

## 🧪 Test Credentials

**Sandbox Card (for testing):**
- Card Number: `4111 1111 1111 1111`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits

**Test Account:**
- Create at [Xsolla Wallet](https://account.xsolla.com)
- Use any email for testing

---

## 🚀 After Configuration

1. `cd backend && go run ./cmd/server/main.go`
2. Open `http://localhost:3000`
3. Click "Login with Xsolla"
4. After login, try to unlock a level
5. Use test card to complete payment

---

## ✅ Success Indicators

- ✅ Xsolla login widget appears on page
- ✅ Can log in with Xsolla account
- ✅ Redirects back to game after login
- ✅ Can see "Buy" button for locked levels
- ✅ Paystation widget opens when clicking "Buy"
- ✅ Payment completes with test card
- ✅ Level unlocks after payment
- ✅ New payment appears in database

---

## 🔗 Links

- Publisher Account: https://publisher.xsolla.com
- Xsolla Developers: https://developers.xsolla.com
- Full Setup Guide: See `XSOLLA_SETUP.md`
- Integration Details: See `INTEGRATION_COMPLETE.md`
