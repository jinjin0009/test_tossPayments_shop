/* 주문서 + 토스페이먼츠 결제위젯 연동 */

// 토스페이먼츠 문서 공개용 결제위젯 테스트 클라이언트 키.
// 실제 운영 시 개발자센터(https://developers.tosspayments.com)에서 발급받은 "결제위젯 연동 키"로 교체하세요.
const TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

const SHIP_FREE_OVER = 50000;
const SHIP_FEE = 3000;

const isDirect = new URLSearchParams(location.search).get("mode") === "direct";
const items = isDirect ? Store.read("shop_direct", []).filter((i) => findProduct(i.id)) : Cart.items();

const payBtn = document.getElementById("payButton");
const payMsg = document.getElementById("payMsg");

function calc() {
  const origin = items.reduce((s, i) => s + findProduct(i.id).price * i.qty, 0);
  const sub = Cart.total(items);
  const ship = sub === 0 || sub >= SHIP_FREE_OVER ? 0 : SHIP_FEE;
  return { origin, discount: origin - sub, ship, total: sub + ship };
}

function renderOrder() {
  document.getElementById("orderItems").innerHTML = items.length
    ? items.map((i, idx) => lineHTML(i, idx, false)).join("")
    : `<p class="empty">주문할 상품이 없습니다. <a href="top.html" style="text-decoration:underline">쇼핑하러 가기</a></p>`;
  document.getElementById("itemCount").textContent = `${items.reduce((s, i) => s + i.qty, 0)}개`;
  const c = calc();
  document.getElementById("sumOrigin").textContent = won(c.origin);
  document.getElementById("sumDiscount").textContent = c.discount ? "-" + won(c.discount) : "0원";
  document.getElementById("sumShip").textContent = c.ship ? won(c.ship) : "무료";
  document.getElementById("sumTotal").textContent = won(c.total);
}

function makeOrderName() {
  const first = findProduct(items[0].id).name;
  return items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
}

function makeOrderId() {
  // 6~64자, 영문 대소문자/숫자/-/_ 만 허용
  return "ORDER_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

async function initPayment() {
  renderOrder();
  if (!items.length) return;

  if (typeof TossPayments === "undefined") {
    payMsg.textContent = "결제 모듈을 불러오지 못했습니다. 네트워크를 확인해 주세요.";
    return;
  }
  if (location.protocol === "file:") {
    payMsg.textContent = "file:// 로 열면 결제가 동작하지 않습니다. 로컬 서버(serve.ps1)로 실행해 주세요.";
  }

  const { total } = calc();
  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  const widgets = tossPayments.widgets({ customerKey: TossPayments.ANONYMOUS }); // 비회원 결제

  try {
    await widgets.setAmount({ currency: "KRW", value: total });
    await Promise.all([
      widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);
    payBtn.disabled = false;
  } catch (err) {
    payMsg.textContent = "결제 UI 로딩 실패: " + (err.message || err);
    return;
  }

  payBtn.addEventListener("click", async () => {
    const name = document.getElementById("buyerName").value.trim();
    const phone = document.getElementById("buyerPhone").value.replace(/\D/g, "");
    const email = document.getElementById("buyerEmail").value.trim();
    if (!name || !phone) { payMsg.textContent = "주문자 이름과 휴대폰 번호를 입력해 주세요."; return; }
    payMsg.textContent = "";

    const orderId = makeOrderId();
    const orderName = makeOrderName();
    // 결제 성공 페이지에서 금액 위변조 여부를 확인하기 위해 주문 정보를 저장
    Store.write("shop_pending_order", { orderId, orderName, amount: total, items, isDirect });

    try {
      await widgets.requestPayment({
        orderId,
        orderName,
        successUrl: new URL("success.html", location.href).href,
        failUrl: new URL("fail.html", location.href).href,
        customerName: name,
        customerEmail: email || undefined,
        customerMobilePhone: phone,
      });
    } catch (err) {
      // 사용자가 결제창을 닫은 경우 등
      payMsg.textContent = err.message || "결제가 취소되었습니다.";
    }
  });
}

initPayment();
