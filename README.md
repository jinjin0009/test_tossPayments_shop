# WEAR.LAB — 토스페이먼츠 연동 쇼핑몰

HTML · CSS · JS 로 만든 옷 쇼핑몰입니다. 상품·재고·주문·회원은 Supabase(무료 요금제)에 저장하고, 결제는 토스페이먼츠 결제위젯(v2, 테스트 키)으로 실제 승인까지 처리합니다.

운영자용 안내는 [운영안내.md](운영안내.md) 를 보세요.

## 페이지
- `top.html` 상의 / `shoes.html` 신발 / `pants.html` 바지 / `search.html` 검색 · 랭킹 · 세일
- `checkout.html` 주문서 + 토스페이먼츠 결제위젯
- `success.html` / `fail.html` 결제 결과 (success 에서 서버 승인 처리)
- `login.html` 로그인 · 회원가입 · 비밀번호 찾기 · 카카오/구글
- `mypage.html` 주문 내역 · 취소 · 후기 · 찜 · 배송지 · 내 정보
- `order-lookup.html` 비회원 주문 조회
- `admin.html` 관리자 (현황판 · 주문/배송 · 환불 · 상품/재고/사진 · 후기)

## 실행
`file://` 로 열면 결제가 동작하지 않으므로 로컬 서버로 실행합니다.

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

http://localhost:8080 접속

## 서버 쪽
- Supabase 프로젝트 `wearlab-shop` (ref `xkdgxkltowytzpzkkefl`, 서울)
- 결제 서버 기능(Edge Functions): `supabase/functions/` 에 원본 보관 — `payment-confirm`, `order-cancel`, `toss-webhook`
- 토스 시크릿 키는 Edge Function 환경변수 `TOSS_SECRET_KEY` (없으면 문서 공개용 테스트 키 사용)
