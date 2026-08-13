# Rushr Backend API

Backend API for Rushr license validation and Stripe payment integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```
PORT=3000
NODE_ENV=production
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### POST /api/validate-license
Validate a license key.

**Request:**
```json
{
  "licenseKey": "RUSHR-PRO-TEST-67890"
}
```

**Response (valid):**
```json
{
  "valid": true,
  "tier": "pro",
  "expiresAt": "2027-08-12T00:00:00.000Z",
  "createdAt": "2026-08-12T00:00:00.000Z"
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "error": "Invalid license key"
}
```

### POST /api/activate-license
Activate a new license (for admin use).

**Request:**
```json
{
  "licenseKey": "RUSHR-PRO-NEW-KEY",
  "tier": "pro"
}
```

### POST /api/create-checkout-session
Create a Stripe checkout session for purchasing a license.

**Request:**
```json
{
  "tier": "pro",
  "successUrl": "https://backpacklab.com/rushr?purchase=success",
  "cancelUrl": "https://backpacklab.com/rushr?purchase=cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxxxx"
}
```

### GET /api/stripe-config
Get Stripe publishable key for frontend.

**Response:**
```json
{
  "publishableKey": "pk_test_xxxxx"
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-08-12T00:00:00.000Z",
  "activeLicenses": 3
}
```

### GET /api/version
Version information for update checker.

**Response:**
```json
{
  "version": "1.0.0",
  "downloadUrl": "https://github.com/backpacklab/rushr/releases/latest",
  "releaseDate": "2026-08-12",
  "mandatory": false
}
```

### POST /webhook/stripe
Stripe webhook endpoint for automatic license activation on checkout completion.

## License Tiers

- **free**: No expiration, limited features
- **pro**: 1 year expiration, full features
- **studio**: 1 year expiration, full features + priority support + 3 licenses

## Test Licenses

The following test licenses are pre-configured:

- `RUSHR-FREE-TEST-12345` (Free tier)
- `RUSHR-PRO-TEST-67890` (Pro tier)
- `RUSHR-STUDIO-TEST-11111` (Studio tier)

## Production Notes

In production, replace the in-memory `Map` storage with a proper database (PostgreSQL, MongoDB, etc.) for license persistence.

## Deployment

For deployment on api.backpacklab.com:

1. Upload all backend files to the server
2. Set environment variables (use .env.production for production keys)
3. Install dependencies: `npm install`
4. Start the server: `npm start`
5. Use a process manager like PM2 for production: `pm2 start server.js --name rushr-backend`
