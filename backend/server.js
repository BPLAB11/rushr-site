const express = require('express');
const cors = require('cors');
const webhookRouter = require('./webhook');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Webhook routes
app.use('/webhook', webhookRouter);

// Share licenses Map with webhook
const licenses = new Map();
app.set('licenses', licenses);

// In-memory license storage (in production, use a database)

// Initialize with some test licenses
licenses.set('RUSHR-FREE-TEST-12345', {
  tier: 'free',
  expiresAt: null, // Free licenses don't expire
  createdAt: new Date().toISOString()
});

licenses.set('RUSHR-PRO-TEST-67890', {
  tier: 'pro',
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  createdAt: new Date().toISOString()
});

licenses.set('RUSHR-STUDIO-TEST-11111', {
  tier: 'studio',
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  createdAt: new Date().toISOString()
});

// Validate license endpoint
app.post('/api/validate-license', (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ 
      valid: false, 
      error: 'License key is required' 
    });
  }

  const license = licenses.get(licenseKey);

  if (!license) {
    return res.status(404).json({ 
      valid: false, 
      error: 'Invalid license key' 
    });
  }

  // Check if license is expired
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return res.status(403).json({ 
      valid: false, 
      error: 'License has expired' 
    });
  }

  // Return license information
  res.json({
    valid: true,
    tier: license.tier,
    expiresAt: license.expiresAt,
    createdAt: license.createdAt
  });
});

// Activate license endpoint (for Stripe webhook)
app.post('/api/activate-license', (req, res) => {
  const { licenseKey, tier } = req.body;

  if (!licenseKey || !tier) {
    return res.status(400).json({ 
      success: false, 
      error: 'License key and tier are required' 
    });
  }

  // Validate tier
  const validTiers = ['free', 'pro', 'studio'];
  if (!validTiers.includes(tier.toLowerCase())) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid tier. Must be one of: free, pro, studio' 
    });
  }

  // Check if license already exists
  if (licenses.has(licenseKey)) {
    return res.status(409).json({ 
      success: false, 
      error: 'License key already exists' 
    });
  }

  // Create license
  const expiresAt = tier.toLowerCase() === 'free' 
    ? null 
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  licenses.set(licenseKey, {
    tier: tier.toLowerCase(),
    expiresAt,
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'License activated successfully',
    tier: tier.toLowerCase(),
    expiresAt
  });
});

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { tier, successUrl, cancelUrl } = req.body;

    if (!tier || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        error: 'tier, successUrl, and cancelUrl are required' 
      });
    }

    // Map tier to price ID
    const priceMap = {
      'pro': 'price_1U3OeTRusJl2wZoPQ5NTAEKK',
      'studio': 'price_1U3OenRusJl2wZoP0eAFCLDy'
    };

    const priceId = priceMap[tier.toLowerCase()];
    if (!priceId) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be pro or studio' 
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tier: tier.toLowerCase()
      }
    });

    res.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session' 
    });
  }
});

// Get Stripe publishable key
app.get('/api/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeLicenses: licenses.size
  });
});

// Version endpoint for update checker
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    downloadUrl: 'https://github.com/backpacklab/rushr/releases/latest',
    releaseDate: '2026-08-12',
    mandatory: false
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Rushr backend server running on port ${PORT}`);
  console.log(`Active licenses: ${licenses.size}`);
});
