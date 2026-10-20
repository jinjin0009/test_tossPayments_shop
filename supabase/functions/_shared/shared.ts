// 결제 서버 공용 도구
// 배포할 때는 각 함수 폴더에 shared.ts 로 함께 올린다 (index.ts 가 "./shared.ts" 를 import).

// 토스페이먼츠 시크릿 키. Supabase 대시보드 > Edge Functions > Secrets 에 TOSS_SECRET_KEY 를 넣으면 그 값을 쓴다.
// 없으면 토스 문서 공개용 테스트 키(돈이 나가지 않음)를 쓴다.
const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
const TOSS_AUTH = "Basic " + btoa(TOSS_SECRET_KEY + ":");

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export async function tossFetch(path: string, opt: { method?: string; body?: unknown; idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = { Authorization: TOSS_AUTH, "Content-Type": "application/json" };
  if (opt.idempotencyKey) headers["Idempotency-Key"] = opt.idempotencyKey;
  const res = await fetch("https://api.tosspayments.com" + path, {
    method: opt.method ?? "GET",
    headers,
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  let body: any = {};
  try { body = await res.json(); } catch { /* 빈 응답 */ }
  return { ok: res.ok, status: res.status, body };
}

const BANKS: Record<string, string> = {
  "39": "경남은행", "34": "광주은행", "12": "단위농협", "32": "부산은행", "45": "새마을금고", "64": "산림조합",
  "88": "신한은행", "48": "신협", "27": "씨티은행", "20": "우리은행", "71": "우체국", "50": "저축은행",
  "37": "전북은행", "35": "제주은행", "90": "카카오뱅크", "89": "케이뱅크", "92": "토스뱅크", "81": "하나은행",
  "54": "HSBC", "03": "IBK기업은행", "06": "KB국민은행", "04": "KB국민은행", "31": "DGB대구은행", "02": "KDB산업은행",
  "11": "NH농협은행", "23": "SC제일은행", "07": "Sh수협은행",
};

export function methodLabel(pay: any) {
  if (pay.easyPay?.provider) return `간편결제 (${pay.easyPay.provider})`;
  return pay.method ?? "";
}

export function paymentInfo(pay: any) {
  const info: Record<string, unknown> = {
    status: pay.status,
    approvedAt: pay.approvedAt ?? null,
    receiptUrl: pay.receipt?.url ?? null,
  };
  if (pay.card) info.card = { company: pay.card.issuerCode ?? "", number: pay.card.number ?? "", installment: pay.card.installmentPlanMonths ?? 0 };
  if (pay.virtualAccount) {
    const v = pay.virtualAccount;
    info.virtualAccount = { bank: BANKS[v.bankCode] ?? v.bankCode, accountNumber: v.accountNumber, dueDate: v.dueDate, customerName: v.customerName };
  }
  if (pay.cancels?.length) info.cancels = pay.cancels.map((c: any) => ({ amount: c.cancelAmount, reason: c.cancelReason, at: c.canceledAt }));
  return info;
}

export function publicOrder(o: any) {
  return {
    orderId: o.order_id, orderName: o.order_name, amount: o.amount, status: o.status,
    method: o.method, paymentInfo: o.payment_info, isDirect: o.is_direct,
  };
}
