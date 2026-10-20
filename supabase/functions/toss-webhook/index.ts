// 토스 웹훅: 무통장 입금 완료·입금 기한 만료·결제 취소를 주문에 자동 반영한다.
// 알림 내용은 믿지 않고, 주문번호로 토스에 결제 상태를 직접 다시 조회해서 반영한다.
// (관리자 화면의 '입금 여부 다시 확인' 버튼도 같은 경로를 쓴다)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { cors, json, tossFetch, methodLabel, paymentInfo } from "./shared.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const HOLDING = ["awaiting_deposit", "paid", "preparing"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId ?? body.data?.orderId;
    if (!orderId) return json({ ok: true, ignored: true });

    const { data: order } = await db.from("orders").select("*").eq("order_id", orderId).maybeSingle();
    if (!order || !order.payment_key) return json({ ok: true, ignored: true });

    const { ok, body: pay } = await tossFetch(`/v1/payments/${encodeURIComponent(order.payment_key)}`);
    if (!ok) return json({ ok: false, code: pay.code, message: pay.message }, 400);

    let status = order.status;
    if (pay.status === "DONE" && order.status === "awaiting_deposit") {
      // 무통장 입금 완료
      await db.from("orders").update({
        status: "paid", paid_at: new Date().toISOString(), method: methodLabel(pay), payment_info: paymentInfo(pay),
      }).eq("id", order.id).eq("status", "awaiting_deposit");
      status = "paid";
    } else if (["CANCELED", "ABORTED", "EXPIRED"].includes(pay.status) && HOLDING.includes(order.status)) {
      // 입금 기한 만료 또는 토스 쪽에서 취소됨
      await db.rpc("release_order_stock", { p_order: order.id });
      status = order.status === "awaiting_deposit" ? "canceled" : "refunded";
      await db.from("orders").update({
        status, canceled_at: new Date().toISOString(), payment_info: paymentInfo(pay),
        cancel_reason: pay.status === "EXPIRED" ? "입금 기한 만료" : "결제 취소",
      }).eq("id", order.id);
    }
    return json({ ok: true, status, tossStatus: pay.status });
  } catch (e) {
    console.error(e);
    return json({ ok: false, code: "SERVER_ERROR" }, 500);
  }
});
