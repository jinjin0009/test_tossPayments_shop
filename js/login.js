/* 로그인 · 회원가입 · 비밀번호 찾기 · 소셜 로그인 */

const params = new URLSearchParams(location.search);
// 로그인 후 돌아갈 페이지 (같은 사이트 안의 페이지만 허용)
const nextPage = /^[a-z0-9-]+\.html([?#].*)?$/i.test(params.get("next") || "") ? params.get("next") : "top.html";
const here = (q) => new URL("login.html" + (q || ""), location.href).href;

function showMode(mode) {
  document.querySelectorAll("[data-panel]").forEach((f) => (f.hidden = f.dataset.panel !== mode));
  document.querySelectorAll("#authTabs .tab").forEach((t) => t.classList.toggle("is-active", t.dataset.mode === mode));
  document.getElementById("authTabs").hidden = mode === "newpw";
  document.getElementById("social").hidden = mode === "reset" || mode === "newpw";
}

document.addEventListener("click", (e) => {
  const m = e.target.closest("[data-mode]");
  if (m) showMode(m.dataset.mode);
});

// 메일 링크(비밀번호 재설정)로 들어오면 새 비밀번호 입력 화면
let recovering = location.hash.includes("type=recovery");
sb.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") { recovering = true; showMode("newpw"); }
});

const busy = (form, on) => form.querySelectorAll("button, input").forEach((el) => (el.disabled = on));

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("liMsg");
  busy(e.target, true);
  const { error } = await sb.auth.signInWithPassword({
    email: document.getElementById("liEmail").value.trim(),
    password: document.getElementById("liPw").value,
  });
  busy(e.target, false);
  if (error) { msg.textContent = friendlyError(error); return; }
  location.href = nextPage;
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("suMsg");
  const name = document.getElementById("suName").value.trim();
  if (!name) { msg.textContent = "이름을 입력해 주세요."; return; }
  busy(e.target, true);
  const { data, error } = await sb.auth.signUp({
    email: document.getElementById("suEmail").value.trim(),
    password: document.getElementById("suPw").value,
    options: {
      data: { name, phone: document.getElementById("suPhone").value.replace(/\D/g, "") },
      emailRedirectTo: here("?next=" + encodeURIComponent(nextPage)),
    },
  });
  busy(e.target, false);
  if (error) { msg.textContent = friendlyError(error); return; }
  if (data.session) { location.href = nextPage; return; }
  // 이메일 인증이 켜져 있으면 메일 확인 후 로그인
  msg.style.color = "#000";
  msg.textContent = "가입 확인 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다.";
});

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("rsMsg");
  busy(e.target, true);
  const { error } = await sb.auth.resetPasswordForEmail(document.getElementById("rsEmail").value.trim(), { redirectTo: here() });
  busy(e.target, false);
  if (error) { msg.textContent = friendlyError(error); return; }
  msg.style.color = "#000";
  msg.textContent = "메일을 보냈습니다. 메일의 링크를 눌러 새 비밀번호를 정해 주세요.";
});

document.getElementById("newPwForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("npMsg");
  busy(e.target, true);
  const { error } = await sb.auth.updateUser({ password: document.getElementById("npPw").value });
  busy(e.target, false);
  if (error) { msg.textContent = friendlyError(error); return; }
  toast("비밀번호를 변경했습니다.");
  setTimeout(() => (location.href = "mypage.html"), 800);
});

document.getElementById("social").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-provider]");
  if (!b) return;
  // 운영자가 Supabase 에서 해당 로그인을 켜 두었는지 먼저 확인 (꺼져 있으면 오류 화면으로 넘어가지 않게)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const settings = await res.json();
    if (!settings.external || !settings.external[b.dataset.provider]) {
      document.getElementById("soMsg").textContent = `${b.textContent.replace("로 시작하기", "")} 로그인은 아직 준비 중입니다. 이메일로 가입해 주세요.`;
      return;
    }
  } catch (err) { /* 확인 실패 시 그대로 시도 */ }
  const { error } = await sb.auth.signInWithOAuth({
    provider: b.dataset.provider,
    options: { redirectTo: here("?next=" + encodeURIComponent(nextPage)) },
  });
  if (error) document.getElementById("soMsg").textContent = friendlyError(error);
});

Shop.ready.then(() => {
  if (params.get("mode") === "signup") showMode("signup");
  if (recovering) { showMode("newpw"); return; }
  // 이미 로그인 상태(소셜 로그인·메일 인증 후 돌아온 경우 포함)면 원래 페이지로
  if (Auth.user) location.replace(nextPage);
});
