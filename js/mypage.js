/* 마이페이지: 주문 내역 · 주문 상세(취소 · 후기 작성) · 찜 · 내 후기 · 배송지 · 내 정보 */

const my = document.getElementById("myMain");

async function route() {
  const [tab, arg] = (location.hash.slice(1) || "orders").split("/");
  document.querySelectorAll("#sideNav a").forEach((a) => a.classList.toggle("is-active", a.dataset.tab === (tab === "order" ? "orders" : tab)));
  my.innerHTML = `<p class="empty">불러오는 중…</p>`;
  const views = { orders: viewOrders, order: viewOrder, wishes: viewWishes, reviews: viewReviews, addresses: viewAddresses, profile: viewProfile };
  await (views[tab] || viewOrders)(arg);
  window.scrollTo(0, 0);
}

/* ---------- 주문 내역 ---------- */
async function viewOrders() {
  const { data, error } = await sb.from("orders").select("*, order_items(*)")
    .in("status", VISIBLE_STATUSES).order("created_at", { ascending: false });
  if (error) { my.innerHTML = `<p class="empty">${friendlyError(error)}</p>`; return; }
  my.innerHTML = `<h2 class="section-title">주문 내역</h2>` + (data.length
    ? data.map((o) => `
      <a class="order-card" href="#order/${esc(o.order_id)}">
        <div class="order-card__head"><span>${fmtDate(o.created_at)} · ${esc(o.order_id)}</span>${statusBadge(o.status)}</div>
        <div class="order-card__body">
          <div class="line__thumb">${productThumb({ cat: o.order_items[0]?.cat || "top", type: o.order_items[0]?.type, color: o.order_items[0]?.color, name: o.order_name, images: o.order_items[0]?.image ? [o.order_items[0].image] : [] })}</div>
          <div><p class="line__name">${esc(o.order_name)}</p><p class="line__price">${won(o.amount)}</p>
          ${o.tracking_no ? `<p class="line__opt">송장 ${esc(o.tracking_company)} ${esc(o.tracking_no)}</p>` : ""}</div>
          <span class="order-card__more">상세 ›</span>
        </div>
      </a>`).join("")
    : `<p class="empty">아직 주문 내역이 없습니다.<br><a href="top.html" style="text-decoration:underline">쇼핑하러 가기</a></p>`);
}

/* ---------- 주문 상세 ---------- */
async function viewOrder(orderId) {
  const { data: o } = await sb.from("orders").select("*, order_items(*)").eq("order_id", orderId).maybeSingle();
  if (!o) { my.innerHTML = `<p class="empty">주문을 찾을 수 없습니다.</p>`; return; }
  let reviewed = new Set();
  if (o.status === "delivered") {
    const { data: rv } = await sb.from("reviews").select("order_item_id").in("order_item_id", o.order_items.map((i) => i.id));
    reviewed = new Set((rv || []).map((r) => r.order_item_id));
  }
  const canCancel = ["paid", "awaiting_deposit"].includes(o.status);
  my.innerHTML = `
    <p><a href="#orders" class="link">‹ 주문 내역</a></p>
    ${orderDetailHTML(o, {
      // 배송 완료된 상품만 후기 작성 버튼 (주문 상품당 1개)
      itemExtra: (i) => o.status !== "delivered" || !i.product_id ? "" : reviewed.has(i.id)
        ? `<span class="badge is-gray">후기 작성 완료</span>`
        : `<button type="button" class="btn btn--sm" data-review="${i.id}">후기 작성</button>`,
      actions: canCancel ? `<button type="button" class="btn" id="cancelBtn">주문 취소</button><p class="notice">배송 준비 전까지 직접 취소할 수 있으며, 결제는 자동으로 취소됩니다.</p>`
        : ["preparing", "shipping"].includes(o.status) ? `<p class="notice">배송 준비가 시작되어 직접 취소할 수 없습니다. 고객센터로 문의해 주세요.</p>` : "",
    })}`;

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) cancelBtn.onclick = async () => {
    if (!confirm("주문을 취소할까요? 결제가 취소되고 되돌릴 수 없습니다.")) return;
    cancelBtn.disabled = true;
    cancelBtn.textContent = "취소 처리 중…";
    const res = await callFn("order-cancel", { orderId: o.order_id, reason: "고객 직접 취소" });
    if (!res.ok) { alert(res.message || "취소하지 못했습니다."); cancelBtn.disabled = false; cancelBtn.textContent = "주문 취소"; return; }
    toast("주문이 취소되었습니다. 결제도 함께 취소되었습니다.");
    route();
  };
  my.querySelectorAll("[data-review]").forEach((b) => (b.onclick = () => openReviewForm(o.order_items.find((i) => i.id === b.dataset.review))));
}

/* ---------- 후기 작성 ---------- */
function openReviewForm(item) {
  let modal = document.getElementById("modal");
  if (!modal) { modal = document.createElement("div"); modal.id = "modal"; modal.className = "modal"; document.body.appendChild(modal); }
  let rating = 5;
  modal.innerHTML = `
    <div class="modal__dim" data-close></div>
    <div class="modal__panel modal__panel--form" role="dialog" aria-modal="true" aria-label="후기 작성">
      <button type="button" class="modal__close" data-close aria-label="닫기">&times;</button>
      <form id="reviewForm" class="form-box" style="border:0">
        <h2 class="section-title">후기 작성</h2>
        <p class="line__name">${esc(item.brand)} · ${esc(item.name)} (${esc(item.size)})</p>
        <p class="opt-label">별점</p>
        <div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="is-on" aria-label="${n}점">★</button>`).join("")}</div>
        <p class="opt-label">내용</p>
        <textarea id="rvText" rows="5" placeholder="사이즈, 착용감, 색감 등 다른 손님에게 도움이 되는 후기를 남겨 주세요. (5자 이상)" maxlength="2000"></textarea>
        <p class="opt-label">사진 (선택, 최대 5장)</p>
        <input type="file" id="rvPhotos" accept="image/*" multiple>
        <button type="submit" class="btn btn--dark" style="width:100%;margin-top:16px">등록하기</button>
        <p class="msg" id="rvMsg"></p>
      </form>
    </div>`;
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
  const close = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };
  modal.onclick = (e) => {
    if (e.target.closest("[data-close]")) close();
    const s = e.target.closest("[data-star]");
    if (s) { rating = +s.dataset.star; modal.querySelectorAll("[data-star]").forEach((b) => b.classList.toggle("is-on", +b.dataset.star <= rating)); }
  };
  document.getElementById("reviewForm").onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById("rvMsg");
    const content = document.getElementById("rvText").value.trim();
    if (content.length < 5) { msg.textContent = "후기 내용을 5자 이상 입력해 주세요."; return; }
    const files = [...document.getElementById("rvPhotos").files].slice(0, 5);
    e.target.querySelector("[type=submit]").disabled = true;
    msg.textContent = files.length ? "사진을 올리는 중…" : "";
    const photos = [];
    for (const f of files) {
      const path = `${Auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
      const { error } = await sb.storage.from("review-photos").upload(path, f, { contentType: f.type });
      if (error) { msg.textContent = "사진 업로드 실패: 5MB 이하 이미지만 올릴 수 있습니다."; e.target.querySelector("[type=submit]").disabled = false; return; }
      photos.push(sb.storage.from("review-photos").getPublicUrl(path).data.publicUrl);
    }
    const { error } = await sb.from("reviews").insert({ order_item_id: item.id, product_id: item.product_id, rating, content, photos });
    if (error) { msg.textContent = error.code === "23505" ? "이미 후기를 작성한 상품입니다." : friendlyError(error); e.target.querySelector("[type=submit]").disabled = false; return; }
    close();
    toast("후기를 등록했습니다. 감사합니다!");
    route();
  };
}

/* ---------- 찜 ---------- */
async function viewWishes() {
  const list = PRODUCTS.filter((p) => Wish.has(p.id));
  my.innerHTML = `<h2 class="section-title">찜한 상품 <span class="count">${list.length}</span></h2>` +
    (list.length ? `<ul class="grid grid--narrow" id="wishGrid">${list.map((p) => cardHTML(p)).join("")}</ul>`
      : `<p class="empty">찜한 상품이 없습니다. 상품의 하트를 눌러 담아 보세요.</p>`);
  const g = document.getElementById("wishGrid");
  if (g) bindGrid(g, () => setTimeout(viewWishes, 300));
}

/* ---------- 내 후기 ---------- */
async function viewReviews() {
  const { data } = await sb.from("reviews").select("*").eq("user_id", Auth.user.id).order("created_at", { ascending: false });
  const list = data || [];
  my.innerHTML = `<h2 class="section-title">내 후기 <span class="count">${list.length}</span></h2>
    <p class="notice" style="margin:-6px 0 12px">배송 완료된 주문의 상세 화면에서 후기를 작성할 수 있습니다.</p>` +
    (list.length ? list.map((r) => {
      const p = findProduct(r.product_id);
      return `<article class="review">
        <div class="review__top">${starsHTML(r.rating)}<span>${fmtDate(r.created_at)}</span>${r.hidden ? `<span class="badge is-gray">관리자 숨김</span>` : ""}</div>
        <p class="review__size">${esc(p ? p.brand + " · " + p.name : "판매 종료 상품")} · 구매 사이즈 ${esc(r.size)}</p>
        <p class="review__text">${esc(r.content)}</p>
        ${r.photos.length ? `<div class="review__photos">${r.photos.map((u) => `<img src="${esc(u)}" alt="후기 사진">`).join("")}</div>` : ""}
        <button type="button" class="link" data-del-review="${r.id}">삭제</button>
      </article>`;
    }).join("") : `<p class="empty">작성한 후기가 없습니다.</p>`);
  my.querySelectorAll("[data-del-review]").forEach((b) => (b.onclick = async () => {
    if (!confirm("후기를 삭제할까요?")) return;
    await sb.from("reviews").delete().eq("id", b.dataset.delReview);
    viewReviews();
  }));
}

/* ---------- 배송지 ---------- */
async function viewAddresses() {
  const { data } = await sb.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  const list = data || [];
  my.innerHTML = `<h2 class="section-title">배송지 관리</h2>
    ${list.map((a) => `
      <div class="addr">
        <div><p><b>${esc(a.label || a.recipient)}</b> ${a.is_default ? `<span class="badge is-dark">기본</span>` : ""}</p>
        <p>${esc(a.recipient)} · ${esc(a.phone)}</p><p class="line__opt">${esc(a.address)}</p></div>
        <div class="addr__btns">
          ${a.is_default ? "" : `<button type="button" class="link" data-default="${a.id}">기본으로</button>`}
          <button type="button" class="link" data-del-addr="${a.id}">삭제</button>
        </div>
      </div>`).join("") || `<p class="empty" style="padding:30px 0">저장된 배송지가 없습니다.</p>`}
    <form class="form-box" id="addrForm">
      <h3 class="sub-title" style="margin-top:0">새 배송지 추가</h3>
      <div class="field"><label for="aLabel">배송지 이름</label><input id="aLabel" placeholder="예: 집, 회사"></div>
      <div class="field"><label for="aName">받는 분</label><input id="aName" required value="${esc(Auth.profile?.name || "")}"></div>
      <div class="field"><label for="aPhone">연락처</label><input id="aPhone" inputmode="numeric" required value="${esc(Auth.profile?.phone || "")}"></div>
      <div class="field"><label for="aAddr">주소</label><input id="aAddr" required></div>
      <div class="field"><span></span><label class="check"><input type="checkbox" id="aDefault" ${list.length ? "" : "checked"}> 기본 배송지로 설정</label></div>
      <button class="btn btn--dark" type="submit">추가하기</button>
      <p class="msg" id="aMsg"></p>
    </form>`;
  const clearDefault = () => sb.from("addresses").update({ is_default: false }).eq("user_id", Auth.user.id);
  document.getElementById("addrForm").onsubmit = async (e) => {
    e.preventDefault();
    const isDefault = document.getElementById("aDefault").checked;
    if (isDefault) await clearDefault();
    const { error } = await sb.from("addresses").insert({
      label: document.getElementById("aLabel").value.trim(),
      recipient: document.getElementById("aName").value.trim(),
      phone: document.getElementById("aPhone").value.replace(/\D/g, ""),
      address: document.getElementById("aAddr").value.trim(),
      is_default: isDefault,
    });
    if (error) { document.getElementById("aMsg").textContent = friendlyError(error); return; }
    toast("배송지를 추가했습니다.");
    viewAddresses();
  };
  my.querySelectorAll("[data-default]").forEach((b) => (b.onclick = async () => {
    await clearDefault();
    await sb.from("addresses").update({ is_default: true }).eq("id", b.dataset.default);
    viewAddresses();
  }));
  my.querySelectorAll("[data-del-addr]").forEach((b) => (b.onclick = async () => {
    if (!confirm("배송지를 삭제할까요?")) return;
    await sb.from("addresses").delete().eq("id", b.dataset.delAddr);
    viewAddresses();
  }));
}

/* ---------- 내 정보 ---------- */
async function viewProfile() {
  const pr = Auth.profile || {};
  const social = (Auth.user.app_metadata?.provider || "email") !== "email";
  my.innerHTML = `<h2 class="section-title">내 정보</h2>
    <form class="form-box" id="profileForm">
      <div class="field"><label>이메일</label><input value="${esc(Auth.user.email || "")}" disabled></div>
      <div class="field"><label for="pName">이름</label><input id="pName" value="${esc(pr.name || "")}" required></div>
      <div class="field"><label for="pPhone">휴대폰 번호</label><input id="pPhone" inputmode="numeric" value="${esc(pr.phone || "")}"></div>
      <button class="btn btn--dark" type="submit">저장</button>
      <p class="msg" id="pMsg"></p>
    </form>
    ${social ? "" : `
    <form class="form-box" id="pwForm">
      <h3 class="sub-title" style="margin-top:0">비밀번호 변경</h3>
      <div class="field"><label for="pPw">새 비밀번호</label><input id="pPw" type="password" autocomplete="new-password" placeholder="6자 이상" required></div>
      <button class="btn" type="submit">변경</button>
      <p class="msg" id="pwMsg"></p>
    </form>`}
    <button type="button" class="link" data-logout style="margin-top:12px">로그아웃</button>`;
  document.getElementById("profileForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("pName").value.trim();
    const phone = document.getElementById("pPhone").value.replace(/\D/g, "");
    const { error } = await sb.from("profiles").update({ name, phone }).eq("id", Auth.user.id);
    if (error) { document.getElementById("pMsg").textContent = friendlyError(error); return; }
    Object.assign(Auth.profile, { name, phone });
    document.getElementById("hello").textContent = `${name || "회원"}님`;
    toast("저장했습니다.");
  };
  const pw = document.getElementById("pwForm");
  if (pw) pw.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: document.getElementById("pPw").value });
    if (error) { document.getElementById("pwMsg").textContent = friendlyError(error); return; }
    e.target.reset();
    toast("비밀번호를 변경했습니다.");
  };
  my.querySelector("[data-logout]").onclick = () => Auth.signOut();
}

Shop.ready.then(() => {
  if (!requireLogin()) return;
  document.getElementById("hello").textContent = `${Auth.profile?.name || "회원"}님`;
  window.addEventListener("hashchange", route);
  route();
});
