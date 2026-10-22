// shop-sumup-webhook — SumUp calls this (return_url) when a checkout changes status.
//
// The payload is only { event_type, id }: nothing in it is trusted. We re-read the checkout from the
// SumUp API, compare it with the order we stored, then create the Gelato order exactly once.
// Any 2xx stops SumUp's retries (1 min, 5 min, 20 min, 2 h); we answer 5xx on transient failures so
// they are retried, and the claim below makes repeated deliveries harmless.
//
// Secrets: SUMUP_API_KEY, SUMUP_MERCHANT_CODE, GELATO_API_KEY
// Optional: GELATO_ORDER_TYPE = "order" (default, goes to production) or "draft" (safe tests)
// Deploy with verify_jwt = false.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const ok = () => new Response(null, { status: 200 });
const now = () => new Date().toISOString();

async function processCheckout(checkoutId: string): Promise<Response> {
  const { data: order, error } = await db.from("shop_orders").select("*").eq("sumup_checkout_id", checkoutId).maybeSingle();
  if (error) { console.error("lookup", error); return new Response(null, { status: 500 }); }
  if (!order) { console.warn("unknown checkout", checkoutId); return ok(); }
  if (order.gelato_order_id) return ok(); // already handled

  // 1. Source of truth: ask SumUp.
  const sr = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("SUMUP_API_KEY")}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!sr.ok) { console.error("sumup get", sr.status); return new Response(null, { status: 502 }); }
  const co = await sr.json();

  if (co.status !== "PAID") {
    const patch: Record<string, unknown> = { sumup_status: co.status, updated_at: now() };
    if (order.status === "pending" && (co.status === "FAILED" || co.status === "EXPIRED")) patch.status = co.status.toLowerCase();
    await db.from("shop_orders").update(patch).eq("id", order.id);
    return ok();
  }

  // 2. The paid checkout must be the one we created.
  const matches = co.checkout_reference === order.reference
    && co.merchant_code === Deno.env.get("SUMUP_MERCHANT_CODE")
    && co.currency === order.currency
    && Math.round(Number(co.amount) * 100) === order.total_cents;
  if (!matches) {
    console.error("checkout mismatch", order.reference, co.amount, co.currency, co.merchant_code);
    await db.from("shop_orders").update({ status: "review", sumup_status: co.status, error: "checkout does not match order", updated_at: now() }).eq("id", order.id);
    return ok();
  }

  // 3. Claim the order: only one delivery wins, a crashed attempt is reclaimable after 10 minutes.
  const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: claimed, error: claimErr } = await db.from("shop_orders")
    .update({ status: "fulfilling", sumup_status: co.status, paid_at: order.paid_at ?? now(), error: null, updated_at: now() })
    .eq("id", order.id)
    .is("gelato_order_id", null)
    .or(`status.in.(pending,paid,fulfilment_error),and(status.eq.fulfilling,updated_at.lt.${stale})`)
    .select("id")
    .maybeSingle();
  if (claimErr) { console.error("claim", claimErr); return new Response(null, { status: 500 }); }
  if (!claimed) return ok(); // someone else is on it, or it is already done

  // 4. Send the order to Gelato.
  const orderType = Deno.env.get("GELATO_ORDER_TYPE") === "draft" ? "draft" : "order";
  try {
    const gr = await fetch("https://order.gelatoapis.com/v4/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": Deno.env.get("GELATO_API_KEY")! },
      body: JSON.stringify({
        orderType,
        orderReferenceId: order.reference,
        customerReferenceId: order.reference,
        currency: order.currency,
        items: order.items.map((it: any, i: number) => ({
          itemReferenceId: `${order.reference}-${i + 1}`,
          productUid: it.product_uid,
          files: [{ type: "default", url: it.file_url }],
          quantity: it.qty,
        })),
        shipmentMethodUid: order.shipment_method_uid,
        shippingAddress: order.shipping,
        metadata: [{ key: "reference", value: order.reference }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await gr.text();
    if (!gr.ok) throw new Error(`gelato ${gr.status}: ${text.slice(0, 400)}`);
    const g = JSON.parse(text);
    await db.from("shop_orders").update({
      status: orderType === "draft" ? "draft_submitted" : "submitted",
      gelato_order_id: g.id, gelato_status: g.fulfillmentStatus ?? null, updated_at: now(),
    }).eq("id", order.id);
    return ok();
  } catch (e) {
    console.error("gelato create failed", order.reference, e);
    await db.from("shop_orders").update({ status: "fulfilment_error", error: String(e).slice(0, 500), updated_at: now() }).eq("id", order.id);
    return new Response(null, { status: 502 }); // SumUp will retry; the claim lets the retry through
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  let body: any = null;
  try { body = await req.json(); } catch { return ok(); }
  if (body?.event_type !== "CHECKOUT_STATUS_CHANGED" || typeof body.id !== "string") return ok();
  try {
    return await processCheckout(body.id);
  } catch (e) {
    console.error("shop-sumup-webhook", e);
    return new Response(null, { status: 500 });
  }
});
