# WEAR.LAB — 토스페이먼츠 연동 쇼핑몰 퍼블리싱

HTML · CSS · JS 로만 만든 옷 쇼핑몰 데모입니다. 토스페이먼츠 결제위젯(v2, 테스트 키)으로 결제창까지 연동되어 있습니다.

## 페이지
- `top.html` 상의 / `shoes.html` 신발 / `pants.html` 바지
- `checkout.html` 주문서 + 토스페이먼츠 결제위젯
- `success.html` / `fail.html` 결제 결과

## 실행
`file://` 로 열면 결제가 동작하지 않으므로 로컬 서버로 실행합니다.

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

http://localhost:8080 접속

## 참고
- `js/checkout.js` 의 `TOSS_CLIENT_KEY` 는 토스페이먼츠 문서 공개용 테스트 키입니다. 운영 시 본인 결제위젯 키로 교체하세요.
- 결제 확정은 서버에서 시크릿 키로 `POST /v1/payments/confirm` 을 호출해야 합니다 (이 저장소는 퍼블리싱만 포함).
