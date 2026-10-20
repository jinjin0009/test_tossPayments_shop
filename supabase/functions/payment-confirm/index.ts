// 결제 승인: 토스 결제창에서 돌아온 결제를 서버에서 확인하고 확정한다.
// 1) 주문 금액과 결제 금액 비교(위변조 방지) 2) 재고 차감 3) 토스 승인 API 호출 4) 주문 상태 기록
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { cors, json, tossFetch, methodLabel, paymentInfo, publicOrder } from "./shared.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const DONE = ["awaiting_deposit", "paid", "preparing", "shipping", "delivered"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { paymentKey, orderId, amount } = await req.json();
    if (!paymentKey || !orderId || !Number.isFinite(Number(amount))) {
      return json({ ok: false, code: "INVALID_REQUEST", message: "결제 정보가 올바르지 않습니다." }, 400);
    }
    const { data: order } = await db.from("orders").select("*").eq("order_id", orderId).maybeSingle();
    if (!order) return json({ ok: false, code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다." }, 404);

    // 금액 위변조 방지: 서버가 계산해 둔 주문 금액과 다르면 승인하지 않는다
    if (order.amount !== Number(amount)) {
      return json({ ok: false, code: "AMOUNT_MISMATCH", message: "결제 금액이 주문 금액과 달라 결제를 진행하지 않았습니다. 다시 주문해 주세요." }, 400);
    }
    // 새로고침 등으로 다시 들어온 경우: 이미 처리된 결과를 그대로 돌려준다
    if (order.payment_key === paymentKey && DONE.includes(order.status)) return json({ ok: true, order: publicOrder(order) });

    const { data: begin, error } = await db.rpc("begin_payment", { p_order_id: orderId });
    if (error) throw error;
    if (begin === "OUT_OF_STOCK") {
      return json({ ok: false, code: "OUT_OF_STOCK", message: "결제하는 사이 재고가 모두 팔렸습니다. 결제는 승인되지 않았습니다." }, 409);
    }
    if (begin !== "OK") return json({ ok: false, code: "ALREADY_PROCESSED", message: "이미 처리되었거나 만료된 주문입니다." }, 409);

    const { ok, body: pay } = await tossFetch("/v1/payments/confirm", {
      method: "POST",
      idempotencyKey: "confirm-" + orderId,
      body: { paymentKey, orderId, amount: order.amount },
    });
    const now = new Date().toISOString();
    if (!ok) {
      await db.rpc("release_order_stock", { p_order: order.id });
      await db.from("orders").update({ status: "failed", cancel_reason: pay.message ?? "결제 승인 실패" }).eq("id", order.id);
      return json({ ok: false, code: pay.code ?? "CONFIRM_FAILED", message: pay.message ?? "결제 승인에 실패했습니다." }, 400);
    }

    const waiting = pay.status === "WAITING_FOR_DEPOSIT";
    const update = {
      status: waiting ? "awaiting_deposit" : "paid",
      payment_key: pay.paymentKey,
      method: methodLabel(pay),
      payment_info: paymentInfo(pay),
      paid_at: waiting ? null : (pay.approvedAt ?? now),
    };
    await db.from("orders").update(update).eq("id", order.id);
    if (pay.secret) await db.from("order_payment_secrets").upsert({ order_id: order.id, secret: pay.secret });
    return json({ ok: true, order: publicOrder({ ...order, ...update }) });
  } catch (e) {
    console.error(e);
    return json({ ok: false, code: "SERVER_ERROR", message: "결제 확인 중 오류가 발생했습니다. 잠시 후 주문 내역을 확인해 주세요." }, 500);
  }
});
