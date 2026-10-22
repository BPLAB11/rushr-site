// shop-gelato-webhook — Gelato posts order status and tracking events here.
//
// Gelato webhooks carry no signature, so the URL registered in the Gelato API Portal must include a
// secret: https://<project>.supabase.co/functions/v1/shop-gelato-webhook?k=<GELATO_WEBHOOK_SECRET>
// Secrets: GELATO_WEBHOOK_SECRET
// Deploy with verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const res = (status: number) => new Response(null, { status });
const now = () => new Date().toISOString();

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length || !b) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function addTracking(list: any[], code: unknown, url: unknown, carrier: unknown) {
  if (typeof code !== "string" || !code || list.some((t) => t.code === code)) return;
  list.push({ code, url: typeof url === "string" ? url : null, carrier: typeof carrier === "string" ? carrier : null });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return res(200);
  const secret = Deno.env.get("GELATO_WEBHOOK_SECRET") ?? "";
  if (!sameSecret(new URL(req.url).searchParams.get("k") ?? "", secret)) return res(401);

  let ev: any = null;
  try { ev = await req.json(); } catch { return res(200); }
  const reference = typeof ev?.orderReferenceId === "string" ? ev.orderReferenceId : null;
  if (!reference) return res(200);

  const { data: order, error } = await db.from("shop_orders").select("id,status,tracking").eq("reference", reference).maybeSingle();
  if (error) { console.error("lookup", error); return res(500); }
  if (!order) return res(200); // not one of ours (or a test order)

  const patch: Record<string, unknown> = { updated_at: now() };
  const tracking: any[] = Array.isArray(order.tracking) ? [...order.tracking] : [];

  if (ev.event === "order_status_updated") {
    patch.gelato_status = ev.fulfillmentStatus ?? null;
    if (ev.fulfillmentStatus === "shipped" || ev.fulfillmentStatus === "delivered") patch.status = ev.fulfillmentStatus;
    for (const it of ev.items ?? []) {
      for (const f of it.fulfillments ?? []) addTracking(tracking, f.trackingCode, f.trackingUrl, f.shipmentMethodName);
    }
  } else if (ev.event === "order_item_tracking_code_updated") {
    addTracking(tracking, ev.trackingCode, ev.trackingUrl, ev.shipmentMethodName);
  } else {
    return res(200); // other events are ignored
  }
  patch.tracking = tracking;

  const { error: upErr } = await db.from("shop_orders").update(patch).eq("id", order.id);
  if (upErr) { console.error("update", upErr); return res(500); }
  return res(200);
});
