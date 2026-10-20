/* 공통 레이아웃(헤더·장바구니 드로어·토스트) + 카테고리 페이지 렌더링 */

const page = document.body.dataset.page; // top | shoes | pants | checkout | success | fail

/* ---------- 헤더 ---------- */
function renderHeader() {
  const nav = Object.entries(CATEGORIES)
    .map(([key, c]) => `<a href="${c.file}" class="${key === page ? "is-active" : ""}">${c.label}</a>`)
    .join("");
  document.getElementById("gnb").innerHTML = `
    <div class="gnb__top">
      <a class="logo" href="top.html">WEAR.LAB</a>
      <form class="search" id="searchForm" role="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="searchInput" type="search" placeholder="브랜드, 상품명 검색" autocomplete="off">
      </form>
      <div class="gnb__util">
        <a class="hide-sm" href="#">로그인</a>
        <a class="hide-sm" href="#">마이페이지</a>
        <button class="cart-btn" type="button" id="cartOpen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M5 7h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>
          <span class="cart-badge" id="cartBadge">0</span>
        </button>
      </div>
    </div>
    <nav class="gnb__nav">${nav}<a href="#">브랜드</a><a href="#">랭킹</a><a href="#">세일</a></nav>`;
}

function renderBadge() {
  const el = document.getElementById("cartBadge");
  if (el) el.textContent = Cart.count();
}

/* ---------- 토스트 ---------- */
let toastTimer;
function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = text;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 1800);
}

/* ---------- 장바구니 드로어 ---------- */
function renderDrawer() {
  let drawer = document.getElementById("drawer");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.className = "drawer";
    drawer.id = "drawer";
    drawer.innerHTML = `
      <div class="drawer__dim" data-close></div>
      <aside class="drawer__panel" aria-label="장바구니">
        <div class="drawer__head"><h2>장바구니</h2><button type="button" data-close aria-label="닫기" style="font-size:24px">&times;</button></div>
        <div class="drawer__list" id="drawerList"></div>
        <div class="drawer__foot">
          <div class="sum"><span>총 결제 예정 금액</span><strong id="drawerTotal">0원</strong></div>
          <a class="btn btn--dark" id="drawerOrder" href="checkout.html">주문하기</a>
        </div>
      </aside>`;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) drawer.classList.remove("is-open");
      const line = e.target.closest("[data-idx]");
      if (!line) return;
      const idx = +line.dataset.idx;
      const items = Cart.items();
      if (e.target.closest("[data-del]")) Cart.remove(idx);
      if (e.target.closest("[data-minus]")) Cart.setQty(idx, items[idx].qty - 1);
      if (e.target.closest("[data-plus]")) Cart.setQty(idx, items[idx].qty + 1);
    });
  }
  const items = Cart.items();
  document.getElementById("drawerList").innerHTML = items.length
    ? items.map((i, idx) => lineHTML(i, idx, true)).join("")
    : `<p class="empty">장바구니에 담긴 상품이 없습니다.</p>`;
  document.getElementById("drawerTotal").textContent = won(Cart.total(items));
  const order = document.getElementById("drawerOrder");
  order.style.pointerEvents = items.length ? "" : "none";
  order.style.opacity = items.length ? "" : ".4";
}

function lineHTML(item, idx, editable) {
  const p = findProduct(item.id);
  return `
    <div class="line" data-idx="${idx}">
      <div class="line__thumb">${productSVG(p)}</div>
      <div>
        <p class="line__brand">${p.brand}</p>
        <p class="line__name">${p.name}</p>
        <p class="line__opt">옵션: ${item.size} / ${item.qty}개</p>
        ${editable ? `<div class="qty"><button type="button" data-minus aria-label="수량 감소">−</button><span>${item.qty}</span><button type="button" data-plus aria-label="수량 증가">+</button></div>` : ""}
        <p class="line__price">${won(salePrice(p) * item.qty)}</p>
      </div>
      ${editable ? `<button type="button" class="line__del" data-del>삭제</button>` : "<span></span>"}
    </div>`;
}

/* ---------- 카테고리 페이지 ---------- */
const state = { filter: "전체", sort: "rank", keyword: "" };

function renderCategory() {
  const cat = CATEGORIES[page];
  document.title = `${cat.title} | WEAR.LAB`;
  const main = document.getElementById("main");
  main.innerHTML = `
    <div class="container">
      <div class="banner"><small>${cat.sub} · WEEKLY PICK</small><strong>${cat.copy.replace("\n", "<br>")}</strong></div>
      <div class="page-head"><h1>${cat.title}</h1><span class="count" id="count"></span></div>
      <div class="toolbar">
        <div class="chips" id="chips">${cat.filters.map((f) => `<button type="button" class="chip ${f === state.filter ? "is-active" : ""}" data-filter="${f}">${f}</button>`).join("")}</div>
        <label class="sort"><select id="sort" aria-label="정렬">
          <option value="rank">추천순</option>
          <option value="sale">할인율순</option>
          <option value="low">낮은 가격순</option>
          <option value="high">높은 가격순</option>
          <option value="review">후기순</option>
        </select></label>
      </div>
      <ul class="grid" id="grid"></ul>
    </div>
    <footer class="footer"><div class="container">WEAR.LAB · 퍼블리싱 데모 페이지 · 토스페이먼츠 테스트 결제 연동<br>실제 결제가 이루어지지 않는 테스트 환경입니다.</div></footer>`;
  document.getElementById("chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    state.filter = b.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
    renderGrid();
  });
  document.getElementById("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  document.getElementById("grid").addEventListener("click", (e) => {
    const like = e.target.closest(".like");
    if (like) { e.stopPropagation(); like.classList.toggle("is-on"); return; }
    const card = e.target.closest("[data-id]");
    if (card) openModal(card.dataset.id);
  });
  renderGrid();
}

function renderGrid() {
  const kw = state.keyword.trim().toLowerCase();
  // 랭킹은 좋아요 수 기준으로 고정
  const ranked = PRODUCTS.filter((p) => p.cat === page).sort((a, b) => b.likes - a.likes);
  const rankOf = new Map(ranked.map((p, i) => [p.id, i + 1]));
  let list = ranked.filter((p) =>
    (state.filter === "전체" || p.type === state.filter) &&
    (!kw || (p.brand + " " + p.name).toLowerCase().includes(kw)));
  const sorters = {
    rank: () => 0,
    sale: (a, b) => b.sale - a.sale,
    low: (a, b) => salePrice(a) - salePrice(b),
    high: (a, b) => salePrice(b) - salePrice(a),
    review: (a, b) => b.reviews - a.reviews,
  };
  list = [...list].sort(sorters[state.sort]);
  document.getElementById("count").textContent = `${list.length}개 상품`;
  document.getElementById("grid").innerHTML = list.length
    ? list.map((p) => `
      <li class="card" data-id="${p.id}" tabindex="0">
        <div class="card__thumb">
          ${productSVG(p)}
          <span class="card__rank">${rankOf.get(p.id)}</span>
          <button type="button" class="like" aria-label="좋아요"><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1Z"/></svg></button>
        </div>
        <div class="card__info">
          <p class="card__brand">${p.brand}</p>
          <p class="card__name">${p.name}</p>
          <p class="card__price">${p.sale ? `<span class="sale">${p.sale}%</span>` : ""}${won(salePrice(p))}</p>
          <p class="card__meta"><span>♥ ${compact(p.likes)}</span><span>★ ${p.rating} (${compact(p.reviews)})</span></p>
          ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
        </div>
      </li>`).join("")
    : `<li class="empty">조건에 맞는 상품이 없습니다.</li>`;
}

/* ---------- 상품 상세 모달 ---------- */
function openModal(id) {
  const p = findProduct(id);
  const sizes = CATEGORIES[p.cat].sizes;
  const sel = { size: null, qty: 1 };
  let modal = document.getElementById("modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal__dim" data-close></div>
    <div class="modal__panel" role="dialog" aria-modal="true" aria-label="${p.name}">
      <button type="button" class="modal__close" data-close aria-label="닫기">&times;</button>
      <div class="modal__thumb">${productSVG(p)}</div>
      <div class="modal__body">
        <a class="modal__brand" href="#">${p.brand} ›</a>
        <h2 class="modal__name">${p.name}</h2>
        ${p.sale ? `<p class="modal__origin">${won(p.price)}</p>` : `<p style="margin-top:14px"></p>`}
        <p class="modal__price">${p.sale ? `<span class="sale">${p.sale}%</span>` : ""}${won(salePrice(p))}</p>
        <p class="card__meta" style="margin-top:8px">★ ${p.rating} · 후기 ${p.reviews.toLocaleString()}개 · ♥ ${p.likes.toLocaleString()}</p>
        <p class="opt-label">사이즈</p>
        <div class="sizes">${sizes.map((s) => `<button type="button" class="size" data-size="${s}">${s}</button>`).join("")}</div>
        <p class="opt-label">수량</p>
        <div class="qty"><button type="button" data-q="-1" aria-label="수량 감소">−</button><span id="mQty">1</span><button type="button" data-q="1" aria-label="수량 증가">+</button></div>
        <p class="msg" id="mMsg"></p>
        <div class="modal__total"><span>총 상품 금액</span><strong id="mTotal">${won(salePrice(p))}</strong></div>
        <div class="btn-row">
          <button type="button" class="btn" id="mCart">장바구니</button>
          <button type="button" class="btn btn--dark" id="mBuy">구매하기</button>
        </div>
      </div>
    </div>`;
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";

  const close = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };
  const needSize = () => { if (sel.size) return true; document.getElementById("mMsg").textContent = "사이즈를 선택해 주세요."; return false; };

  modal.onclick = (e) => {
    if (e.target.closest("[data-close]")) return close();
    const s = e.target.closest("[data-size]");
    if (s) {
      sel.size = s.dataset.size;
      modal.querySelectorAll(".size").forEach((b) => b.classList.toggle("is-active", b === s));
      document.getElementById("mMsg").textContent = "";
    }
    const q = e.target.closest("[data-q]");
    if (q) {
      sel.qty = Math.max(1, Math.min(10, sel.qty + +q.dataset.q));
      document.getElementById("mQty").textContent = sel.qty;
      document.getElementById("mTotal").textContent = won(salePrice(p) * sel.qty);
    }
    if (e.target.closest("#mCart") && needSize()) {
      Cart.add(p.id, sel.size, sel.qty);
      close();
      toast("장바구니에 담았습니다.");
    }
    if (e.target.closest("#mBuy") && needSize()) {
      // 바로구매: 장바구니와 별도로 저장 후 주문서로 이동
      Store.write("shop_direct", [{ id: p.id, size: sel.size, qty: sel.qty }]);
      location.href = "checkout.html?mode=direct";
    }
  };
}

/* ---------- 초기화 ---------- */
renderHeader();
renderBadge();
document.addEventListener("cart:change", () => { renderBadge(); if (document.getElementById("drawer")) renderDrawer(); });
document.getElementById("cartOpen").addEventListener("click", () => { renderDrawer(); document.getElementById("drawer").classList.add("is-open"); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal.is-open, .drawer.is-open").forEach((el) => { el.classList.remove("is-open"); document.body.style.overflow = ""; });
  if (e.key === "Enter" && e.target.matches(".card")) openModal(e.target.dataset.id);
});
document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const kw = document.getElementById("searchInput").value;
  if (CATEGORIES[page]) { state.keyword = kw; renderGrid(); }
  else location.href = "top.html";
});

if (CATEGORIES[page]) renderCategory();
