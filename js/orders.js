/* 주문 표시 공용 (마이페이지 · 비회원 주문 조회 · 관리자 화면) */

const ORDER_STATUS = {
  pending: "결제 대기",
  confirming: "결제 확인 중",
  awaiting_deposit: "입금 대기",
  paid: "결제 완료",
  preparing: "배송 준비",
  shipping: "배송 중",
  delivered: "배송 완료",
  canceling: "취소 처리 중",
  canceled: "주문 취소",
  refunded: "환불 완료",
  failed: "결제 실패",
};
const SHIP_STEPS = ["paid", "preparing", "shipping", "delivered"];
// 손님에게 보여 줄 주문(결제창에서 이탈했거나 실패한 주문은 제외)
const VISIBLE_STATUSES = ["awaiting_deposit", "paid", "preparing", "shipping", "delivered", "canceling", "canceled", "refunded"];

function statusBadge(s) {
  const tone = ["canceled", "refunded", "failed"].includes(s) ? "is-gray" : s === "delivered" ? "is-dark" : s === "awaiting_deposit" ? "is-red" : "is-blue";
  return `<span class="badge ${tone}">${ORDER_STATUS[s] || s}</span>`;
}

// 주문 당시 저장해 둔 상품 정보로 그린다 (상품이 수정·숨김되어도 주문 내역은 그대로)
function orderItemHTML(i, extra = "") {
  const pseudo = { cat: i.cat || "top", type: i.type, color: i.color, name: i.name, images: i.image ? [i.image] : [] };
  return `
    <div class="line">
      <div class="line__thumb">${productThumb(pseudo)}</div>
      <div>
        <p class="line__brand">${esc(i.brand)}</p>
        <p class="line__name">${esc(i.name)}</p>
        <p class="line__opt">옵션: ${esc(i.size)} / ${i.qty}개</p>
        <p class="line__price">${won(i.unit_price * i.qty)}</p>
      </div>
      <div class="line__extra">${extra}</div>
    </div>`;
}

function stepsHTML(status) {
  if (!SHIP_STEPS.includes(status)) return "";
  const at = SHIP_STEPS.indexOf(status);
  return `<ol class="steps">${SHIP_STEPS.map((s, k) => `<li class="${k <= at ? "is-done" : ""} ${k === at ? "is-now" : ""}">${ORDER_STATUS[s]}</li>`).join("")}</ol>`;
}

function paymentRows(o) {
  const info = o.payment_info || {};
  const rows = [`<div><dt>결제 수단</dt><dd>${esc(o.method || "-")}</dd></div>`];
  const v = info.virtualAccount;
  if (v && o.status === "awaiting_deposit") {
    rows.push(`<div><dt>입금 계좌</dt><dd>${esc(v.bank)} ${esc(v.accountNumber)}</dd></div>`);
    rows.push(`<div><dt>입금 기한</dt><dd>${fmtDate(v.dueDate, true)}까지</dd></div>`);
  }
  if (info.receiptUrl) rows.push(`<div><dt>영수증</dt><dd><a href="${esc(info.receiptUrl)}" target="_blank" rel="noopener" style="text-decoration:underline">보기</a></dd></div>`);
  return rows.join("");
}

// opts.itemExtra(item) → 상품 줄 오른쪽에 붙일 버튼 등 / opts.actions → 아래 버튼 영역
function orderDetailHTML(o, opts = {}) {
  const items = o.items || o.order_items || [];
  return `
    <div class="order-detail">
      <div class="order-detail__head">
        <div><p class="order-detail__id">주문번호 ${esc(o.order_id)}</p><p class="order-detail__date">${fmtDate(o.created_at, true)} 주문</p></div>
        ${statusBadge(o.status)}
      </div>
      ${stepsHTML(o.status)}
      ${o.tracking_no ? `<p class="order-detail__track">송장번호 <b>${esc(o.tracking_company)} ${esc(o.tracking_no)}</b></p>` : ""}
      ${["canceled", "refunded"].includes(o.status) ? `<p class="order-detail__track">취소 사유: ${esc(o.cancel_reason || "-")} · ${fmtDate(o.canceled_at, true)}</p>` : ""}
      <h3 class="sub-title">주문 상품</h3>
      ${items.map((i) => orderItemHTML(i, opts.itemExtra ? opts.itemExtra(i) : "")).join("")}
      <h3 class="sub-title">배송 정보</h3>
      <dl class="kv">
        <div><dt>받는 분</dt><dd>${esc(o.buyer_name)}</dd></div>
        <div><dt>연락처</dt><dd>${esc(o.buyer_phone)}</dd></div>
        <div><dt>주소</dt><dd>${esc(o.address)}</dd></div>
        ${o.ship_memo ? `<div><dt>메모</dt><dd>${esc(o.ship_memo)}</dd></div>` : ""}
      </dl>
      <h3 class="sub-title">결제 정보</h3>
      <dl class="kv">
        <div><dt>상품 금액</dt><dd>${won(o.items_amount)}</dd></div>
        <div><dt>배송비</dt><dd>${o.ship_fee ? won(o.ship_fee) : "무료"}</dd></div>
        <div><dt>총 결제 금액</dt><dd><b>${won(o.amount)}</b></dd></div>
        ${paymentRows(o)}
      </dl>
      ${opts.actions ? `<div class="order-detail__actions">${opts.actions}</div>` : ""}
    </div>`;
}
