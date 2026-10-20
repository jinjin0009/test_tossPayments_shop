// 주문 취소·환불: 토스 결제 취소 + 재고 복구 + 주문 상태 변경을 한 번에 처리한다.
// - 회원: 본인 주문이고 '배송 준비' 전(입금 대기·결제 완료)일 때만
// - 관리자: 배송 중·완료 포함 언제든
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { cors, json, tossFetch, paymentInfo } from "./shared.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CUSTOMER_OK = ["awaiting_deposit", "paid"];
const ADMIN_OK = ["awaiting_deposit", "paid", "preparing", "shipping", "delivered"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await db.auth.getUser(token);
    const user = auth?.user;
    if (!user) return json({ ok: false, code: "LOGIN_REQUIRED", message: "로그인이 필요합니다." }, 401);

    const { orderId, reason } = await req.json();
    const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    const isAdmin = !!profile?.is_admin;
    const { data: order } = await db.from("orders").select("*").eq("order_id", orderId).maybeSingle();
    if (!order || (!isAdmin && order.user_id !== user.id)) {
      return json({ ok: false, code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다." }, 404);
    }
    const allowed = isAdmin ? ADMIN_OK : CUSTOMER_OK;
    if (!allowed.includes(order.status)) {
      return json({ ok: false, code: "NOT_CANCELABLE", message: isAdmin ? "취소할 수 없는 주문 상태입니다." : "배송 준비가 시작된 주문은 직접 취소할 수 없습니다. 고객센터로 문의해 주세요." }, 409);
    }

    // 동시에 두 번 취소되지 않도록 먼저 '취소 처리 중'으로 잠금
    const prev = order.status;
    const { data: locked } = await db.from("orders").update({ status: "canceling" }).eq("id", order.id).eq("status", prev).select("id");
    if (!locked?.length) return json({ ok: false, code: "CONFLICT", message: "다른 처리가 진행 중입니다. 잠시 후 다시 시도해 주세요." }, 409);

    const cancelReason = String(reason || (isAdmin ? "판매자 취소" : "고객 변심")).slice(0, 200);
    let info = order.payment_info;
    if (order.payment_key) {
      const { ok, body } = await tossFetch(`/v1/payments/${encodeURIComponent(order.payment_key)}/cancel`, {
        method: "POST",
        idempotencyKey: "cancel-" + order.order_id,
        body: { cancelReason },
      });
      if (!ok && body.code !== "ALREADY_CANCELED_PAYMENT") {
        await db.from("orders").update({ status: prev }).eq("id", order.id);
        return json({ ok: false, code: body.code ?? "CANCEL_FAILED", message: body.message ?? "결제 취소에 실패했습니다." }, 400);
      }
      if (ok) info = paymentInfo(body);
    }

    await db.rpc("release_order_stock", { p_order: order.id });
    const status = prev === "awaiting_deposit" || !isAdmin ? "canceled" : "refunded";
    await db.from("orders").update({ status, cancel_reason: cancelReason, canceled_at: new Date().toISOString(), payment_info: info }).eq("id", order.id);
    return json({ ok: true, status });
  } catch (e) {
    console.error(e);
    return json({ ok: false, code: "SERVER_ERROR", message: "취소 처리 중 오류가 발생했습니다." }, 500);
  }
});
