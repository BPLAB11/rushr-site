// shop-checkout — prices the cart, quotes shipping with Gelato and opens a SumUp hosted checkout.
//
// POST { items:[{id,size,qty}], recipient:{...}, lang, quote_only?, expected_total_cents?, website? }
//   quote_only = true  -> { shipping_cents, total_cents, ... } (nothing is created)
//   otherwise          -> creates a pending order + SumUp checkout, returns { hosted_checkout_url, reference }
//
// Secrets: SUMUP_API_KEY, SUMUP_MERCHANT_CODE, GELATO_API_KEY, GELATO_UID_MUG_11, GELATO_UID_MUG_15
// Optional: SHOP_SITE_URL (default https://thebackpacklab.com), SHOP_FILE_BASE (default <site>/assets/mugs/print/, files in 11oz/ and 15oz/)
// Deploy with verify_jwt = false (the browser sends the publishable key, which is not a JWT).
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = (Deno.env.get("SHOP_SITE_URL") ?? "https://thebackpacklab.com").replace(/\/$/, "");
const FILE_BASE = Deno.env.get("SHOP_FILE_BASE") ?? `${SITE}/assets/mugs/print/`;
const CURRENCY = "EUR";
const ALLOWED_ORIGINS = [SITE, "https://www.thebackpacklab.com", "http://localhost:8765"];
const SHIP_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

// Source of truth for prices and print files. Keep in sync with shop.html (SIZES / PRODUCTS).
// 15 oz is not offered yet: to enable it add "15": 2299 here, in shop.html (SIZES) and set GELATO_UID_MUG_15.
const PRICES_CENTS: Record<string, number> = { "11": 1999 };
const FILES: Record<string, string> = {
  "01": "01_editor_final_v7",
  "02": "02_editor_ctrlz",
  "03": "03_editor_fix_in_post",
  "04": "04_editor_rendering",
  "05": "05_editor_cut_coffee_repeat",
  "06": "06_editor_export_failed",
  "07": "07_videographer_broll",
  "08": "08_videographer_24fps",
  "09": "09_videographer_battery",
  "10": "10_creator_take47",
  "11": "11_creator_like_subscribe_refill",
  "12": "12_creator_content_loading",
};

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

class HttpError extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

function str(v: unknown, max: number, required = true): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new HttpError(400, "invalid_input");
  if (s.length > max) throw new HttpError(400, "invalid_input");
  return s;
}

function newReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "BPL-" + [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

async function gelatoQuote(reference: string, items: any[], recipient: any) {
  const r = await fetch("https://order.gelatoapis.com/v4/orders:quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": Deno.env.get("GELATO_API_KEY")! },
    body: JSON.stringify({
      orderReferenceId: reference,
      customerReferenceId: reference,
      currency: CURRENCY,
      allowMultipleQuotes: false,
      recipient,
      products: items.map((it, i) => ({
        itemReferenceId: `${reference}-${i + 1}`,
        productUid: it.product_uid,
        files: [{ type: "default", url: it.file_url }],
        quantity: it.qty,
      })),
    }),
    signal: AbortSignal.timeout(12000),
  });
  const text = await r.text();
  if (!r.ok) {
    console.error("gelato quote failed", r.status, text.slice(0, 500));
    throw new HttpError(502, "shipping_unavailable");
  }
  const data = JSON.parse(text);
  const quotes = data.quotes ?? [];
  if (quotes.length !== 1) throw new HttpError(502, "shipping_unavailable");
  const methods = (quotes[0].shipmentMethods ?? []).filter((m: any) => m.isPrivate !== false && m.currency === CURRENCY);
  const standard = methods.filter((m: any) => m.type === "normal" || m.type === "standard");
  const pool = standard.length ? standard : methods;
  if (!pool.length) {
    console.error("gelato quote: no usable shipment method", JSON.stringify((quotes[0].shipmentMethods ?? []).map((m: any) =>
      ({ name: m.name, type: m.type, price: m.price, currency: m.currency, isPrivate: m.isPrivate }))));
    throw new HttpError(502, "shipping_unavailable");
  }
  pool.sort((a: any, b: any) => a.price - b.price);
  return pool[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });

  let reference: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") throw new HttpError(400, "invalid_input");
    if (body.website) throw new HttpError(400, "invalid_input"); // honeypot

    // ----- cart -----
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 12) throw new HttpError(400, "invalid_cart");
    const merged = new Map<string, number>();
    for (const l of body.items) {
      const id = String(l?.id), size = String(l?.size), qty = Number(l?.qty);
      if (!FILES[id] || !PRICES_CENTS[size] || !Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, "invalid_cart");
      merged.set(`${id}|${size}`, (merged.get(`${id}|${size}`) ?? 0) + qty);
    }
    const items = [...merged.entries()].map(([k, qty]) => {
      const [id, size] = k.split("|");
      const uid = Deno.env.get(`GELATO_UID_MUG_${size}`);
      if (!uid) throw new HttpError(500, "not_configured");
      // One print file per size: 11oz -> 2700x1296, 15oz -> 2700x1306 (the printable area of each mug).
      return { id, size, qty: Math.min(qty, 20), unit_cents: PRICES_CENTS[size], product_uid: uid, file_url: `${FILE_BASE}${size}oz/${FILES[id]}.png` };
    });
    if (items.reduce((t, i) => t + i.qty, 0) > 30) throw new HttpError(400, "invalid_cart");
    const subtotal = items.reduce((t, i) => t + i.unit_cents * i.qty, 0);

    // ----- recipient (Gelato field limits) -----
    const r = body.recipient ?? {};
    const country = str(r.country, 2).toUpperCase();
    if (!SHIP_COUNTRIES.has(country)) throw new HttpError(400, "country_not_supported");
    const email = str(r.email, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "invalid_input");
    const recipient: Record<string, string> = {
      firstName: str(r.firstName, 25), lastName: str(r.lastName, 25),
      addressLine1: str(r.addressLine1, 35), city: str(r.city, 30), postCode: str(r.postCode, 15),
      country, email,
    };
    const l2 = str(r.addressLine2, 35, false), phone = str(r.phone, 25, false), state = str(r.state, 35, false);
    if (l2) recipient.addressLine2 = l2;
    if (phone) recipient.phone = phone;
    if (state) recipient.state = state;
    const lang = body.lang === "en" ? "en" : "fr";

    // ----- shipping quote -----
    reference = newReference();
    const method = await gelatoQuote(reference, items, recipient);
    const shipping = Math.round(method.price * 100);
    const total = subtotal + shipping;
    const summary = {
      currency: CURRENCY, subtotal_cents: subtotal, shipping_cents: shipping, total_cents: total,
      shipping_name: method.name, delivery_days: { min: method.minDeliveryDays, max: method.maxDeliveryDays },
    };
    if (body.quote_only) return json(req, 200, summary);
    if (Number(body.expected_total_cents) !== total) throw new HttpError(409, "total_changed", summary);

    // ----- pending order -----
    const { error: insErr } = await db.from("shop_orders").insert({
      reference, email, lang, currency: CURRENCY, items, shipping: recipient,
      shipment_method_uid: method.shipmentMethodUid, shipment_method_name: method.name,
      subtotal_cents: subtotal, shipping_cents: shipping, total_cents: total,
    });
    if (insErr) { console.error("insert order", insErr); throw new HttpError(500, "server_error"); }

    // ----- SumUp hosted checkout -----
    const sr = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUMUP_API_KEY")}` },
      body: JSON.stringify({
        checkout_reference: reference,
        amount: total / 100,
        currency: CURRENCY,
        merchant_code: Deno.env.get("SUMUP_MERCHANT_CODE"),
        description: `Backpack Lab ${reference}`,
        return_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/shop-sumup-webhook`,
        redirect_url: `${SITE}/merci?ref=${reference}`,
        hosted_checkout: { enabled: true },
      }),
      signal: AbortSignal.timeout(12000),
    });
    const stext = await sr.text();
    if (!sr.ok) {
      console.error("sumup checkout failed", sr.status, stext.slice(0, 500));
      await db.from("shop_orders").update({ status: "failed", error: `sumup ${sr.status}`, updated_at: new Date().toISOString() }).eq("reference", reference);
      throw new HttpError(502, "payment_unavailable");
    }
    const checkout = JSON.parse(stext);
    if (!checkout.hosted_checkout_url || !checkout.id) throw new HttpError(502, "payment_unavailable");
    await db.from("shop_orders").update({ sumup_checkout_id: checkout.id, sumup_status: checkout.status ?? "PENDING", updated_at: new Date().toISOString() }).eq("reference", reference);

    return json(req, 200, { ...summary, reference, hosted_checkout_url: checkout.hosted_checkout_url });
  } catch (e) {
    if (e instanceof HttpError) return json(req, e.status, { error: e.code, ...e.extra });
    console.error("shop-checkout", reference, e);
    return json(req, 500, { error: "server_error" });
  }
});
