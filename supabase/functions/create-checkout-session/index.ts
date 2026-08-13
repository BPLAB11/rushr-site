import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.0.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { tier, successUrl, cancelUrl } = await req.json()

    if (!tier || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'tier, successUrl, and cancelUrl are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const priceMap = {
      'pro': 'price_1U3OeTRusJl2wZoPQ5NTAEKK',
      'studio': 'price_1U3OenRusJl2wZoP0eAFCLDy'
    }

    const priceId = priceMap[tier.toLowerCase()]
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be pro or studio' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
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
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
