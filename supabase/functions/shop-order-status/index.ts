// shop-order-status — lets the /merci page show where an order stands.
// GET ?ref=BPL-XXXXXXXXXX -> { status, tracking:[{code,url}] }. No personal data is returned; the
// reference is random and only known to the customer who was redirected with it.
// Deploy with verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = (Deno.env.get("SHOP_SITE_URL") ?? "https://thebackpacklab.com").replace(/\/$/, "");
const ALLOWED_ORIGINS = [SITE, "https://www.thebackpacklab.com", "http://localhost:8765"];
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

function headers(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: headers(req) });
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  if (!/^BPL-[A-Z2-9]{10}$/.test(ref)) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: headers(req) });

  const { data, error } = await db.from("shop_orders").select("status,tracking").eq("reference", ref).maybeSingle();
  if (error) { console.error(error); return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: headers(req) }); }
  if (!data) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: headers(req) });
  const tracking = (Array.isArray(data.tracking) ? data.tracking : []).map((t: any) => ({ code: t.code, url: t.url }));
  return new Response(JSON.stringify({ status: data.status, tracking }), { status: 200, headers: headers(req) });
});
