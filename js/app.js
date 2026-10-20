/* 공통 레이아웃(헤더·장바구니 드로어·토스트) + 카테고리/검색 페이지 + 상품 상세 */

const page = document.body.dataset.page; // top | shoes | pants | search | checkout | success | fail | login | mypage | lookup | admin

const ICON_HEART = `<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1Z"/></svg>`;

/* ---------- 헤더 ---------- */
function renderHeader() {
  const q = new URLSearchParams(location.search);
  const view = page === "search" ? q.get("view") : null;
  const nav = Object.entries(CATEGORIES)
    .map(([key, c]) => `<a href="${c.file}" class="${key === page ? "is-active" : ""}">${c.label}</a>`)
    .join("");
  const u = Auth.user;
  const util = u
    ? `<a class="hide-sm" href="#" data-logout>로그아웃</a>
       <a class="hide-sm" href="mypage.html">마이페이지</a>
       ${Auth.isAdmin() ? `<a class="hide-sm" href="admin.html">관리자</a>` : ""}`
    : `<a class="hide-sm" href="login.html">로그인</a>
       <a class="hide-sm" href="order-lookup.html">주문조회</a>`;
  document.getElementById("gnb").innerHTML = `
    <div class="gnb__top">
      <a class="logo" href="top.html">WEAR.LAB</a>
      <form class="search" id="searchForm" role="search" action="search.html">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="searchInput" name="q" type="search" placeholder="브랜드, 상품명 검색" autocomplete="off" value="${esc(page === "search" ? q.get("q") || "" : "")}">
      </form>
      <div class="gnb__util">
        ${util}
        <a class="user-btn" href="${u ? "mypage.html" : "login.html"}" aria-label="${u ? "마이페이지" : "로그인"}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
        </a>
        <button class="cart-btn" type="button" id="cartOpen" aria-label="장바구니">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M5 7h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>
          <span class="cart-badge" id="cartBadge">${Cart.count()}</span>
        </button>
      </div>
    </div>
    <nav class="gnb__nav">${nav}
      <a href="search.html?view=rank" class="${view === "rank" ? "is-active" : ""}">랭킹</a>
      <a href="search.html?view=sale" class="${view === "sale" ? "is-active" : ""}">세일</a>
      ${u ? "" : `<a href="order-lookup.html" class="show-sm ${page === "lookup" ? "is-active" : ""}">주문조회</a>`}
      ${Auth.isAdmin() ? `<a href="admin.html" class="show-sm">관리자</a>` : ""}
    </nav>`;
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
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2000);
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
          ${Auth.user ? "" : `<p class="notice">로그인하면 어느 기기에서나 장바구니가 유지됩니다. <a href="login.html" style="text-decoration:underline">로그인</a></p>`}
        </div>
      </aside>`;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) drawer.classList.remove("is-open");
      const line = e.target.closest("[data-idx]");
      if (!line) return;
      const idx = +line.dataset.idx;
      const items = Cart.items();
      const it = items[idx];
      if (e.target.closest("[data-del]")) Cart.remove(idx);
      if (e.target.closest("[data-minus]")) Cart.setQty(idx, it.qty - 1);
      if (e.target.closest("[data-plus]")) {
        const left = stockOf(findProduct(it.id), it.size);
        if (it.qty + 1 > left) toast(left ? `재고가 ${left}개 남아 있습니다.` : "품절된 사이즈입니다.");
        else Cart.setQty(idx, it.qty + 1);
      }
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

function stockNote(p, item) {
  const left = stockOf(p, item.size);
  if (left === 0) return `<p class="line__warn">품절된 사이즈입니다. 삭제 후 주문해 주세요.</p>`;
  if (item.qty > left) return `<p class="line__warn">재고가 ${left}개 남아 있습니다. 수량을 줄여 주세요.</p>`;
  return "";
}

function lineHTML(item, idx, editable) {
  const p = findProduct(item.id);
  return `
    <div class="line" data-idx="${idx}">
      <div class="line__thumb">${productThumb(p)}</div>
      <div>
        <p class="line__brand">${esc(p.brand)}</p>
        <p class="line__name">${esc(p.name)}</p>
        <p class="line__opt">옵션: ${esc(item.size)} / ${item.qty}개</p>
        ${editable ? `<div class="qty"><button type="button" data-minus aria-label="수량 감소">−</button><span>${item.qty}</span><button type="button" data-plus aria-label="수량 증가">+</button></div>` : ""}
        <p class="line__price">${won(salePrice(p) * item.qty)}</p>
        ${stockNote(p, item)}
      </div>
      ${editable ? `<button type="button" class="line__del" data-del>삭제</button>` : "<span></span>"}
    </div>`;
}

/* ---------- 상품 카드 ---------- */
function rankMap(list) {
  const ranked = [...list].sort((a, b) => b.score - a.score || a.sortOrder - b.sortOrder);
  return new Map(ranked.map((p, i) => [p.id, i + 1]));
}

const SORTERS = {
  rank: (a, b) => b.score - a.score || a.sortOrder - b.sortOrder,
  sale: (a, b) => b.sale - a.sale,
  low: (a, b) => salePrice(a) - salePrice(b),
  high: (a, b) => salePrice(b) - salePrice(a),
  review: (a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating,
};

const SORT_OPTIONS = `
  <option value="rank">추천순</option>
  <option value="sale">할인율순</option>
  <option value="low">낮은 가격순</option>
  <option value="high">높은 가격순</option>
  <option value="review">후기순</option>`;

function cardHTML(p, rank) {
  const soldOut = totalStock(p) === 0;
  return `
    <li class="card" data-id="${p.id}" tabindex="0">
      <div class="card__thumb">
        ${productThumb(p)}
        ${rank ? `<span class="card__rank">${rank}</span>` : ""}
        ${soldOut ? `<span class="card__soldout">품절</span>` : ""}
        <button type="button" class="like ${Wish.has(p.id) ? "is-on" : ""}" data-like="${p.id}" aria-label="찜하기">${ICON_HEART}</button>
      </div>
      <div class="card__info">
        <p class="card__brand">${esc(p.brand)}</p>
        <p class="card__name">${esc(p.name)}</p>
        <p class="card__price">${p.sale ? `<span class="sale">${p.sale}%</span>` : ""}${won(salePrice(p))}</p>
        <p class="card__meta"><span>♥ ${compact(p.wishes)}</span>${p.reviewCount ? `<span>★ ${p.rating.toFixed(1)} (${compact(p.reviewCount)})</span>` : ""}</p>
        ${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ""}
      </div>
    </li>`;
}

// 카드 목록 클릭 처리(찜 하트 / 상세 열기)
function bindGrid(grid, onWishChange) {
  grid.addEventListener("click", async (e) => {
    const like = e.target.closest("[data-like]");
    if (like) {
      e.stopPropagation();
      const on = await Wish.toggle(like.dataset.like);
      if (on === null) { toast("로그인 후 찜할 수 있습니다."); setTimeout(() => (location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search)), 900); return; }
      like.classList.toggle("is-on", on);
      toast(on ? "찜 목록에 담았습니다." : "찜을 해제했습니다.");
      if (onWishChange) onWishChange();
      return;
    }
    const card = e.target.closest("[data-id]");
    if (card) openModal(card.dataset.id);
  });
}

function loadFailHTML() {
  return `<div class="container"><p class="empty">상품 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p></div>`;
}

/* ---------- 카테고리 페이지 ---------- */
const state = { filter: "전체", sort: "rank" };

function renderCategory() {
  const cat = CATEGORIES[page];
  document.title = `${cat.title} | WEAR.LAB`;
  const main = document.getElementById("main");
  if (Shop.error) { main.innerHTML = loadFailHTML(); return; }
  main.innerHTML = `
    <div class="container">
      <div class="banner"><small>${cat.sub} · WEEKLY PICK</small><strong>${cat.copy.replace("\n", "<br>")}</strong></div>
      <div class="page-head"><h1>${cat.title}</h1><span class="count" id="count"></span></div>
      <div class="toolbar">
        <div class="chips" id="chips">${cat.filters.map((f) => `<button type="button" class="chip ${f === state.filter ? "is-active" : ""}" data-filter="${f}">${f}</button>`).join("")}</div>
        <label class="sort"><select id="sort" aria-label="정렬">${SORT_OPTIONS}</select></label>
      </div>
      <ul class="grid" id="grid"></ul>
    </div>
    ${footerHTML()}`;
  document.getElementById("chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    state.filter = b.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
    renderGrid();
  });
  document.getElementById("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  bindGrid(document.getElementById("grid"), renderGrid);
  renderGrid();
}

function renderGrid() {
  // 순위 뱃지는 정렬과 상관없이 랭킹(최근 판매량 + 찜 수) 기준
  const inCat = PRODUCTS.filter((p) => p.cat === page);
  const rankOf = rankMap(inCat);
  const list = inCat.filter((p) => state.filter === "전체" || p.type === state.filter).sort(SORTERS[state.sort]);
  document.getElementById("count").textContent = `${list.length}개 상품`;
  document.getElementById("grid").innerHTML = list.length
    ? list.map((p) => cardHTML(p, rankOf.get(p.id))).join("")
    : `<li class="empty">조건에 맞는 상품이 없습니다.</li>`;
}

function footerHTML() {
  return `<footer class="footer"><div class="container">WEAR.LAB · 토스페이먼츠 테스트 결제 연동<br>실제 결제가 이루어지지 않는 테스트 환경입니다.</div></footer>`;
}

/* ---------- 검색 · 랭킹 · 세일 ---------- */
function renderSearch() {
  const q = new URLSearchParams(location.search);
  const kw = (q.get("q") || "").trim();
  const view = q.get("view");
  const main = document.getElementById("main");
  if (Shop.error) { main.innerHTML = loadFailHTML(); return; }
  const title = view === "rank" ? "랭킹" : view === "sale" ? "세일" : kw ? `'${esc(kw)}' 검색 결과` : "전체 상품";
  document.title = `${view === "rank" ? "랭킹" : view === "sale" ? "세일" : "검색"} | WEAR.LAB`;
  const sortState = { sort: view === "sale" ? "sale" : "rank", cat: "all" };
  const rankOf = rankMap(PRODUCTS);

  main.innerHTML = `
    <div class="container">
      <div class="page-head"><h1>${title}</h1><span class="count" id="count"></span></div>
      ${view === "rank" ? `<p class="page-desc">최근 판매량과 찜 수를 합산한 실시간 순위입니다.</p>` : ""}
      <div class="toolbar">
        <div class="chips" id="chips">
          <button type="button" class="chip is-active" data-cat="all">전체</button>
          ${Object.entries(CATEGORIES).map(([k, c]) => `<button type="button" class="chip" data-cat="${k}">${c.label}</button>`).join("")}
        </div>
        <label class="sort"><select id="sort" aria-label="정렬">${SORT_OPTIONS}</select></label>
      </div>
      <ul class="grid" id="grid"></ul>
      <div id="recommend"></div>
    </div>
    ${footerHTML()}`;
  document.getElementById("sort").value = sortState.sort;
  if (view === "rank") document.querySelector(".sort").style.display = "none";

  const draw = () => {
    const words = kw.toLowerCase().split(/\s+/).filter(Boolean);
    let list = PRODUCTS.filter((p) => {
      const hay = (p.brand + " " + p.name + " " + p.type + " " + CATEGORIES[p.cat].label).toLowerCase();
      return (sortState.cat === "all" || p.cat === sortState.cat) && words.every((w) => hay.includes(w)) && (view !== "sale" || p.sale > 0);
    }).sort(SORTERS[sortState.sort]);
    if (view === "rank") list = list.slice(0, 30);
    document.getElementById("count").textContent = `${list.length}개 상품`;
    document.getElementById("grid").innerHTML = list.length
      ? list.map((p) => cardHTML(p, view === "rank" || sortState.sort === "rank" ? rankOf.get(p.id) : 0)).join("")
      : `<li class="empty">${kw ? `'${esc(kw)}'에 대한 검색 결과가 없습니다.<br>다른 검색어를 입력하거나 아래 인기 상품을 둘러보세요.` : "조건에 맞는 상품이 없습니다."}</li>`;
    // 결과가 없으면 인기 상품 추천
    const rec = document.getElementById("recommend");
    if (!list.length) {
      const popular = [...PRODUCTS].sort(SORTERS.rank).slice(0, 10);
      rec.innerHTML = `<div class="page-head"><h2 class="sub-title">지금 인기 있는 상품</h2></div><ul class="grid" id="recGrid">${popular.map((p) => cardHTML(p, rankOf.get(p.id))).join("")}</ul>`;
      bindGrid(document.getElementById("recGrid"));
    } else rec.innerHTML = "";
  };
  document.getElementById("chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    sortState.cat = b.dataset.cat;
    document.querySelectorAll("#chips .chip").forEach((c) => c.classList.toggle("is-active", c === b));
    draw();
  });
  document.getElementById("sort").addEventListener("change", (e) => { sortState.sort = e.target.value; draw(); });
  bindGrid(document.getElementById("grid"), draw);
  draw();
}

/* ---------- 상품 상세 모달 ---------- */
function starsHTML(n) {
  return `<span class="stars" aria-label="별점 ${n}점">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>`;
}

function galleryHTML(p) {
  const n = Math.max(1, p.images.length);
  const slides = p.images.length ? p.images.map((_, i) => `<div class="gallery__slide">${productThumb(p, i)}</div>`).join("") : `<div class="gallery__slide">${productSVG(p)}</div>`;
  return `
    <div class="gallery" id="gallery">
      <div class="gallery__track" id="galleryTrack">${slides}</div>
      ${n > 1 ? `
        <button type="button" class="gallery__nav is-prev" data-slide="-1" aria-label="이전 사진">‹</button>
        <button type="button" class="gallery__nav is-next" data-slide="1" aria-label="다음 사진">›</button>
        <div class="gallery__dots">${Array.from({ length: n }, (_, i) => `<span class="${i ? "" : "is-active"}"></span>`).join("")}</div>` : ""}
    </div>`;
}

function openModal(id) {
  const p = findProduct(id);
  if (!p) return;
  const sizes = CATEGORIES[p.cat].sizes;
  const sel = { size: null, qty: 1 };
  let modal = document.getElementById("modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }
  const sizeBtn = (s) => {
    const left = stockOf(p, s);
    const note = left === 0 ? "품절" : left <= LOW_STOCK ? `${left}개 남음` : "";
    return `<button type="button" class="size ${left === 0 ? "is-soldout" : ""}" data-size="${esc(s)}" ${left === 0 ? "disabled" : ""}>${esc(s)}${note ? `<small>${note}</small>` : ""}</button>`;
  };
  modal.innerHTML = `
    <div class="modal__dim" data-close></div>
    <div class="modal__panel" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
      <button type="button" class="modal__close" data-close aria-label="닫기">&times;</button>
      <div class="modal__thumb">${galleryHTML(p)}</div>
      <div class="modal__body">
        <a class="modal__brand" href="search.html?q=${encodeURIComponent(p.brand)}">${esc(p.brand)} ›</a>
        <h2 class="modal__name">${esc(p.name)}</h2>
        ${p.sale ? `<p class="modal__origin">${won(p.price)}</p>` : `<p style="margin-top:14px"></p>`}
        <p class="modal__price">${p.sale ? `<span class="sale">${p.sale}%</span>` : ""}${won(salePrice(p))}</p>
        <p class="card__meta" style="margin-top:8px">${p.reviewCount ? `★ ${p.rating.toFixed(1)} · 후기 ${p.reviewCount.toLocaleString()}개 · ` : ""}♥ <span id="mWishCount">${p.wishes.toLocaleString()}</span></p>
        ${p.description ? `<p class="modal__desc">${esc(p.description)}</p>` : ""}
        <p class="opt-label">사이즈</p>
        <div class="sizes">${sizes.map(sizeBtn).join("")}</div>
        <p class="opt-label">수량</p>
        <div class="qty"><button type="button" data-q="-1" aria-label="수량 감소">−</button><span id="mQty">1</span><button type="button" data-q="1" aria-label="수량 증가">+</button></div>
        <p class="msg" id="mMsg">${totalStock(p) === 0 ? "모든 사이즈가 품절되었습니다." : ""}</p>
        <div class="modal__total"><span>총 상품 금액</span><strong id="mTotal">${won(salePrice(p))}</strong></div>
        <div class="btn-row btn-row--wish">
          <button type="button" class="btn btn--icon like-btn ${Wish.has(p.id) ? "is-on" : ""}" id="mWish" aria-label="찜하기">${ICON_HEART}</button>
          <button type="button" class="btn" id="mCart">장바구니</button>
          <button type="button" class="btn btn--dark" id="mBuy">구매하기</button>
        </div>
      </div>
      <section class="modal__reviews" id="mReviews"><p class="empty" style="padding:24px 0">후기를 불러오는 중…</p></section>
    </div>`;
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
  loadReviews(p, "new");

  const close = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };
  const msg = (t) => { document.getElementById("mMsg").textContent = t; };
  const needSize = () => { if (sel.size) return true; msg("사이즈를 선택해 주세요."); return false; };
  const maxQty = () => Math.min(10, sel.size ? stockOf(p, sel.size) : 10);
  const syncQty = () => {
    sel.qty = Math.max(1, Math.min(maxQty(), sel.qty));
    document.getElementById("mQty").textContent = sel.qty;
    document.getElementById("mTotal").textContent = won(salePrice(p) * sel.qty);
  };

  // 사진 넘기기 (버튼 · 스와이프 모두)
  const track = document.getElementById("galleryTrack");
  const dots = modal.querySelectorAll(".gallery__dots span");
  track.addEventListener("scroll", () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
  });

  modal.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return close();
    const slide = e.target.closest("[data-slide]");
    if (slide) track.scrollBy({ left: track.clientWidth * +slide.dataset.slide, behavior: "smooth" });
    const s = e.target.closest("[data-size]");
    if (s && !s.disabled) {
      sel.size = s.dataset.size;
      modal.querySelectorAll(".size").forEach((b) => b.classList.toggle("is-active", b === s));
      msg("");
      syncQty();
    }
    const q = e.target.closest("[data-q]");
    if (q) {
      if (+q.dataset.q > 0 && sel.size && sel.qty >= stockOf(p, sel.size)) msg(`재고가 ${stockOf(p, sel.size)}개 남아 있습니다.`);
      sel.qty += +q.dataset.q;
      syncQty();
    }
    const rs = e.target.closest("[data-rsort]");
    if (rs) loadReviews(p, rs.dataset.rsort);
    if (e.target.closest("#mWish")) {
      const on = await Wish.toggle(p.id);
      if (on === null) { msg("로그인 후 찜할 수 있습니다."); return; }
      document.getElementById("mWish").classList.toggle("is-on", on);
      document.getElementById("mWishCount").textContent = p.wishes.toLocaleString();
      document.querySelectorAll(`[data-like="${p.id}"]`).forEach((b) => b.classList.toggle("is-on", on));
      toast(on ? "찜 목록에 담았습니다." : "찜을 해제했습니다.");
    }
    if (e.target.closest("#mCart") && needSize()) {
      const inCart = Cart.items().filter((i) => i.id === p.id && i.size === sel.size).reduce((n, i) => n + i.qty, 0);
      const left = stockOf(p, sel.size);
      if (inCart + sel.qty > left) { msg(`재고가 ${left}개 남아 있습니다. (장바구니에 ${inCart}개 있음)`); return; }
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

async function loadReviews(p, order) {
  const box = document.getElementById("mReviews");
  let query = sb.from("reviews").select("id, author, size, rating, content, photos, created_at").eq("product_id", p.id).eq("hidden", false).limit(50);
  query = order === "rating" ? query.order("rating", { ascending: false }).order("created_at", { ascending: false }) : query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (!box || !document.getElementById("modal").classList.contains("is-open")) return;
  const list = error ? [] : data;
  const avg = list.length ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : null;
  box.innerHTML = `
    <div class="reviews__head">
      <h3>후기 <span>${list.length}</span></h3>
      ${avg ? `<p class="reviews__avg">★ ${avg}</p>` : ""}
      <div class="reviews__sort">
        <button type="button" data-rsort="new" class="${order === "new" ? "is-active" : ""}">최신순</button>
        <button type="button" data-rsort="rating" class="${order === "rating" ? "is-active" : ""}">별점순</button>
      </div>
    </div>
    ${list.length ? list.map((r) => `
      <article class="review">
        <div class="review__top">${starsHTML(r.rating)}<span>${esc(r.author)}</span><span>${fmtDate(r.created_at)}</span></div>
        <p class="review__size">구매 사이즈: ${esc(r.size)}</p>
        <p class="review__text">${esc(r.content)}</p>
        ${r.photos.length ? `<div class="review__photos">${r.photos.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="후기 사진" loading="lazy"></a>`).join("")}</div>` : ""}
      </article>`).join("")
    : `<p class="empty" style="padding:28px 0">아직 작성된 후기가 없습니다.<br><small>구매 후 배송이 완료되면 마이페이지에서 후기를 남길 수 있어요.</small></p>`}`;
}

/* ---------- 초기화 ---------- */
renderHeader();
document.getElementById("gnb").addEventListener("click", (e) => {
  if (e.target.closest("[data-logout]")) { e.preventDefault(); Auth.signOut(); }
  if (e.target.closest("#cartOpen")) { renderDrawer(); document.getElementById("drawer").classList.add("is-open"); }
});
document.addEventListener("cart:change", () => { renderBadge(); if (document.getElementById("drawer")) renderDrawer(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal.is-open, .drawer.is-open").forEach((el) => { el.classList.remove("is-open"); document.body.style.overflow = ""; });
  if (e.key === "Enter" && e.target.matches(".card")) openModal(e.target.dataset.id);
});

Shop.ready.then(() => {
  renderHeader(); // 로그인 상태 · 장바구니 수량 반영
  if (CATEGORIES[page]) renderCategory();
  if (page === "search") renderSearch();
});
