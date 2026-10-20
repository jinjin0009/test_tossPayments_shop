# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

WEAR.LAB: a static clothing-shop front end in plain HTML, CSS and JavaScript (no framework, no bundler, no package.json, no tests). Its payments go through the Toss Payments widget SDK v2 in test mode. The UI copy is Korean, and the visual style follows a Musinsa-like look (black GNB, dense product grid, red discount %) without using that brand.

`PRD.md` is the plan for the next step: Supabase integration (DB, auth, payment confirmation). It has 25 features in 5 phases, each with plain-language done checks. Build in its phase order and verify against those checks. It was written for a non-developer owner, so keep it free of technical detail.

## Running

The checkout only works over http. Toss rejects `file://` success/fail URLs, and the page shows a warning when opened that way. `serve.ps1` is a minimal PowerShell `HttpListener` static server. The project doesn't need Node or Python; Node is installed only for the Toss MCP server.

```
powershell -ExecutionPolicy Bypass -File serve.ps1          # http://localhost:8080
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 9000
```

`index.html` just redirects to `top.html`.

### Verifying changes

- **Preview:** `.claude/launch.json` in the parent folder `d_2` defines the preview server `shop`, which runs `serve.ps1` on port 8080. Use it for the browser pane.
- **Driving the shop from JS:** the page globals let you skip clicking, e.g. `openModal("s01")`, `Cart.add(id, size, qty)`, `Cart.items()`.
- **Toss payment window:** it is a cross-origin iframe and hard to drive in the small preview pane. To test the success page, redirect to `success.html?paymentKey=x&orderId=<pending.orderId>&amount=<pending.amount>`, using the values saved in `shop_pending_order`.
- **Testing a stdio MCP server:** send `initialize` and `tools/list` from a small Node script. Async stdout reads in PowerShell hang.

### Machine setup (Windows, portable tools, no admin)

- **Git:** MinGit at `%LOCALAPPDATA%\Programs\MinGit\cmd`. It's on the user PATH, but shells launched by the Claude app may not see it, so call `git.exe` by full path. Port 22 is blocked, so GitHub SSH goes through `ssh.github.com:443` (configured in `~/.ssh/config`). Remote: `git@github.com:jinjin0009/test_tossPayments_shop.git`, branch `main`.
- **Chaining commands in Windows PowerShell 5.1:** `&&` doesn't exist, and `;` keeps going after a failed `git add`, which can produce a half-staged commit. Gate the next step with `if ($LASTEXITCODE -eq 0) { ... }`.
- **Node.js:** v24 LTS at `%LOCALAPPDATA%\Programs\nodejs`. The same PATH caveat applies.
- **Toss docs MCP:** `.mcp.json` (gitignored, because it contains machine paths) starts the globally installed `@tosspayments/integration-guide-mcp`. Use its `get-documents` tool for Toss API questions instead of guessing.
- **Plugins:** `claude plugin install` needs the Git directory on PATH. The CLI is bundled at `%APPDATA%\Claude\claude-code\<version>\...\claude.exe`.

## Architecture

Every page is a thin HTML shell: `<body data-page="...">` plus an empty `<header id="gnb">` and `<main id="main">`. The JS renders everything. Scripts are plain globals loaded in this order, and the order matters:

1. `js/products.js` is the shared data layer. It defines `CATEGORIES` (per-category label, filter chips, size list, banner copy, page file), `PRODUCTS`, price helpers (`salePrice` rounds the discounted price to 100원), `productSVG(p)`, and the `Store`/`Cart` localStorage wrappers.
2. `js/app.js` is loaded on every page. It reads `document.body.dataset.page`, renders the GNB, the cart badge and the cart drawer, and binds search. If the page key is in `CATEGORIES` (`top`/`shoes`/`pants`), it also renders the category page (filters, sort, grid, detail modal). Changes to the cart dispatch a `cart:change` DOM event, which re-renders the badge and drawer.
3. `js/checkout.js` runs only on `checkout.html`. Success and fail logic is inline in `success.html` and `fail.html`.

To add a category: add an entry to `CATEGORIES`, add products with that `cat`, copy one of the category HTML files and set its `data-page`, then teach `productSVG` to draw it.

Product images are SVG illustrations generated from `p.cat`, `p.type` and `p.color`; there are no image files. The rank shown on cards is always by `likes`, whatever the active sort.

### Payment flow

- **Cart vs. buy-now:** "구매하기" in the modal writes `shop_direct` to localStorage and opens `checkout.html?mode=direct`. Otherwise checkout uses the cart. The cart is cleared only after a successful cart-mode order.
- **Checkout:** `checkout.js` totals the order (free shipping at ≥50,000원, else 3,000원), then calls `TossPayments(key).widgets({ customerKey: ANONYMOUS })`, `setAmount`, `renderPaymentMethods('#payment-method')` and `renderAgreement('#agreement')`. On pay it saves `shop_pending_order` (`orderId`, `amount`, items, `isDirect`) and calls `widgets.requestPayment` with absolute success/fail URLs.
- **Success page:** `success.html` checks that the `orderId` and `amount` in the query string match `shop_pending_order` (tamper check) before showing a completed order.
- **No server:** there is no backend, so the payment is never confirmed. A real integration must `POST https://api.tosspayments.com/v1/payments/confirm` with the secret key server-side, otherwise the payment expires after 10 minutes.
- **Client key:** `TOSS_CLIENT_KEY` in `js/checkout.js` is the public docs test widget key (`test_gck_docs_...`). A production widget key replaces it there.

localStorage keys: `shop_cart`, `shop_direct`, `shop_pending_order`. All access goes through `Store`, which swallows storage errors.

## Conventions

- The CSS uses tokens on `:root` in `css/style.css` (`--sale` red, `--blue` pay button) and BEM-ish class names (`card__thumb`, `is-active`/`is-open` state classes). The responsive breakpoints are 1200, 960 and 640px, and the grid goes from 5 to 4, 3 and 2 columns.
- Code comments are in Korean; keep it that way. The exception is `.ps1` files, which must stay ASCII: Windows PowerShell 5.1 reads UTF-8 files without a BOM as ANSI.
- `productSVG` picks a shape from `p.type`. Compare the type exactly instead of matching a substring with a regex: `"반소매 티셔츠"` contains `"셔츠"`.
- The Pretendard font comes from the jsDelivr CDN, and the Toss SDK comes from `https://js.tosspayments.com/v2/standard`. Both need network access.
