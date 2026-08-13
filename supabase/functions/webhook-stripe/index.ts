import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.0.0"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const body = await req.text()

  if (!signature) {
    return new Response('No signature', { status: 401 })
  }

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 401 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { metadata } = session
    const { tier } = metadata

    // Generate license key
    const licenseKey = generateLicenseKey(tier || 'pro')

    // Store license in Supabase
    const { error } = await supabase.from('licenses').insert({
      license_key: licenseKey,
      tier: tier || 'pro',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      customer_email: session.customer_details?.email || 'unknown'
    })

    if (error) {
      console.error('Error storing license:', error)
      return new Response('Error storing license', { status: 500 })
    }

    console.log(`Stripe license activated: ${licenseKey} (${tier})`)
  }

  return new Response('Received', { status: 200 })
})

function generateLicenseKey(tier: string): string {
  const prefix = tier.toUpperCase()
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase()
  return `RUSHR-${prefix}-${random}-${timestamp}`
}
