# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

WEAR.LAB: a clothing shop in plain HTML, CSS and JavaScript (no framework, no bundler, no package.json, no tests) backed by Supabase (free plan; the owner will never pay, so stay on free-tier features). Payments go through the Toss Payments widget SDK v2 in test mode and are confirmed server-side. The UI copy is Korean, and the visual style follows a Musinsa-like look (black GNB, dense product grid, red discount %) without using that brand.

`PRD.md` (25 features, 5 phases) is implemented. `운영안내.md` is the plain-language owner guide, including the dashboard steps only the owner can do (turn off "Confirm email", set Site URL/redirects, enable Kakao/Google, real Toss keys, webhook URL). Keep both free of technical detail.

## Supabase (the real "Architecture" below the pages)

- Project `wearlab-shop`, ref `xkdgxkltowytzpzkkefl`, region ap-northeast-2. Use the Supabase MCP tools; the schema lives in its migration history (`list_migrations`), not in this repo.
- Tables: `products` (+ `product_stock` per size), `orders` (+ `order_items` with name/brand/price snapshots, `order_payment_secrets`), `profiles` (`is_admin`), `admin_emails`, `addresses`, `cart_items`, `wishes`, `reviews`. Storage buckets `product-images`, `review-photos`.
- Security is RLS plus column grants and triggers: customers only see their own rows; admins via `is_admin()`. `orders_guard` lets the admin UI move status only within paid → preparing → shipping → delivered; cancel/refund go through the `order-cancel` function. `reviews_guard` fills `author`/`size` and keeps `hidden` admin-only.
- RPCs: `create_order` (recomputes prices from the DB — the anti-tamper core), `lookup_guest_order`, `product_stats` (wish/review counts, 7/30-day sales). `begin_payment` / `release_order_stock` are service-role only; `begin_payment` decrements stock with `qty >= n` so the last unit sells once.
- Edge Functions (source in `supabase/functions/`, all `verify_jwt: false`, each deployed with its own `shared.ts` copied from `_shared/`): `payment-confirm` (amount check → stock → Toss confirm), `order-cancel` (Toss cancel + stock release; customer before shipping, admin anytime), `toss-webhook` (re-fetches the payment from Toss by `payment_key`, never trusts the body).
- Toss docs keys: client `test_gck_docs_...` in `js/checkout.js`; secret falls back to `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6` unless the `TOSS_SECRET_KEY` secret is set. `GET /v1/payments/orders/{orderId}` returns NOT_FOUND_MERCHANT with docs keys, so look payments up by `paymentKey`.
- Testing logged-in flows: don't sign up real accounts. Impersonate in SQL inside `begin … rollback` (`set local role authenticated` + `set_config('request.jwt.claims', …)`); a temp log table needs `grant all … to authenticated, anon`.

## Running

The checkout only works over http. Toss rejects `file://` success/fail URLs, and the page shows a warning when opened that way. `serve.ps1` is a minimal PowerShell `HttpListener` static server. The project doesn't need Node or Python; Node is installed only for the Toss MCP server.

```
powershell -ExecutionPolicy Bypass -File serve.ps1          # http://localhost:8080
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 9000
```

`index.html` just redirects to `top.html`.

### Verifying changes

- **Preview:** `.claude/launch.json` defines the preview server `shop`, which runs `serve.ps1` on port 8080. Start it with `preview_start` to use the browser pane.
- **Driving the shop from JS:** the page globals let you skip clicking, e.g. `openModal("s01")`, `Cart.add(id, size, qty)`, `Cart.items()`.
- **Toss payment window:** it is a cross-origin iframe and hard to drive in the small preview pane. To test the success page, use the `orderId` saved in `shop_pending_order` and the order's `amount` from the `orders` table (see "Payment flow → Testing").
- **Testing a stdio MCP server:** send `initialize` and `tools/list` from a small Node script. Async stdout reads in PowerShell hang.

### Machine setup (Windows, portable tools, no admin)

- **Git:** MinGit at `%LOCALAPPDATA%\Programs\MinGit\cmd`. It's on the user PATH, but shells launched by the Claude app may not see it, so call `git.exe` by full path. Port 22 is blocked, so GitHub SSH goes through `ssh.github.com:443` (configured in `~/.ssh/config`). Remote: `git@github.com:jinjin0009/test_tossPayments_shop.git`, branch `main`.
- **Chaining commands in Windows PowerShell 5.1:** `&&` doesn't exist, and `;` keeps going after a failed `git add`, which can produce a half-staged commit. Gate the next step with `if ($LASTEXITCODE -eq 0) { ... }`.
- **Node.js:** v24 LTS at `%LOCALAPPDATA%\Programs\nodejs`. The same PATH caveat applies.
- **Toss docs MCP:** `.mcp.json` (gitignored, because it contains machine paths) starts the globally installed `@tosspayments/integration-guide-mcp`. Use its `get-documents` tool for Toss API questions instead of guessing.
- **Plugins:** `claude plugin install` needs the Git directory on PATH. The CLI is bundled at `%APPDATA%\Claude\claude-code\<version>\...\claude.exe`.

## Architecture

Every page is a thin HTML shell: `<body data-page="...">` plus an empty `<header id="gnb">` and `<main id="main">`. The JS renders everything. Scripts are plain globals loaded in this order, and the order matters:

0. supabase-js UMD (`@supabase/supabase-js@2.45.4` from jsDelivr) then `js/db.js`: the `sb` client (URL + legacy anon key), `Auth` (`user`, `profile`, `isAdmin()`), `requireLogin()`, `callFn(name, body)` for Edge Functions (returns the JSON body on any status), `friendlyError()`.
1. `js/products.js` is the shared data layer. `CATEGORIES` is still static config (filters, sizes, banner). `PRODUCTS` starts empty and `loadProducts()` fills it from `products` + `product_stock` + `product_stats()` (fields: `stock{size:qty}`, `wishes`, `reviewCount`, `rating`, `sales7/30`, `score`). Also `esc()` (escape every DB string you render), `productThumb()` (uploaded photo, else `productSVG`), `Cart` (localStorage cache synced to `cart_items` when logged in; `shop_cart_owner` tracks whose cart it is and guest items merge on login), `Wish`, and `Shop.ready` — every page awaits it before rendering.
2. `js/app.js` is loaded on every page: GNB (login state, admin link), cart drawer, category page, `search.html` (search / `?view=rank` / `?view=sale`), the detail modal (gallery, size stock, reviews). Changes to the cart dispatch `cart:change`.
3. Page scripts: `js/checkout.js`, `js/login.js`, `js/mypage.js`, `js/admin.js`; `js/orders.js` (status labels, `orderDetailHTML`) is shared by mypage, lookup and admin. Success/fail/lookup logic is inline in their HTML.

To add a category: add an entry to `CATEGORIES`, allow it in the `products.cat` check constraint, copy one of the category HTML files and set its `data-page`, then teach `productSVG` to draw it.

Card rank badges are by `score` (recent sales + wishes) within the category, whatever the active sort.

### Payment flow

- **Cart vs. buy-now:** "구매하기" writes `shop_direct` and opens `checkout.html?mode=direct`. The cart is cleared only after a successful cart-mode order.
- **Checkout:** on pay, `create_order` RPC builds a `pending` order with server-computed prices and returns `{orderId, amount, orderName}`; the widget amount is reset to that if it differs. `shop_pending_order` keeps only `{orderId, isDirect}`. Members pay with `customerKey = user.id`.
- **Success page:** calls `payment-confirm`; amount mismatch → AMOUNT_MISMATCH, sold out meanwhile → OUT_OF_STOCK (stock untouched), Toss failure → order `failed` and stock released. Virtual accounts end in `awaiting_deposit` until the webhook/admin sync flips them.
- **Testing:** the card step in the Toss window needs real card input, so don't complete it. Test with `success.html?paymentKey=x&orderId=<pending>&amount=<n>` (expect NOT_FOUND_PAYMENT_SESSION) and flip order status in SQL to check the order screens; delete test orders afterwards.

localStorage keys: `shop_cart`, `shop_cart_owner`, `shop_direct`, `shop_pending_order`, plus supabase-js's session. All shop access goes through `Store`.

## Conventions

- The CSS uses tokens on `:root` in `css/style.css` (`--sale` red, `--blue` pay button) and BEM-ish class names (`card__thumb`, `is-active`/`is-open` state classes). The responsive breakpoints are 1200, 960 and 640px, and the grid goes from 5 to 4, 3 and 2 columns.
- Code comments are in Korean; keep it that way. The exception is `.ps1` files, which must stay ASCII: Windows PowerShell 5.1 reads UTF-8 files without a BOM as ANSI.
- `productSVG` picks a shape from `p.type`. Compare the type exactly instead of matching a substring with a regex: `"반소매 티셔츠"` contains `"셔츠"`.
- The Pretendard font and supabase-js come from the jsDelivr CDN, and the Toss SDK comes from `https://js.tosspayments.com/v2/standard`. All need network access.
- `[hidden]` is forced to `display:none !important` because `.field` sets `display:grid`.
