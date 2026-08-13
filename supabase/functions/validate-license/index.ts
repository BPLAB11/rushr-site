import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const { licenseKey } = await req.json()

    if (!licenseKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'License key is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single()

    if (error || !license) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid license key' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if license is expired
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'License has expired' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        valid: true,
        tier: license.tier,
        expiresAt: license.expires_at,
        createdAt: license.created_at
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
