/* 관리자 화면: 현황판 · 주문/배송 · 환불 · 상품/재고/사진 · 후기 관리
   권한은 DB 접근 규칙이 막는다(관리자 계정이 아니면 데이터가 보이지도, 바뀌지도 않음) */

const ad = document.getElementById("adMain");
const TRACK_COMPANIES = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배", "경동택배"];
const PAID_LIKE = ["paid", "preparing", "shipping", "delivered"];

async function adRoute() {
  const [tab, arg] = (location.hash.slice(1) || "dashboard").split("/");
  const navTab = tab === "order" ? "orders" : tab === "product" ? "products" : tab;
  document.querySelectorAll("#sideNav a").forEach((a) => a.classList.toggle("is-active", a.dataset.tab === navTab));
  ad.innerHTML = `<p class="empty">불러오는 중…</p>`;
  const views = { dashboard: viewDashboard, orders: viewOrders, order: viewOrder, products: viewProducts, product: viewProduct, reviews: viewReviews };
  await (views[tab] || viewDashboard)(arg ? decodeURIComponent(arg) : arg);
}

function todayStartISO() {
  // 한국 시간 기준 오늘 0시
  const kst = new Date(Date.now() + 9 * 3600e3);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600e3).toISOString();
}

function orderRow(o) {
  return `<tr data-href="#order/${encodeURIComponent(o.order_id)}">
    <td>${fmtDate(o.created_at, true)}</td>
    <td class="mono">${esc(o.order_id)}</td>
    <td>${esc(o.buyer_name)}${o.user_id ? "" : ` <small class="muted">비회원</small>`}</td>
    <td class="ellipsis">${esc(o.order_name)}</td>
    <td class="num">${won(o.amount)}</td>
    <td>${statusBadge(o.status)}</td>
  </tr>`;
}

function orderTable(list) {
  return list.length ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>주문일시</th><th>주문번호</th><th>주문자</th><th>상품</th><th class="num">금액</th><th>상태</th></tr></thead>
      <tbody>${list.map(orderRow).join("")}</tbody></table></div>`
    : `<p class="empty" style="padding:30px 0">주문이 없습니다.</p>`;
}

ad.addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-href]");
  if (tr) location.hash = tr.dataset.href;
});

/* ---------- 현황판 ---------- */
async function viewDashboard() {
  const start = todayStartISO();
  const [{ data: today }, { data: open }, { data: recent }, { data: low }] = await Promise.all([
    sb.from("orders").select("amount, status, paid_at, created_at").gte("created_at", start).in("status", VISIBLE_STATUSES),
    sb.from("orders").select("status").in("status", ["awaiting_deposit", "paid", "preparing", "shipping"]),
    sb.from("orders").select("*").in("status", VISIBLE_STATUSES).order("created_at", { ascending: false }).limit(8),
    sb.from("product_stock").select("product_id, size, qty").lte("qty", LOW_STOCK).order("qty"),
  ]);
  const t = today || [];
  const sales = t.filter((o) => PAID_LIKE.includes(o.status)).reduce((s, o) => s + o.amount, 0);
  const count = (s) => (open || []).filter((o) => o.status === s).length;
  const lowList = (low || []).map((s) => ({ ...s, p: findProduct(s.product_id) })).filter((s) => s.p);
  ad.innerHTML = `
    <h2 class="section-title">오늘 현황 <span class="count">${fmtDate(new Date().toISOString())}</span></h2>
    <div class="stats">
      <div class="stat"><p>오늘 주문</p><strong>${t.length}건</strong></div>
      <div class="stat"><p>오늘 매출 (결제 완료 기준)</p><strong>${won(sales)}</strong></div>
      <div class="stat"><a href="#orders/paid"><p>발송 대기 (결제 완료)</p><strong>${count("paid")}건</strong></a></div>
      <div class="stat"><a href="#orders/preparing"><p>배송 준비</p><strong>${count("preparing")}건</strong></a></div>
      <div class="stat"><a href="#orders/shipping"><p>배송 중</p><strong>${count("shipping")}건</strong></a></div>
      <div class="stat"><a href="#orders/awaiting_deposit"><p>입금 대기</p><strong>${count("awaiting_deposit")}건</strong></a></div>
    </div>
    <h3 class="sub-title">품절 · 품절 임박 <span class="count">${LOW_STOCK}개 이하</span></h3>
    ${lowList.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>상품</th><th>사이즈</th><th class="num">남은 수량</th><th></th></tr></thead><tbody>
      ${lowList.map((s) => `<tr><td>${esc(s.p.brand)} · ${esc(s.p.name)}${s.p.hidden ? ` <small class="muted">(숨김)</small>` : ""}</td><td>${esc(s.size)}</td>
        <td class="num ${s.qty === 0 ? "sale" : ""}">${s.qty === 0 ? "품절" : s.qty + "개"}</td><td><a class="link" href="#product/${s.p.id}">재고 수정</a></td></tr>`).join("")}
    </tbody></table></div>` : `<p class="empty" style="padding:20px 0">품절 임박 상품이 없습니다.</p>`}
    <h3 class="sub-title">최근 주문 <a class="link" href="#orders" style="font-weight:400;font-size:13px">전체 보기 ›</a></h3>
    ${orderTable(recent || [])}`;
}

/* ---------- 주문 목록 ---------- */
async function viewOrders(status) {
  const tabs = [["all", "전체"], ["awaiting_deposit", "입금 대기"], ["paid", "결제 완료"], ["preparing", "배송 준비"], ["shipping", "배송 중"], ["delivered", "배송 완료"], ["canceled", "취소"], ["refunded", "환불"]];
  const cur = status || "all";
  let q = sb.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  q = cur === "all" ? q.in("status", VISIBLE_STATUSES) : q.eq("status", cur);
  const { data, error } = await q;
  ad.innerHTML = `
    <h2 class="section-title">주문 · 배송 관리</h2>
    <div class="chips" style="margin-bottom:12px">${tabs.map(([k, l]) => `<a class="chip ${k === cur ? "is-active" : ""}" href="#orders/${k}">${l}</a>`).join("")}</div>
    <input class="search-box" id="orderSearch" placeholder="주문번호 · 주문자 · 연락처로 찾기">
    <div id="orderList">${error ? friendlyError(error) : orderTable(data)}</div>`;
  document.getElementById("orderSearch").addEventListener("input", (e) => {
    const kw = e.target.value.trim().toLowerCase();
    document.getElementById("orderList").innerHTML = orderTable(data.filter((o) => !kw || (o.order_id + o.buyer_name + o.buyer_phone + o.order_name).toLowerCase().includes(kw)));
  });
}

/* ---------- 주문 상세 · 배송 처리 · 환불 ---------- */
async function viewOrder(orderId) {
  const { data: o } = await sb.from("orders").select("*, order_items(*)").eq("order_id", orderId).maybeSingle();
  if (!o) { ad.innerHTML = `<p class="empty">주문을 찾을 수 없습니다.</p>`; return; }
  const canShip = PAID_LIKE.includes(o.status);
  const canRefund = ["awaiting_deposit", ...PAID_LIKE].includes(o.status);
  ad.innerHTML = `
    <p><a href="#orders" class="link">‹ 주문 목록</a></p>
    ${canShip ? `
    <form class="form-box admin-ship" id="shipForm">
      <h3 class="sub-title" style="margin-top:0">배송 처리</h3>
      <div class="field"><label for="shStatus">주문 상태</label>
        <select id="shStatus">${SHIP_STEPS.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${ORDER_STATUS[s]}</option>`).join("")}</select></div>
      <div class="field"><label for="shCompany">택배사</label>
        <select id="shCompany"><option value="">선택</option>${TRACK_COMPANIES.map((c) => `<option ${c === o.tracking_company ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="shNo">송장번호</label><input id="shNo" value="${esc(o.tracking_no)}" inputmode="numeric" placeholder="송장번호를 입력하면 '배송 중'으로 바뀝니다"></div>
      <button class="btn btn--dark" type="submit">저장</button>
      <p class="msg" id="shMsg"></p>
    </form>` : ""}
    ${orderDetailHTML(o, {
      actions: [
        o.status === "awaiting_deposit" ? `<button type="button" class="btn" id="syncBtn">입금 여부 다시 확인</button>` : "",
        canRefund ? `<button type="button" class="btn" id="refundBtn">${o.status === "awaiting_deposit" ? "주문 취소" : "주문 취소 · 환불"}</button>` : "",
        canRefund ? `<p class="notice">버튼 한 번으로 토스 결제 취소와 재고 복구가 함께 처리됩니다.</p>` : "",
      ].join(""),
    })}
    <p class="notice">주문자 이메일: ${esc(o.buyer_email || "-")} · 회원 여부: ${o.user_id ? "회원" : "비회원"}</p>`;

  const shipForm = document.getElementById("shipForm");
  if (shipForm) {
    const no = document.getElementById("shNo");
    const st = document.getElementById("shStatus");
    no.addEventListener("input", () => { if (no.value.trim() && ["paid", "preparing"].includes(st.value)) st.value = "shipping"; });
    shipForm.onsubmit = async (e) => {
      e.preventDefault();
      const status = st.value;
      const tracking_no = no.value.trim();
      const tracking_company = document.getElementById("shCompany").value;
      if (status === "shipping" && !tracking_no) { document.getElementById("shMsg").textContent = "배송 중으로 바꾸려면 송장번호를 입력해 주세요."; return; }
      const { error } = await sb.from("orders").update({ status, tracking_no, tracking_company }).eq("id", o.id);
      if (error) { document.getElementById("shMsg").textContent = friendlyError(error); return; }
      toast("저장했습니다. 손님 마이페이지에도 바로 반영됩니다.");
      adRoute();
    };
  }
  const refund = document.getElementById("refundBtn");
  if (refund) refund.onclick = async () => {
    const reason = prompt("취소 · 환불 사유를 입력해 주세요.", "판매자 사정으로 인한 취소");
    if (reason === null) return;
    refund.disabled = true;
    refund.textContent = "처리 중…";
    const res = await callFn("order-cancel", { orderId: o.order_id, reason });
    if (!res.ok) { alert(res.message || "처리하지 못했습니다."); refund.disabled = false; refund.textContent = "주문 취소 · 환불"; return; }
    toast("결제 취소와 재고 복구를 완료했습니다.");
    adRoute();
  };
  const sync = document.getElementById("syncBtn");
  if (sync) sync.onclick = async () => {
    sync.disabled = true;
    const res = await callFn("toss-webhook", { orderId: o.order_id });
    toast(res.ok ? (res.status === "paid" ? "입금이 확인되었습니다." : "아직 입금 전입니다.") : res.message || "확인하지 못했습니다.");
    adRoute();
  };
}

/* ---------- 상품 목록 ---------- */
async function viewProducts() {
  await loadProducts(); // 관리자는 숨긴 상품까지 보임
  const catState = sessionStorage.getItem("adminCat") || "all";
  const draw = (cat) => {
    const list = PRODUCTS.filter((p) => cat === "all" || p.cat === cat);
    document.getElementById("prodList").innerHTML = `<div class="table-wrap"><table class="table">
      <thead><tr><th></th><th>상품</th><th class="num">판매가</th><th>재고</th><th>상태</th><th></th></tr></thead>
      <tbody>${list.map((p) => {
        const total = totalStock(p);
        const lowSizes = CATEGORIES[p.cat].sizes.filter((s) => stockOf(p, s) <= LOW_STOCK);
        return `<tr data-href="#product/${p.id}">
          <td><div class="mini-thumb">${productThumb(p)}</div></td>
          <td><b>${esc(p.brand)}</b><br>${esc(p.name)}<br><small class="muted">${CATEGORIES[p.cat].label} · ${esc(p.type)}</small></td>
          <td class="num">${p.sale ? `<span class="sale">${p.sale}%</span> ` : ""}${won(salePrice(p))}</td>
          <td>${total}개${lowSizes.length ? `<br><small class="sale">부족: ${lowSizes.map(esc).join(", ")}</small>` : ""}</td>
          <td>${p.hidden ? `<span class="badge is-gray">숨김</span>` : `<span class="badge is-blue">판매 중</span>`}</td>
          <td><a class="link" href="#product/${p.id}">수정</a></td></tr>`;
      }).join("")}</tbody></table></div>`;
  };
  ad.innerHTML = `
    <div class="section-title-row"><h2 class="section-title">상품 · 재고 관리</h2><a class="btn btn--dark btn--sm" href="#product/new">+ 상품 등록</a></div>
    <div class="chips" id="prodCats" style="margin-bottom:12px">
      <button type="button" class="chip" data-cat="all">전체</button>
      ${Object.entries(CATEGORIES).map(([k, c]) => `<button type="button" class="chip" data-cat="${k}">${c.label}</button>`).join("")}
    </div>
    <div id="prodList"></div>`;
  const setCat = (cat) => {
    sessionStorage.setItem("adminCat", cat);
    document.querySelectorAll("#prodCats .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.cat === cat));
    draw(cat);
  };
  document.getElementById("prodCats").onclick = (e) => { const b = e.target.closest("[data-cat]"); if (b) setCat(b.dataset.cat); };
  setCat(catState);
}

/* ---------- 상품 등록 · 수정 ---------- */
async function viewProduct(id) {
  const isNew = id === "new";
  if (!isNew && !findProduct(id)) await loadProducts();
  const p = isNew
    ? { id: "p" + Date.now().toString(36), cat: "top", type: CATEGORIES.top.filters[1], brand: "", name: "", price: 0, sale: 0, color: "#888888", tag: "", description: "", images: [], hidden: false, stock: {}, sortOrder: 0 }
    : findProduct(id);
  if (!p) { ad.innerHTML = `<p class="empty">상품을 찾을 수 없습니다.</p>`; return; }
  let images = [...p.images];

  ad.innerHTML = `
    <p><a href="#products" class="link">‹ 상품 목록</a></p>
    <h2 class="section-title">${isNew ? "상품 등록" : "상품 수정"}</h2>
    <form class="form-box product-form" id="prodForm">
      <div class="field"><label for="fCat">카테고리</label><select id="fCat">${Object.entries(CATEGORIES).map(([k, c]) => `<option value="${k}" ${k === p.cat ? "selected" : ""}>${c.label}</option>`).join("")}</select></div>
      <div class="field"><label for="fType">종류</label><select id="fType"></select></div>
      <div class="field"><label for="fBrand">브랜드</label><input id="fBrand" value="${esc(p.brand)}" required></div>
      <div class="field"><label for="fName">상품명</label><input id="fName" value="${esc(p.name)}" required></div>
      <div class="field"><label for="fPrice">정가 (원)</label><input id="fPrice" type="number" min="0" step="100" value="${p.price}" required></div>
      <div class="field"><label for="fSale">할인율 (%)</label><input id="fSale" type="number" min="0" max="90" value="${p.sale}"></div>
      <div class="field"><label>판매가</label><p id="fFinal" class="sale" style="font-size:16px"></p></div>
      <div class="field"><label for="fTag">표시 태그</label><input id="fTag" value="${esc(p.tag)}" placeholder="예: 무료배송, 단독, 신상"></div>
      <div class="field"><label for="fColor">기본 그림 색</label><input id="fColor" type="color" value="${/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#888888"}" style="height:42px;padding:2px"></div>
      <div class="field field--top"><label for="fDesc">상품 설명</label><textarea id="fDesc" rows="4">${esc(p.description)}</textarea></div>
      <div class="field"><label>노출</label><label class="check"><input type="checkbox" id="fHidden" ${p.hidden ? "checked" : ""}> 숨김 (손님에게 보이지 않음)</label></div>

      <h3 class="sub-title">사이즈별 재고</h3>
      <div class="stock-grid" id="stockGrid"></div>

      <h3 class="sub-title">상품 사진</h3>
      <p class="notice" style="margin:-6px 0 10px">첫 번째 사진이 대표 사진입니다. 사진이 없으면 기본 그림이 표시됩니다. (5MB 이하 이미지)</p>
      <div class="img-list" id="imgList"></div>
      <input type="file" id="fImages" accept="image/*" multiple>

      <div class="btn-row" style="margin-top:24px">
        <a class="btn" href="#products">취소</a>
        <button class="btn btn--dark" type="submit">${isNew ? "등록하기" : "저장하기"}</button>
      </div>
      <p class="msg" id="fMsg"></p>
    </form>`;

  const $ = (x) => document.getElementById(x);
  const drawTypes = () => {
    const cat = $("fCat").value;
    $("fType").innerHTML = CATEGORIES[cat].filters.slice(1).map((t) => `<option ${t === p.type ? "selected" : ""}>${t}</option>`).join("");
    $("stockGrid").innerHTML = CATEGORIES[cat].sizes.map((s) => `<label class="stock-cell"><span>${s}</span><input type="number" min="0" data-size="${s}" value="${cat === p.cat ? stockOf(p, s) : 0}"></label>`).join("");
  };
  const drawFinal = () => { $("fFinal").textContent = won(salePrice({ price: +$("fPrice").value || 0, sale: +$("fSale").value || 0 })); };
  const drawImages = () => {
    $("imgList").innerHTML = images.map((u, i) => `
      <div class="img-item">${i === 0 ? `<span class="img-item__main">대표</span>` : ""}<img src="${esc(u)}" alt="">
        <div class="img-item__btns">${i ? `<button type="button" data-main="${i}">대표로</button>` : ""}<button type="button" data-rm="${i}">삭제</button></div>
      </div>`).join("") || `<p class="muted" style="font-size:12px">등록된 사진이 없습니다.</p>`;
  };
  drawTypes(); drawFinal(); drawImages();
  $("fCat").onchange = drawTypes;
  $("fPrice").oninput = $("fSale").oninput = drawFinal;
  $("imgList").onclick = (e) => {
    const m = e.target.closest("[data-main]");
    if (m) { const [x] = images.splice(+m.dataset.main, 1); images.unshift(x); drawImages(); }
    const r = e.target.closest("[data-rm]");
    if (r) { images.splice(+r.dataset.rm, 1); drawImages(); }
  };
  $("fImages").onchange = async (e) => {
    const files = [...e.target.files];
    $("fMsg").style.color = "#000";
    $("fMsg").textContent = "사진을 올리는 중…";
    for (const f of files) {
      const path = `${p.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
      const { error } = await sb.storage.from("product-images").upload(path, f, { contentType: f.type });
      if (error) { $("fMsg").style.color = ""; $("fMsg").textContent = "사진 업로드 실패: 5MB 이하 이미지만 올릴 수 있습니다."; return; }
      images.push(sb.storage.from("product-images").getPublicUrl(path).data.publicUrl);
      drawImages();
    }
    $("fMsg").textContent = "사진을 올렸습니다. 저장하기를 눌러야 반영됩니다.";
    e.target.value = "";
  };

  $("prodForm").onsubmit = async (e) => {
    e.preventDefault();
    const msg = $("fMsg");
    msg.style.color = "";
    const cat = $("fCat").value;
    const row = {
      id: p.id, cat, type: $("fType").value, brand: $("fBrand").value.trim(), name: $("fName").value.trim(),
      price: Math.max(0, Math.round(+$("fPrice").value || 0)), sale: Math.max(0, Math.min(90, Math.round(+$("fSale").value || 0))),
      tag: $("fTag").value.trim(), color: $("fColor").value, description: $("fDesc").value.trim(),
      hidden: $("fHidden").checked, images,
    };
    if (!row.brand || !row.name) { msg.textContent = "브랜드와 상품명을 입력해 주세요."; return; }
    if (isNew) row.sort_order = PRODUCTS.filter((x) => x.cat === cat).length + 1;
    const { error } = isNew ? await sb.from("products").insert(row) : await sb.from("products").update(row).eq("id", p.id);
    if (error) { msg.textContent = friendlyError(error); return; }
    const stock = [...document.querySelectorAll("#stockGrid [data-size]")].map((i) => ({ product_id: p.id, size: i.dataset.size, qty: Math.max(0, Math.round(+i.value || 0)) }));
    // 카테고리를 바꾼 경우 이전 사이즈 재고는 지움
    if (!isNew && cat !== p.cat) await sb.from("product_stock").delete().eq("product_id", p.id);
    const { error: stErr } = await sb.from("product_stock").upsert(stock);
    if (stErr) { msg.textContent = friendlyError(stErr); return; }
    toast(isNew ? "상품을 등록했습니다." : "저장했습니다. 손님 화면에 바로 반영됩니다.");
    await loadProducts();
    location.hash = "#products";
  };
}

/* ---------- 후기 관리 ---------- */
async function viewReviews() {
  const { data } = await sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
  const list = data || [];
  ad.innerHTML = `<h2 class="section-title">후기 관리 <span class="count">${list.length}</span></h2>
    <p class="notice" style="margin:-6px 0 12px">부적절한 후기는 숨기거나 삭제할 수 있습니다. 숨긴 후기는 손님에게 보이지 않고 별점 평균에서도 빠집니다.</p>
    ${list.length ? list.map((r) => {
      const p = findProduct(r.product_id);
      return `<article class="review ${r.hidden ? "is-hidden" : ""}">
        <div class="review__top">${starsHTML(r.rating)}<span>${esc(r.author)}</span><span>${fmtDate(r.created_at, true)}</span>${r.hidden ? `<span class="badge is-gray">숨김</span>` : ""}</div>
        <p class="review__size">${esc(p ? p.brand + " · " + p.name : r.product_id)} · 사이즈 ${esc(r.size)}</p>
        <p class="review__text">${esc(r.content)}</p>
        ${r.photos.length ? `<div class="review__photos">${r.photos.map((u) => `<img src="${esc(u)}" alt="">`).join("")}</div>` : ""}
        <button type="button" class="link" data-hide="${r.id}" data-to="${!r.hidden}">${r.hidden ? "다시 보이기" : "숨기기"}</button>
        · <button type="button" class="link" data-del="${r.id}">삭제</button>
      </article>`;
    }).join("") : `<p class="empty">아직 후기가 없습니다.</p>`}`;
  ad.querySelectorAll("[data-hide]").forEach((b) => (b.onclick = async () => {
    await sb.from("reviews").update({ hidden: b.dataset.to === "true" }).eq("id", b.dataset.hide);
    viewReviews();
  }));
  ad.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!confirm("후기를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await sb.from("reviews").delete().eq("id", b.dataset.del);
    viewReviews();
  }));
}

Shop.ready.then(() => {
  if (!requireLogin()) return;
  if (!Auth.isAdmin()) {
    ad.innerHTML = `<p class="empty">관리자만 들어올 수 있는 화면입니다.</p>`;
    document.getElementById("sideNav").hidden = true;
    return;
  }
  window.addEventListener("hashchange", adRoute);
  adRoute();
});
