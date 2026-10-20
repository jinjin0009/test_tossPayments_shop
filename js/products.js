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

const PRODUCTS = [
  // 상의
  { id: "t01", cat: "top", type: "반소매 티셔츠", brand: "MONOLAB", name: "헤비웨이트 오버핏 반소매 티셔츠 블랙", price: 39000, sale: 28, color: "#1d1d1d", likes: 12480, reviews: 3210, rating: 4.9, tag: "무료배송" },
  { id: "t02", cat: "top", type: "맨투맨", brand: "GRAYFIELD", name: "피그먼트 다잉 크루넥 스웨트셔츠 차콜", price: 69000, sale: 35, color: "#4a4a4a", likes: 8830, reviews: 1844, rating: 4.8, tag: "단독" },
  { id: "t03", cat: "top", type: "후드", brand: "NORTHLINE", name: "릴렉스드 기모 후드 집업 멜란지 그레이", price: 89000, sale: 20, color: "#9ea3a8", likes: 15620, reviews: 4022, rating: 4.9, tag: "무료배송" },
  { id: "t04", cat: "top", type: "셔츠", brand: "STUDIO 87", name: "옥스포드 오버사이즈 셔츠 스카이블루", price: 59000, sale: 15, color: "#9cc3e6", likes: 4410, reviews: 902, rating: 4.7, tag: "" },
  { id: "t05", cat: "top", type: "긴소매 티셔츠", brand: "MONOLAB", name: "베이직 롱슬리브 티셔츠 오트밀", price: 35000, sale: 10, color: "#d8cdb8", likes: 6120, reviews: 1503, rating: 4.8, tag: "무료배송" },
  { id: "t06", cat: "top", type: "반소매 티셔츠", brand: "ARCHIVE.K", name: "빈티지 로고 프린팅 반소매 티셔츠 화이트", price: 42000, sale: 40, color: "#f2f2ef", likes: 9930, reviews: 2788, rating: 4.8, tag: "단독" },
  { id: "t07", cat: "top", type: "맨투맨", brand: "NORTHLINE", name: "투톤 배색 맨투맨 네이비", price: 65000, sale: 25, color: "#24324d", likes: 3870, reviews: 640, rating: 4.6, tag: "" },
  { id: "t08", cat: "top", type: "후드", brand: "GRAYFIELD", name: "스몰 로고 후드 티셔츠 올리브", price: 79000, sale: 30, color: "#6b6f45", likes: 5240, reviews: 1120, rating: 4.7, tag: "무료배송" },
  { id: "t09", cat: "top", type: "셔츠", brand: "ARCHIVE.K", name: "코듀로이 워크 셔츠 브라운", price: 72000, sale: 22, color: "#7a5236", likes: 2980, reviews: 455, rating: 4.7, tag: "" },
  { id: "t10", cat: "top", type: "긴소매 티셔츠", brand: "STUDIO 87", name: "스트라이프 롱슬리브 티셔츠 블랙/화이트", price: 38000, sale: 0, color: "#2b2b2b", likes: 1870, reviews: 312, rating: 4.5, tag: "신상" },

  // 신발
  { id: "s01", cat: "shoes", type: "스니커즈", brand: "RUNWAVE", name: "클래식 레더 로우 스니커즈 화이트", price: 119000, sale: 20, color: "#f4f4f2", likes: 21300, reviews: 6120, rating: 4.9, tag: "무료배송" },
  { id: "s02", cat: "shoes", type: "러닝화", brand: "PACEMAKER", name: "에어 쿠션 데일리 러닝화 블랙", price: 139000, sale: 15, color: "#1b1b1b", likes: 9800, reviews: 2210, rating: 4.8, tag: "단독" },
  { id: "s03", cat: "shoes", type: "로퍼", brand: "OLD TOWN", name: "페니 로퍼 버건디 레더", price: 159000, sale: 30, color: "#5b1f24", likes: 4320, reviews: 870, rating: 4.7, tag: "" },
  { id: "s04", cat: "shoes", type: "부츠", brand: "OLD TOWN", name: "첼시 부츠 스웨이드 탠", price: 189000, sale: 25, color: "#a8794b", likes: 6720, reviews: 1305, rating: 4.8, tag: "무료배송" },
  { id: "s05", cat: "shoes", type: "스니커즈", brand: "RUNWAVE", name: "캔버스 하이탑 스니커즈 블랙", price: 69000, sale: 10, color: "#222222", likes: 13400, reviews: 4410, rating: 4.8, tag: "" },
  { id: "s06", cat: "shoes", type: "러닝화", brand: "PACEMAKER", name: "라이트 메쉬 러닝화 그레이/오렌지", price: 129000, sale: 35, color: "#a7a9ac", likes: 3510, reviews: 690, rating: 4.6, tag: "신상" },
  { id: "s07", cat: "shoes", type: "스니커즈", brand: "COURTSIDE", name: "레트로 코트 스니커즈 크림/그린", price: 99000, sale: 18, color: "#e9e2cf", likes: 7710, reviews: 1980, rating: 4.8, tag: "무료배송" },
  { id: "s08", cat: "shoes", type: "부츠", brand: "COURTSIDE", name: "워커 부츠 블랙 레더", price: 175000, sale: 0, color: "#151515", likes: 2880, reviews: 410, rating: 4.7, tag: "" },
  { id: "s09", cat: "shoes", type: "로퍼", brand: "OLD TOWN", name: "청키 솔 로퍼 블랙", price: 149000, sale: 22, color: "#262626", likes: 5050, reviews: 1012, rating: 4.7, tag: "단독" },
  { id: "s10", cat: "shoes", type: "스니커즈", brand: "RUNWAVE", name: "스웨이드 로우 스니커즈 네이비", price: 109000, sale: 12, color: "#29355a", likes: 2140, reviews: 388, rating: 4.6, tag: "" },

  // 바지
  { id: "p01", cat: "pants", type: "데님", brand: "INDIGO WORKS", name: "와이드 스트레이트 데님 팬츠 미드블루", price: 79000, sale: 30, color: "#4c6d9c", likes: 18900, reviews: 5320, rating: 4.9, tag: "무료배송" },
  { id: "p02", cat: "pants", type: "슬랙스", brand: "STUDIO 87", name: "원턱 와이드 슬랙스 블랙", price: 59000, sale: 25, color: "#1c1c1c", likes: 14200, reviews: 4100, rating: 4.8, tag: "단독" },
  { id: "p03", cat: "pants", type: "카고", brand: "NORTHLINE", name: "나일론 벌룬 카고 팬츠 카키", price: 89000, sale: 35, color: "#6a6b4c", likes: 7600, reviews: 1650, rating: 4.7, tag: "" },
  { id: "p04", cat: "pants", type: "트레이닝", brand: "PACEMAKER", name: "와이드 트랙 팬츠 블랙/화이트 라인", price: 69000, sale: 20, color: "#232323", likes: 6230, reviews: 1388, rating: 4.7, tag: "무료배송" },
  { id: "p05", cat: "pants", type: "데님", brand: "INDIGO WORKS", name: "세미 와이드 데님 팬츠 라이트블루", price: 75000, sale: 15, color: "#8eaacb", likes: 9900, reviews: 2550, rating: 4.8, tag: "" },
  { id: "p06", cat: "pants", type: "슬랙스", brand: "GRAYFIELD", name: "울 블렌드 세미와이드 슬랙스 그레이", price: 99000, sale: 40, color: "#7b7e82", likes: 5120, reviews: 980, rating: 4.8, tag: "신상" },
  { id: "p07", cat: "pants", type: "숏팬츠", brand: "ARCHIVE.K", name: "스웻 버뮤다 쇼츠 멜란지", price: 45000, sale: 50, color: "#b9bcc0", likes: 3300, reviews: 720, rating: 4.6, tag: "" },
  { id: "p08", cat: "pants", type: "카고", brand: "ARCHIVE.K", name: "코튼 와이드 카고 팬츠 베이지", price: 85000, sale: 28, color: "#cdb995", likes: 8420, reviews: 2030, rating: 4.8, tag: "무료배송" },
  { id: "p09", cat: "pants", type: "데님", brand: "INDIGO WORKS", name: "로우라이즈 부츠컷 데님 블랙", price: 82000, sale: 0, color: "#2a2c33", likes: 2760, reviews: 401, rating: 4.6, tag: "" },
  { id: "p10", cat: "pants", type: "트레이닝", brand: "NORTHLINE", name: "기모 조거 팬츠 차콜", price: 55000, sale: 18, color: "#3d3d3f", likes: 4880, reviews: 1206, rating: 4.7, tag: "" },
];

/* ---------- 유틸 ---------- */
const won = (n) => n.toLocaleString("ko-KR") + "원";
const salePrice = (p) => Math.round((p.price * (100 - p.sale)) / 100 / 100) * 100;
const findProduct = (id) => PRODUCTS.find((p) => p.id === id);
const compact = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, "") + "만" : n.toLocaleString("ko-KR"));

/* 이미지 없이 쓰는 상품 일러스트 (SVG). 색상만 바꿔서 상품마다 다르게 보이게 함 */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function productSVG(p) {
  const c = p.color, d = shade(c, -28), l = shade(c, 22);
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
  return `<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-label="${p.name}" role="img">
    <rect width="400" height="400" fill="${bg}"/>
    <g transform="translate(0,20)">${body}</g>
  </svg>`;
}

/* ---------- 장바구니 (localStorage) ---------- */
const Store = {
  read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 */ }
  },
};

const Cart = {
  KEY: "shop_cart",
  items() { return Store.read(this.KEY, []).filter((i) => findProduct(i.id)); },
  save(items) { Store.write(this.KEY, items); document.dispatchEvent(new CustomEvent("cart:change")); },
  add(id, size, qty) {
    const items = this.items();
    const hit = items.find((i) => i.id === id && i.size === size);
    if (hit) hit.qty += qty; else items.push({ id, size, qty });
    this.save(items);
  },
  setQty(idx, qty) { const items = this.items(); if (!items[idx]) return; items[idx].qty = Math.max(1, qty); this.save(items); },
  remove(idx) { const items = this.items(); items.splice(idx, 1); this.save(items); },
  clear() { this.save([]); },
  count() { return this.items().reduce((s, i) => s + i.qty, 0); },
  total(items = this.items()) { return items.reduce((s, i) => s + salePrice(findProduct(i.id)) * i.qty, 0); },
};
