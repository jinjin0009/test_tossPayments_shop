/* 상품 데이터 · 상품 일러스트 · 장바구니 저장소 (모든 페이지 공용) */

const CATEGORIES = {
  top:   { label: "상의",  title: "상의", sub: "TOP", copy: "가을 시즌 신상\n상의 최대 40% 할인", file: "top.html",
           filters: ["전체", "반소매 티셔츠", "긴소매 티셔츠", "맨투맨", "후드", "셔츠"],
           sizes: ["S", "M", "L", "XL", "XXL"] },
  shoes: { label: "신발",  title: "신발", sub: "SHOES", copy: "데일리 스니커즈\n최대 30% 할인", file: "shoes.html",
           filters: ["전체", "스니커즈", "러닝화", "로퍼", "부츠"],
           sizes: ["230", "240", "250", "260", "270", "280", "290"] },
  pants: { label: "바지",  title: "바지", sub: "PANTS", copy: "핏이 다른 팬츠\n시즌오프 최대 50%", file: "pants.html",
           filters: ["전체", "데님", "슬랙스", "카고", "트레이닝", "숏팬츠"],
           sizes: ["28", "30", "32", "34", "36"] },
};

// 상품은 Supabase 에서 불러와 채운다 (loadProducts). 관리자 화면에서 바꾸면 새로고침 시 바로 반영
const PRODUCTS = [];
const LOW_STOCK = 5; // 이 수량 이하면 "n개 남음" 표시

/* ---------- 유틸 ---------- */
const won = (n) => (n || 0).toLocaleString("ko-KR") + "원";
const salePrice = (p) => Math.round((p.price * (100 - p.sale)) / 100 / 100) * 100;
const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
const compact = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, "") + "만" : (n || 0).toLocaleString("ko-KR"));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stockOf = (p, size) => (p && p.stock[size]) || 0;
const totalStock = (p) => Object.values(p.stock).reduce((s, n) => s + n, 0);
const fmtDate = (iso, withTime) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
};

async function loadProducts() {
  const [{ data: rows, error }, { data: stats }] = await Promise.all([
    sb.from("products").select("*, product_stock(size, qty)").order("sort_order").order("created_at"),
    sb.rpc("product_stats"),
  ]);
  if (error) throw error;
  const statOf = new Map((stats || []).map((s) => [s.product_id, s]));
  PRODUCTS.length = 0;
  rows.forEach((r) => {
    const s = statOf.get(r.id) || {};
    PRODUCTS.push({
      id: r.id, cat: r.cat, type: r.type, brand: r.brand, name: r.name, price: r.price, sale: r.sale,
      color: r.color, tag: r.tag, description: r.description, images: r.images || [], hidden: r.hidden,
      sortOrder: r.sort_order, createdAt: r.created_at,
      stock: Object.fromEntries((r.product_stock || []).map((x) => [x.size, x.qty])),
      wishes: s.wish_count || 0, reviewCount: s.review_count || 0, rating: s.avg_rating ? Number(s.avg_rating) : 0,
      sales7: s.sales_7d || 0, sales30: s.sales_30d || 0,
    });
  });
  // 랭킹 점수: 최근 판매량(최근 7일 가중) + 찜 수
  PRODUCTS.forEach((p) => { p.score = p.sales7 * 10 + p.sales30 * 3 + p.wishes; });
}

// 사진이 있으면 사진, 없으면 기본 그림(SVG)
function productThumb(p, idx = 0) {
  const src = p.images && p.images[idx];
  return src ? `<img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy">` : productSVG(p);
}

/* 이미지 없이 쓰는 상품 일러스트 (SVG). 색상만 바꿔서 상품마다 다르게 보이게 함 */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function productSVG(p) {
  const c = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#888888", d = shade(c, -28), l = shade(c, 22);
  const bg = "#f3f3f1";
  let body = "";
  if (p.cat === "top") {
    const long = p.type !== "반소매 티셔츠";
    body = long
      ? `<path d="M120 70 L160 58 Q200 80 240 58 L280 70 L340 110 L352 300 L318 304 L300 150 L292 330 L108 330 L100 150 L82 304 L48 300 L60 110 Z" fill="${c}"/>
         <path d="M160 58 Q200 92 240 58 Q200 74 160 58Z" fill="${d}"/>`
      : `<path d="M120 80 L162 64 Q200 88 238 64 L280 80 L340 128 L308 168 L290 156 L292 330 L108 330 L110 156 L92 168 L60 128 Z" fill="${c}"/>
         <path d="M162 64 Q200 100 238 64 Q200 80 162 64Z" fill="${d}"/>`;
    if (p.type === "후드") body += `<path d="M156 62 Q200 20 244 62 Q200 96 156 62Z" fill="${d}"/><line x1="188" y1="90" x2="186" y2="140" stroke="${l}" stroke-width="4"/><line x1="212" y1="90" x2="214" y2="140" stroke="${l}" stroke-width="4"/>`;
    if (p.type === "셔츠") body += `<line x1="200" y1="78" x2="200" y2="330" stroke="${d}" stroke-width="3"/>${[110,150,190,230,270].map(y=>`<circle cx="200" cy="${y}" r="4" fill="${l}"/>`).join("")}`;
    if (p.type === "맨투맨") body += `<rect x="108" y="312" width="184" height="18" fill="${d}"/>`;
  } else if (p.cat === "shoes") {
    const boot = p.type === "부츠", loafer = p.type === "로퍼";
    body = boot
      ? `<path d="M120 90 L210 90 L214 220 Q300 226 330 260 L334 292 L80 292 L84 250 Q110 240 118 200 Z" fill="${c}"/>
         <rect x="78" y="292" width="258" height="20" rx="4" fill="${d}"/>`
      : `<path d="M60 250 Q70 182 130 176 L190 170 Q230 196 270 206 Q338 220 344 262 L344 278 L60 278 Z" fill="${c}"/>
         <rect x="56" y="278" width="292" height="${p.type === "러닝화" ? 26 : 18}" rx="6" fill="${p.type === "러닝화" ? l : "#fafafa"}" stroke="${d}" stroke-width="2"/>`;
    if (!boot && !loafer) body += [0,1,2,3].map(i=>`<line x1="${160+i*18}" y1="${186+i*6}" x2="${176+i*18}" y2="${180+i*6}" stroke="${l}" stroke-width="5" stroke-linecap="round"/>`).join("");
    if (loafer) body += `<rect x="186" y="196" width="60" height="16" rx="4" fill="${d}"/>`;
    if (p.type === "러닝화") body += `<path d="M110 240 Q180 220 250 250" stroke="${l}" stroke-width="8" fill="none"/>`;
  } else {
    const shorts = p.type === "숏팬츠";
    const len = shorts ? 200 : 340;
    body = `<path d="M130 50 L270 50 L${shorts ? 296 : 300} ${len} L${shorts ? 214 : 222} ${len} L200 130 L${shorts ? 186 : 178} ${len} L${shorts ? 104 : 100} ${len} Z" fill="${c}"/>
            <rect x="130" y="50" width="140" height="18" fill="${d}"/>`;
    if (p.type === "카고") body += `<rect x="112" y="${shorts?140:180}" width="44" height="54" rx="4" fill="${d}"/><rect x="244" y="180" width="44" height="54" rx="4" fill="${d}"/>`;
    if (p.type === "트레이닝") body += `<line x1="136" y1="70" x2="104" y2="${len}" stroke="#fff" stroke-width="6"/><line x1="264" y1="70" x2="296" y2="${len}" stroke="#fff" stroke-width="6"/>`;
    if (p.type === "데님") body += `<path d="M140 70 Q160 100 186 96" stroke="${l}" stroke-width="3" fill="none"/><path d="M260 70 Q240 100 214 96" stroke="${l}" stroke-width="3" fill="none"/>`;
    if (p.type === "슬랙스") body += `<line x1="140" y1="70" x2="140" y2="${len}" stroke="${d}" stroke-width="2"/><line x1="260" y1="70" x2="260" y2="${len}" stroke="${d}" stroke-width="2"/>`;
  }
  return `<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-label="${esc(p.name)}" role="img">
    <rect width="400" height="400" fill="${bg}"/>
    <g transform="translate(0,20)">${body}</g>
  </svg>`;
}

/* ---------- 브라우저 저장소 ---------- */
const Store = {
  read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 */ }
  },
};

/* ---------- 장바구니 ----------
   비회원: 이 브라우저(localStorage)에만 저장
   회원: 서버(cart_items)에 저장해 어느 기기에서나 같은 장바구니. 로그인하면 비회원 때 담은 상품을 합친다 */
const Cart = {
  KEY: "shop_cart",
  OWNER: "shop_cart_owner",
  items() { return Store.read(this.KEY, []).filter((i) => findProduct(i.id)); },
  save(items) { Store.write(this.KEY, items); document.dispatchEvent(new CustomEvent("cart:change")); },
  remote(fn) {
    if (!Auth.user) return;
    fn().then(({ error }) => { if (error) console.warn("장바구니 저장 실패", error); });
  },
  async sync() {
    const u = Auth.user;
    if (!u) {
      // 다른 회원이 쓰던 장바구니가 남아 있으면 비움
      if (Store.read(this.OWNER, null)) { Store.write(this.KEY, []); Store.write(this.OWNER, null); }
      return;
    }
    const owner = Store.read(this.OWNER, null);
    const guest = owner === u.id ? [] : (owner ? [] : Store.read(this.KEY, []));
    let { data: server, error } = await sb.from("cart_items").select("product_id, size, qty").order("created_at");
    if (error) return;
    if (guest.length) {
      const rows = guest.map((g) => {
        const hit = server.find((s) => s.product_id === g.id && s.size === g.size);
        return { user_id: u.id, product_id: g.id, size: g.size, qty: Math.min(99, (hit ? hit.qty : 0) + g.qty) };
      });
      await sb.from("cart_items").upsert(rows);
      ({ data: server } = await sb.from("cart_items").select("product_id, size, qty").order("created_at"));
    }
    Store.write(this.KEY, (server || []).map((s) => ({ id: s.product_id, size: s.size, qty: s.qty })));
    Store.write(this.OWNER, u.id);
  },
  add(id, size, qty) {
    const items = this.items();
    const hit = items.find((i) => i.id === id && i.size === size);
    if (hit) hit.qty += qty; else items.push({ id, size, qty });
    const q = hit ? hit.qty : qty;
    this.save(items);
    this.remote(() => sb.from("cart_items").upsert({ user_id: Auth.user.id, product_id: id, size, qty: q }));
  },
  setQty(idx, qty) {
    const items = this.items();
    const it = items[idx];
    if (!it) return;
    it.qty = Math.max(1, qty);
    this.save(items);
    this.remote(() => sb.from("cart_items").upsert({ user_id: Auth.user.id, product_id: it.id, size: it.size, qty: it.qty }));
  },
  remove(idx) {
    const items = this.items();
    const [it] = items.splice(idx, 1);
    this.save(items);
    if (it) this.remote(() => sb.from("cart_items").delete().eq("product_id", it.id).eq("size", it.size));
  },
  clear() {
    this.save([]);
    this.remote(() => sb.from("cart_items").delete().eq("user_id", Auth.user.id));
  },
  count() { return this.items().reduce((s, i) => s + i.qty, 0); },
  total(items = this.items()) { return items.reduce((s, i) => s + salePrice(findProduct(i.id)) * i.qty, 0); },
};

/* ---------- 찜 (회원 전용) ---------- */
const Wish = {
  ids: new Set(),
  async load() {
    this.ids = new Set();
    if (!Auth.user) return;
    const { data } = await sb.from("wishes").select("product_id");
    (data || []).forEach((w) => this.ids.add(w.product_id));
  },
  has(id) { return this.ids.has(id); },
  // 성공 시 새 상태(true/false) 반환, 로그인 필요하면 null
  async toggle(id) {
    if (!Auth.user) return null;
    const p = findProduct(id);
    if (this.has(id)) {
      this.ids.delete(id);
      if (p) p.wishes = Math.max(0, p.wishes - 1);
      await sb.from("wishes").delete().eq("product_id", id);
      return false;
    }
    this.ids.add(id);
    if (p) p.wishes += 1;
    await sb.from("wishes").insert({ product_id: id });
    return true;
  },
};

/* ---------- 페이지 준비 ----------
   로그인 상태 → 상품 · 장바구니 · 찜 순서로 불러온다. 각 페이지는 await Shop.ready 후 그린다 */
const Shop = {
  error: null,
  ready: (async () => {
    await Auth.init();
    try {
      await Promise.all([loadProducts(), Cart.sync(), Wish.load()]);
    } catch (e) {
      Shop.error = e;
      console.error(e);
    }
  })(),
};
