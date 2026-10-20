/* 주문서 + 토스페이먼츠 결제위젯 연동
   가격은 서버(create_order)가 DB 가격으로 다시 계산한다. 화면에서 가격을 바꿔도 결제 금액은 바뀌지 않는다 */

// 토스페이먼츠 문서 공개용 결제위젯 테스트 클라이언트 키.
// 실제 운영 시 개발자센터(https://developers.tosspayments.com)에서 발급받은 "결제위젯 연동 키"로 교체하세요.
const TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

const SHIP_FREE_OVER = 50000;
const SHIP_FEE = 3000;

const isDirect = new URLSearchParams(location.search).get("mode") === "direct";
let items = [];
let addresses = [];

const payBtn = document.getElementById("payButton");
const payMsg = document.getElementById("payMsg");
const $ = (id) => document.getElementById(id);

function calc() {
  const origin = items.reduce((s, i) => s + findProduct(i.id).price * i.qty, 0);
  const sub = Cart.total(items);
  const ship = sub === 0 || sub >= SHIP_FREE_OVER ? 0 : SHIP_FEE;
  return { origin, discount: origin - sub, ship, total: sub + ship };
}

function renderOrder() {
  $("orderItems").innerHTML = items.length
    ? items.map((i, idx) => lineHTML(i, idx, false)).join("")
    : `<p class="empty">주문할 상품이 없습니다. <a href="top.html" style="text-decoration:underline">쇼핑하러 가기</a></p>`;
  $("itemCount").textContent = `${items.reduce((s, i) => s + i.qty, 0)}개`;
  const c = calc();
  $("sumOrigin").textContent = won(c.origin);
  $("sumDiscount").textContent = c.discount ? "-" + won(c.discount) : "0원";
  $("sumShip").textContent = c.ship ? won(c.ship) : "무료";
  $("sumTotal").textContent = won(c.total);
}

function stockProblems() {
  return items.filter((i) => stockOf(findProduct(i.id), i.size) < i.qty);
}

// 회원: 이름·연락처·이메일·기본 배송지 자동 입력 (수정 가능)
async function prefill() {
  if (!Auth.user) {
    $("memberNote").innerHTML = `<a href="login.html?next=${encodeURIComponent("checkout.html" + location.search)}" style="text-decoration:underline">로그인</a>하면 주문 정보가 자동으로 입력되고 주문 내역을 마이페이지에서 볼 수 있어요. 비회원 주문은 주문번호와 휴대폰 번호로 조회합니다.`;
    return;
  }
  const pr = Auth.profile || {};
  $("buyerName").value = pr.name || "";
  $("buyerPhone").value = pr.phone || "";
  $("buyerEmail").value = Auth.user.email || "";
  const { data } = await sb.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  addresses = data || [];
  const sel = $("addrSelect");
  if (addresses.length) {
    sel.innerHTML = addresses.map((a, i) => `<option value="${i}">${esc(a.label || a.recipient)}${a.is_default ? " (기본)" : ""} · ${esc(a.address)}</option>`).join("") + `<option value="new">새 배송지 직접 입력</option>`;
    $("addrPick").hidden = false;
    applyAddress(0);
    sel.addEventListener("change", () => (sel.value === "new" ? applyAddress(-1) : applyAddress(+sel.value)));
  } else {
    $("saveAddrRow").hidden = false;
  }
}

function applyAddress(i) {
  const a = addresses[i];
  $("buyerAddr").value = a ? a.address : "";
  if (a && a.recipient && !$("buyerName").value) $("buyerName").value = a.recipient;
  if (a && a.phone && !$("buyerPhone").value) $("buyerPhone").value = a.phone;
  $("saveAddrRow").hidden = !!a;
}

async function initPayment() {
  await Shop.ready;
  if (Shop.error) { payMsg.textContent = "상품 정보를 불러오지 못했습니다. 새로고침해 주세요."; return; }
  items = isDirect ? Store.read("shop_direct", []).filter((i) => findProduct(i.id)) : Cart.items();
  renderOrder();
  await prefill();
  if (!items.length) return;

  if (typeof TossPayments === "undefined") {
    payMsg.textContent = "결제 모듈을 불러오지 못했습니다. 네트워크를 확인해 주세요.";
    return;
  }
  if (location.protocol === "file:") {
    payMsg.textContent = "file:// 로 열면 결제가 동작하지 않습니다. 로컬 서버(serve.ps1)로 실행해 주세요.";
  }

  let { total } = calc();
  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  // 회원은 회원 고유번호로, 비회원은 익명으로 결제
  const widgets = tossPayments.widgets({ customerKey: Auth.user ? Auth.user.id : TossPayments.ANONYMOUS });

  try {
    await widgets.setAmount({ currency: "KRW", value: total });
    await Promise.all([
      widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);
  } catch (err) {
    payMsg.textContent = "결제 UI 로딩 실패: " + (err.message || err);
    return;
  }

  const bad = stockProblems();
  if (bad.length) {
    payMsg.textContent = "재고가 부족한 상품이 있습니다. 장바구니에서 수량을 조정해 주세요.";
    return;
  }
  payBtn.disabled = false;

  payBtn.addEventListener("click", async () => {
    const name = $("buyerName").value.trim();
    const phone = $("buyerPhone").value.replace(/\D/g, "");
    const email = $("buyerEmail").value.trim();
    const address = $("buyerAddr").value.trim();
    const memo = $("shipMemo").value.trim();
    if (!name || phone.length < 9) { payMsg.textContent = "주문자 이름과 휴대폰 번호를 정확히 입력해 주세요."; return; }
    if (!address) { payMsg.textContent = "배송지를 입력해 주세요."; return; }
    payMsg.textContent = "";
    payBtn.disabled = true;

    // 서버에서 주문서 생성 + 금액 계산 (재고도 한 번 더 확인)
    const { data: order, error } = await sb.rpc("create_order", {
      p_items: items.map((i) => ({ id: i.id, size: i.size, qty: i.qty })),
      p_buyer: { name, phone, email, address, memo },
      p_direct: isDirect,
    });
    if (error) { payMsg.textContent = friendlyError(error); payBtn.disabled = false; return; }

    if (order.amount !== total) {
      // 화면 금액이 서버 금액과 다르면(가격 변경 등) 서버 금액으로 결제
      total = order.amount;
      await widgets.setAmount({ currency: "KRW", value: total });
      $("sumTotal").textContent = won(total);
    }

    if (Auth.user && !$("saveAddrRow").hidden && $("saveAddr").checked) {
      await sb.from("addresses").insert({ label: "기본 배송지", recipient: name, phone, address, is_default: true });
    }
    Store.write("shop_pending_order", { orderId: order.orderId, isDirect });

    try {
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: new URL("success.html", location.href).href,
        failUrl: new URL("fail.html", location.href).href,
        customerName: name,
        customerEmail: email || undefined,
        customerMobilePhone: phone,
      });
    } catch (err) {
      // 사용자가 결제창을 닫은 경우 등
      payMsg.textContent = err.message || "결제가 취소되었습니다.";
      payBtn.disabled = false;
    }
  });
}

initPayment();
