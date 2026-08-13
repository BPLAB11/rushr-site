# Supabase Edge Functions for Rushr

This directory contains the Supabase Edge Functions for the Rushr backend API.

## Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. Run the migration to create the licenses table:
```bash
supabase db push
```

4. Set environment variables in Supabase Dashboard:
   - Go to Project Settings → Edge Functions
   - Add the following secrets:
     - `STRIPE_SECRET_KEY`: Your Stripe secret key
     - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret

## Deploy Functions

Deploy all functions:
```bash
supabase functions deploy
```

Deploy specific function:
```bash
supabase functions deploy validate-license
supabase functions deploy create-checkout-session
supabase functions deploy webhook-stripe
```

## Functions

### validate-license
Validates a license key against the database.

**Endpoint:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/validate-license`

**Request:**
```json
{
  "licenseKey": "RUSHR-PRO-TEST-67890"
}
```

### create-checkout-session
Creates a Stripe checkout session.

**Endpoint:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session`

**Request:**
```json
{
  "tier": "pro",
  "successUrl": "https://backpacklab.com/rushr?purchase=success",
  "cancelUrl": "https://backpacklab.com/rushr?purchase=cancel"
}
```

### webhook-stripe
Handles Stripe webhooks for automatic license activation.

**Endpoint:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/webhook-stripe`

## Database Schema

The `licenses` table stores license information:

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'studio')),
  expires_at TIMESTAMP WITH TIME ZONE,
  customer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Update Frontend

After deployment, update the API URL in rushr.html:

```javascript
const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-checkout-session', {
```

And update LicenseService.cs in Rushr app:

```csharp
private const string ApiBaseUrl = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/validate-license";
```
