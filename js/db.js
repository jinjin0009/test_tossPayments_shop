/* Supabase 연결 · 로그인 상태 (모든 페이지 공용, products.js 보다 먼저 로드) */

// 공개용 주소와 키 (손님 화면에 노출돼도 되는 값. 실제 권한은 DB 접근 규칙이 막는다)
const SUPABASE_URL = "https://xkdgxkltowytzpzkkefl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZGd4a2x0b3d5dHpwemtrZWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTczMTAsImV4cCI6MjEwODAzMzMxMH0.nidXzObobIF06Jc0IGQaLfIbyF_ixvlCtFqVrrLJyVI";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const Auth = {
  user: null,
  profile: null,
  async init() {
    try {
      const { data } = await sb.auth.getSession();
      this.user = data.session?.user ?? null;
      if (this.user) await this.loadProfile();
    } catch (e) { this.user = null; }
  },
  async loadProfile() {
    const { data } = await sb.from("profiles").select("*").eq("id", this.user.id).maybeSingle();
    this.profile = data;
  },
  isAdmin() { return !!this.profile?.is_admin; },
  async signOut() {
    await sb.auth.signOut();
    Store.write("shop_cart", []);
    Store.write("shop_cart_owner", null);
    location.href = "top.html";
  },
};

// 로그인 필요 페이지에서 사용: 로그인 안 했으면 로그인 화면으로 보냄
function requireLogin() {
  if (Auth.user) return true;
  location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
  return false;
}

// 결제·취소 서버 기능 호출. 성공/실패와 상관없이 응답 본문(JSON)을 돌려준다
async function callFn(name, body) {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_KEY;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + token },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, code: "NETWORK", message: "서버에 연결하지 못했습니다. 네트워크를 확인해 주세요." };
  }
}

// DB 오류 메시지를 손님용 문장으로
function friendlyError(err) {
  const m = (err && (err.message || err)) + "";
  if (m.startsWith("OUT_OF_STOCK")) return "재고가 부족한 상품이 있습니다" + (m.split(":")[1] ? ": " + m.split(":")[1] : "") + ". 수량을 줄이거나 다른 사이즈를 선택해 주세요.";
  if (m.includes("PRODUCT_UNAVAILABLE")) return "판매가 중단된 상품이 포함되어 있습니다. 장바구니를 확인해 주세요.";
  if (m.includes("INVALID_BUYER")) return "주문자 이름, 휴대폰 번호, 배송지를 정확히 입력해 주세요.";
  if (m.includes("EMPTY_ITEMS")) return "주문할 상품이 없습니다.";
  if (m.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않습니다.";
  if (m.includes("Email not confirmed")) return "이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해 주세요.";
  if (m.includes("User already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (m.includes("Password should be")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (m.includes("rate limit")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (m.includes("provider is not enabled")) return "이 로그인 방식은 아직 준비 중입니다. 이메일로 로그인해 주세요.";
  if (m.includes("Failed to fetch")) return "서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.";
  return "처리 중 문제가 발생했습니다. (" + m + ")";
}
