const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();

// Stripe webhook signature verification
function verifyStripeSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Stripe webhook handler
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  if (!signature || !verifyStripeSignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
    console.error('Invalid Stripe webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, data } = req.body;

  // Handle checkout.session.completed event
  if (type === 'checkout.session.completed') {
    const session = data.object;
    const { metadata } = session;
    const { tier } = metadata;

    // Generate license key
    const licenseKey = generateLicenseKey(tier || 'pro');

    // Store license (this would typically use a database)
    // For now, we'll use the in-memory Map from server.js
    const licenses = req.app.get('licenses');
    
    if (licenses) {
      licenses.set(licenseKey, {
        tier: tier || 'pro',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        customerEmail: session.customer_details?.email || 'unknown'
      });

      console.log(`Stripe license activated: ${licenseKey} (${tier})`);
    }

    return res.status(200).json({ success: true, licenseKey });
  }

  res.status(200).json({ received: true });
});

function generateLicenseKey(tier) {
  const prefix = tier.toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `RUSHR-${prefix}-${random}-${timestamp}`;
}

module.exports = router;
