# 5. Mock API 기능 및 템플릿

사용자가 외부 서비스로 반환되는 응답값을 자유롭게 커스터마이징할 수 있는 **Mock API** 기능입니다. 결제 모듈, 소셜 로그인 등 외부 연동 시 특정 응답에 따른 타임아웃, 예외 처리 등을 손쉽게 테스트할 수 있습니다.

## 5.1. 세부 설정 스펙 및 DB 모델

사용자가 직접 설정할 수 있는 항목:

- **Status Code**: 응답 상태 코드 (기본 200)
- **Response Delay**: 응답 지연 시간 (사용자 설정 최대 10,000ms 제한. _참고: 서버의 요청 하드 타임아웃은 15초입니다._)
- **Response Headers & Body**: 커스텀 헤더 및 반환 본문

**[DB/API 설계]**

- `Endpoint` 도큐먼트 내부에 `mockConfig` 서브 도큐먼트를 내장(Embed).
- 부분 수정 API (`PATCH /api/endpoints/{endpointId}/mock`)를 제공.
- 웹훅 수신 컨트롤러는 `delayMs`가 존재하면 비동기(DeferredResult)로 대기 후 설정된 헤더/바디와 함께 응답을 반환.

## 5.2. Mock API & Webhook 프리셋

"Webhook Catcher" 기능과 "Mock API" 기능이 개발자들에게 실질적인 테스트 가치를 제공할 수 있도록, 6개 주요 서비스(카카오, 토스페이먼츠, 포트원V2, 솔라피, 깃허브, 슬랙)의 **공식 문서를 기반으로 한 기술적 제약사항**과 **개발자 테스트 시나리오**를 종합하여 구성한 프리셋 목록입니다.

---

### 1. 카카오 (Kakao)

#### [REST API] OAuth 토큰 발급 및 사용자 정보 조회

- **프리셋 시나리오**: 로그인 성공, `invalid_client`, `invalid_grant`, `misconfigured`, 토큰 만료, 응답 지연(3/5초)
- **개발자가 테스트하는 것**: OAuth 예외 처리, 재로그인 로직, 서버 장애 시 Timeout 및 Fallback 처리
- **공식 기술 제약 (검증)**:
  - `invalid_client`: client_id/secret 누락, 잘못된 앱 키 타입(REST API 키 대신 JS 키 사용 등) 시 발생. (KOE010: client_secret 누락/불일치, KOE101: client_id 존재하지 않음)
  - `invalid_grant`: 인가 코드 또는 리프레시 토큰 만료/재사용 시, 혹은 redirect_uri가 불일치할 때 발생. (KOE320: 인가 코드 만료·재사용, KOE303: redirect_uri 불일치)
  - `misconfigured` (KOE009): 카카오 로그인 비활성화 등 플랫폼 설정 오류.

##### 응답 명세

**[성공] 토큰 발급 성공**

```
Status: 200 OK
Content-Type: application/json;charset=UTF-8
```

```json
{
  "token_type": "bearer",
  "access_token": "aGFzaD9hY2Nlc3N0b2tlbg.dummy-access-token-value",
  "expires_in": 21599,
  "refresh_token": "cmVmcmVzaHRva2Vu.dummy-refresh-token-value",
  "refresh_token_expires_in": 5183999,
  "scope": "profile_nickname profile_image"
}
```

---

**[실패] `invalid_client` — REST API 키 오류 (KOE101)**

```
Status: 400 Bad Request
Content-Type: application/json;charset=UTF-8
```

```json
{
  "error": "invalid_client",
  "error_description": "not exist client id or secret",
  "error_code": "KOE101"
}
```

---

**[실패] `invalid_grant` — 인가 코드 만료 (KOE320)**

```
Status: 400 Bad Request
Content-Type: application/json;charset=UTF-8
```

```json
{
  "error": "invalid_grant",
  "error_description": "authorization code not found for code=dummy-expired-code",
  "error_code": "KOE320"
}
```

---

**[실패] `misconfigured` — 카카오 로그인 미활성화 (KOE009)**

```
Status: 400 Bad Request
Content-Type: application/json;charset=UTF-8
```

```json
{
  "error": "misconfigured",
  "error_description": "misconfigured kakao login or not found kakao login",
  "error_code": "KOE009"
}
```

---

**[지연] 웹훅 타임아웃 테스트 (3.5초)**

```
Status: 200 OK  (delayMs: 3500)
Content-Type: application/json
```

_Body는 `ok` 문자열 또는 성공 응답. Delay 프리셋은 mockConfig의 `delayMs` 필드로 제어._

---

#### [Webhook] 계정 연결 해제 및 상태 변경

- **프리셋 시나리오**: 앱 연결 해제 알림, 카카오톡 채널 추가/차단 알림
- **개발자가 테스트하는 것**: 사용자 탈퇴에 따른 데이터 동기화 로직, 타임아웃 예외 처리
- **공식 기술 제약 (검증)**: 카카오 웹훅 서버는 **3초 이내에 HTTP 200 OK 응답**을 받아야 합니다. FlashHook의 `응답 지연(Delay)` 프리셋을 통해 타임아웃 엣지 케이스를 안전하게 테스트할 수 있습니다.

##### 응답 명세

> **FlashHook 동작 방식**: 이 프리셋에서 FlashHook은 카카오가 보내는 웹훅을 수신하는 서버 역할을 합니다. 아래 페이로드는 카카오 서버 → FlashHook으로 들어오는 수신 페이로드 예시이며, FlashHook은 이를 받고 200 OK를 반환해야 합니다.

**[수신] 앱 연결 해제 알림**

```
Method: POST  (카카오 → FlashHook)
Content-Type: application/json
```

```json
{
  "app_id": 123456,
  "user_id": 3891047281,
  "event": "unlink",
  "occurred_at": 1718251890
}
```

_FlashHook 응답: `200 OK` (Body 불필요 — 카카오는 상태 코드만 확인)_

---

**[지연] 타임아웃 테스트 (3초 초과)**

_mockConfig `delayMs: 3500` 설정으로 카카오의 3초 제한을 초과하는 시나리오를 재현._

---

#### **카카오디벨로퍼스 공식 문서 원본 링크**

[카카오디벨로퍼스 공식 문서](https://developers.kakao.com)

---

### 2. 토스페이먼츠 (Toss Payments)

#### [REST API] 결제 승인 및 취소

- **프리셋 시나리오**: 승인 성공/실패, 결제 취소/부분 취소, 이미 취소된 결제, 잔액 부족
- **개발자가 테스트하는 것**: 결제 예외 처리, 결제 실패 시 주문 롤백 처리, 재시도 정책
- **공식 기술 제약 (검증)**:
  - 승인 API: `ALREADY_PROCESSED_PAYMENT` (중복 승인), `PROVIDER_ERROR` (일시적 뱅킹망 장애), `INVALID_REJECT_CARD` (카드사 거절) 등의 400 에러를 명확하게 핸들링해야 합니다.
  - 취소 API: `ALREADY_CANCELED_PAYMENT` (이미 취소됨) 처리 및 멱등성 보장이 필수적입니다.

##### 응답 명세

**[성공] 결제 승인 성공**

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "mId": "tosspayments_dummy_mid",
  "lastTransactionKey": "TXN_20240115_ABCDE12345",
  "paymentKey": "tgen_20240115_abc12345",
  "orderId": "ORDER-2024-00001",
  "orderName": "FlashHook Pro 구독",
  "taxExemptionAmount": 0,
  "status": "DONE",
  "requestedAt": "2024-01-15T14:23:31+09:00",
  "approvedAt": "2024-01-15T14:23:33+09:00",
  "useEscrow": false,
  "cultureExpense": false,
  "card": {
    "issuerCode": "61",
    "acquirerCode": "11",
    "number": "4330123412341234",
    "installmentPlanMonths": 0,
    "isInterestFree": false,
    "approveNo": "00100012",
    "amount": 15000
  },
  "type": "NORMAL",
  "currency": "KRW",
  "totalAmount": 15000,
  "balanceAmount": 15000,
  "suppliedAmount": 13637,
  "vat": 1363,
  "taxFreeAmount": 0
}
```

---

**[실패] `ALREADY_PROCESSED_PAYMENT` — 중복 승인 시도**

```
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "code": "ALREADY_PROCESSED_PAYMENT",
  "message": "이미 처리된 결제입니다."
}
```

---

**[실패] `PROVIDER_ERROR` — 일시적 뱅킹망 장애**

```
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "code": "PROVIDER_ERROR",
  "message": "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}
```

---

**[실패] `ALREADY_CANCELED_PAYMENT` — 이미 취소된 결제**

```
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "code": "ALREADY_CANCELED_PAYMENT",
  "message": "이미 취소된 결제입니다."
}
```

---

**[실패] `INVALID_REJECT_CARD` — 카드사 거절**

```
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "code": "INVALID_REJECT_CARD",
  "message": "카드 사용이 거절되었습니다. 카드사에 문의해주세요."
}
```

---

#### [Webhook] 결제 상태 알림

- **프리셋 시나리오**: 가상계좌 입금 통보, 서비스 상태(Status Page) 변경 알림
- **개발자가 테스트하는 것**: 비동기 입금 확인, 중복 이벤트 방어 로직
- **공식 기술 제약 (검증)**: 가맹점 서버가 **HTTP 2xx를 10초 이내에 응답하지 않으면 최대 7회까지 재전송**합니다 _(재전송 간격: 지수 백오프, 1분 → 4분 → 16분 → ... → 4096분, 총 약 3일 19시간)_. Mock API에서 고의로 500 에러를 반환하여 멱등성(Idempotency) 로직과 중복 방어 처리를 테스트하는 데 최적화되어 있습니다.

> ⚠️ **기존 문서 수정**: 기존 서술 "HTTP 2xx를 응답하지 않으면"은 정확하나, 공식 문서 기준 응답 제한 시간은 **10초**이며 재전송 간격은 **지수 백오프** 방식입니다. 재전송 횟수 7회는 공식 문서에서 확인됨.

##### 응답 명세

**[수신] 가상계좌 입금 완료 웹훅**

```
Method: POST  (토스페이먼츠 → FlashHook)
Content-Type: application/json
```

```json
{
  "createdAt": "2024-01-15T18:30:00+09:00",
  "secret": "dummyWebhookSecretKey",
  "status": "DONE",
  "transactionKey": "TXN_20240115_VBANK001",
  "orderId": "ORDER-2024-00002"
}
```

_FlashHook 응답: `200 OK`_

---

**[재전송 테스트] 500 에러 반환**

```
Status: 500 Internal Server Error
Content-Type: application/json
```

```json
{
  "error": "internal_server_error",
  "message": "Mock: 의도적 서버 오류 — 재전송 로직 테스트용"
}
```

---

#### **토스페이먼츠 개발자 센터 공식 문서 원본 링크**

[토스페이먼츠 개발자센터](https://docs.tosspayments.com)

---

### 3. 포트원 V2 (PortOne)

#### [REST API] 결제 단건 조회 API

- **프리셋 시나리오**: 조회 성공(2000), 존재하지 않는 결제, 미승인 상태(PENDING-1000), 카드사 거절(6000번대)
- **개발자가 테스트하는 것**: 결제 검증 로직, 클라이언트 위변조 방어
- **공식 기술 제약 (검증)**:
  - 포트원 V2는 1000~8000번대의 세분화된 에러 코드를 제공합니다. (예: 4000번대 결제 유효성 오류, 5000번대 PG사 시스템 오류).
  - 지연 응답에 대비하여 클라이언트 단의 Read Timeout 60초 설정을 권장합니다. _(2025년 기준, 공식 문서 내 권고 수치이므로 변경 가능성 있음)_
  - 요청 중복 방지를 위해 `Idempotency-Key` 헤더를 검증하며, 중복 검출 시 409 (`IDEMPOTENCY_OUTSTANDING_REQUEST`)를 반환합니다.

##### 응답 명세

**[성공] 결제 조회 성공 (status: 2000)**

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "payment": {
    "id": "payment_dummy_abc123xyz",
    "transactionId": "txn_portone_20240115_001",
    "merchantId": "flashhook-merchant-01",
    "storeId": "store-dummy-001",
    "method": {
      "type": "Card",
      "card": {
        "publisher": { "code": "SHINHAN", "name": "신한카드" },
        "acquirer": { "code": "SHINHAN", "name": "신한카드" },
        "number": "433012******1234",
        "installmentMonth": 0,
        "isInterestFree": false,
        "approvalNumber": "12345678"
      }
    },
    "currency": "KRW",
    "amount": {
      "total": 25000,
      "taxFree": 0,
      "vat": 2273
    },
    "status": "PAID",
    "orderId": "ORDER-FH-2024-00005",
    "orderName": "FlashHook Enterprise Plan",
    "requestedAt": "2024-01-15T10:00:00+09:00",
    "paidAt": "2024-01-15T10:00:05+09:00"
  }
}
```

---

**[실패] 존재하지 않는 결제 조회**

```
Status: 404 Not Found
Content-Type: application/json
```

```json
{
  "type": "PAYMENT_NOT_FOUND",
  "message": "존재하지 않는 결제건입니다."
}
```

---

**[실패] 미승인 상태 (PENDING)**

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "payment": {
    "id": "payment_dummy_pending001",
    "status": "PENDING",
    "orderId": "ORDER-FH-2024-00006",
    "orderName": "FlashHook Basic Plan",
    "currency": "KRW",
    "amount": { "total": 9900 },
    "requestedAt": "2024-01-15T11:00:00+09:00"
  }
}
```

---

**[실패] 카드사 거절 (6000번대)**

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "payment": {
    "id": "payment_dummy_failed001",
    "status": "FAILED",
    "orderId": "ORDER-FH-2024-00007",
    "orderName": "FlashHook Basic Plan",
    "currency": "KRW",
    "amount": { "total": 9900 },
    "failedAt": "2024-01-15T12:00:03+09:00",
    "failure": {
      "pgCode": "6000",
      "pgMessage": "카드사 거절 — 한도 초과"
    }
  }
}
```

---

**[실패] 중복 요청 감지 (Idempotency-Key 충돌)**

```
Status: 409 Conflict
Content-Type: application/json
```

```json
{
  "type": "IDEMPOTENCY_OUTSTANDING_REQUEST",
  "message": "동일한 Idempotency-Key로 이미 처리 중인 요청이 있습니다."
}
```

---

#### [Webhook] 결제 웹훅

- **프리셋 시나리오**: 결제 승인 완료, 가상계좌 입금 완료, 결제 취소
- **개발자가 테스트하는 것**: 위변조 방지(시그니처 검증) 및 상태 머신 검증
- **공식 기술 제약 (검증)**: Standard Webhooks 스펙을 따르는 **웹훅 시그니처 검증**이 필수입니다. 잘못된 시그니처를 전송하는 프리셋을 통해 서버의 위변조 방지 로직을 테스트할 수 있으며, 실패 시 총 5회 재전송을 시도합니다. _(재전송 횟수 5회는 공식 문서 기준이나, 변경 가능성 있음)_

> ⚠️ **동적 응답 필요**: 포트원 V2 웹훅의 시그니처는 **`webhook-id`, `webhook-timestamp`, 페이로드 body를 조합한 HMAC-SHA256** 값입니다. 고정 mockConfig만으로는 요청마다 달라지는 타임스탬프 기반 시그니처를 올바르게 생성할 수 없습니다.\
> **필요 로직**: 요청 전송 시 `webhook-timestamp` = 현재 Unix 시간(초), `webhook-id` = UUID 생성 → `"${webhook-id}.${webhook-timestamp}.${body}"` 문자열을 시크릿 키로 HMAC-SHA256 서명 → `webhook-signature` 헤더에 `v1,<base64>` 형식으로 삽입.

##### 응답 명세

**[수신] 결제 승인 완료 웹훅 (Standard Webhooks 형식)**

```
Method: POST  (포트원 → FlashHook)
Content-Type: application/json
webhook-id: wh_dummy_id_20240115_001
webhook-timestamp: 1705283400
webhook-signature: v1,dummyBase64Signature==
```

```json
{
  "type": "Transaction.Paid",
  "data": {
    "paymentId": "payment_dummy_abc123xyz",
    "transactionId": "txn_portone_20240115_001"
  }
}
```

---

**[검증 실패] 잘못된 시그니처 전송 테스트**

```
Method: POST  (포트원 → FlashHook)
webhook-signature: v1,invalidSignatureForTesting==
```

_서버는 시그니처 불일치 감지 시 `400 Bad Request`를 반환해야 함._

---

#### **포트원 V2 공식 문서 원본 링크**

[포트원 V2 공식 문서](https://developers.portone.io)

---

### 4. 솔라피 (Solapi)

#### [REST API] 문자 발송 API & [Webhook] 발송 결과 알림

- **프리셋 시나리오**: 발송 성공(2000), 잔액 부족(1030), 발신번호 미등록(3059), 대량 발송(GROUP-REPORT)
- **개발자가 테스트하는 것**: 알림 시스템 및 SMS 상태 동기화
- **공식 기술 제약 (검증)**:
  - **REST API**: 1xxx(입력 파라미터 오류), 3xxx(통신사 에러) 등 명확한 에러 코드가 존재합니다. 번호는 하이픈 없는 숫자 포맷이어야 합니다.
  - **Webhook**: 수신 서버는 **5초 이내 HTTP 200 반환**이 필수입니다. 발송 실패(3xxx) 리포트를 수신해 다른 자동화 파이프라인(Make, n8n 등)으로 연계하는 로직을 테스트하기 좋습니다.

##### 응답 명세

**[성공] 문자 발송 성공 (statusCode: 2000)**

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "groupId": "G4V20240115093045ABCDE12345",
  "messageId": "M4V20240115093045FGHIJ67890",
  "to": "01098765432",
  "from": "01012345678",
  "type": "SMS",
  "statusCode": "2000",
  "statusMessage": "정상 접수"
}
```

---

**[실패] 잔액 부족 (statusCode: 1030)**

```
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "errorCode": "1030",
  "errorMessage": "잔액이 부족합니다."
}
```

---

**[실패] 발신번호 미등록/변작 의심 (statusCode: 3059)**

```
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "errorCode": "3059",
  "errorMessage": "번호도용문자차단서비스에 가입된 번호이거나 변작된 발신번호입니다."
}
```

---

**[수신] 발송 결과 웹훅 알림 (대량 발송 리포트)**

```
Method: POST  (솔라피 → FlashHook)
Content-Type: application/json
```

```json
{
  "groupId": "G4V20240115093045ABCDE12345",
  "type": "GROUP-REPORT",
  "count": {
    "total": 100,
    "sent": 97,
    "failed": 3
  },
  "completedAt": "2024-01-15T09:35:10+09:00"
}
```

_FlashHook 응답: `200 OK` (5초 이내)_

---

#### **SOLAPI 개발자 공식 문서 원본 링크**

[SOLAPI 개발자 문서](https://docs.solapi.com)

---

### 5. 깃허브 (GitHub)

#### [Webhook] Event Notifications

- **프리셋 시나리오**: Push Event, Pull Request Opened/Merged, Release Published
- **개발자가 테스트하는 것**: CI/CD 파이프라인 트리거, GitOps 이벤트 처리
- **공식 기술 제약 (검증)**:
  - 수신 서버는 **10초 이내에 2XX 응답을 반환**해야 합니다.
  - GitHub는 실패한 웹훅에 대해 **자동 재전송(Retry)을 지원하지 않으며 완전히 드롭**합니다. (동일 이벤트 재현을 위해서는 수동 재전송 또는 API 호출이 필요함)
  - `X-Hub-Signature-256` 헤더를 통해 무결성을 검증합니다. Mock API 프리셋으로 이런 페이로드를 반복 재현하면 로컬 개발 생산성을 크게 높일 수 있습니다.

> ⚠️ **동적 응답 필요**: GitHub 웹훅의 `X-Hub-Signature-256`은 `sha256=<HMAC-SHA256(secret, rawBody)>` 형식으로, **요청 body와 등록된 시크릿을 기반으로 매 요청마다 새로 계산**됩니다. 고정 mockConfig로는 올바른 시그니처를 포함한 헤더를 미리 설정할 수 없습니다.\
> **필요 로직**: body를 직렬화한 후 webhook secret으로 HMAC-SHA256 계산 → `sha256=` 접두사를 붙여 `X-Hub-Signature-256` 헤더에 삽입. 서버는 반드시 raw body 기준으로 검증해야 합니다 (JSON 파싱 후 재직렬화 시 포맷 차이로 검증 실패 가능).

##### 응답 명세

**[수신] Push Event**

```
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: push
X-GitHub-Delivery: a1b2c3d4-e5f6-7890-abcd-ef1234567890
X-Hub-Signature-256: sha256=dummyhmacsha256signaturevalue1234567890abcdef
```

```json
{
  "ref": "refs/heads/main",
  "before": "abc123def456abc123def456abc123def456abc12",
  "after": "789xyz012789xyz012789xyz012789xyz012789xy",
  "repository": {
    "id": 987654321,
    "name": "my-awesome-app",
    "full_name": "flashhook-user/my-awesome-app",
    "private": false,
    "html_url": "https://github.com/flashhook-user/my-awesome-app"
  },
  "pusher": {
    "name": "flashhook-user",
    "email": "dev@flashhook.io"
  },
  "commits": [
    {
      "id": "789xyz012789xyz012789xyz012789xyz012789xy",
      "message": "feat: webhook 연동 테스트 추가",
      "timestamp": "2024-01-15T14:30:00+09:00",
      "author": { "name": "FlashHook Dev", "email": "dev@flashhook.io" },
      "added": ["src/webhook/handler.ts"],
      "modified": [],
      "removed": []
    }
  ],
  "head_commit": {
    "id": "789xyz012789xyz012789xyz012789xyz012789xy",
    "message": "feat: webhook 연동 테스트 추가",
    "timestamp": "2024-01-15T14:30:00+09:00"
  }
}
```

---

**[수신] Pull Request Opened**

```
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: pull_request
X-GitHub-Delivery: b2c3d4e5-f6a7-8901-bcde-f12345678901
X-Hub-Signature-256: sha256=dummyhmacsha256signaturevalue_pr_opened
```

```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "id": 112233445,
    "html_url": "https://github.com/flashhook-user/my-awesome-app/pull/42",
    "state": "open",
    "title": "feat: Mock API 프리셋 시나리오 추가",
    "user": { "login": "flashhook-contributor" },
    "head": { "ref": "feature/mock-api-presets", "sha": "abc123feature" },
    "base": { "ref": "main", "sha": "789xyz012main" },
    "created_at": "2024-01-15T15:00:00Z",
    "body": "Mock API 프리셋 6종 추가 작업입니다."
  },
  "repository": {
    "name": "my-awesome-app",
    "full_name": "flashhook-user/my-awesome-app"
  },
  "sender": { "login": "flashhook-contributor" }
}
```

---

**[수신] Release Published**

```
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: release
X-GitHub-Delivery: c3d4e5f6-a7b8-9012-cdef-123456789012
X-Hub-Signature-256: sha256=dummyhmacsha256signaturevalue_release
```

```json
{
  "action": "published",
  "release": {
    "id": 55566677,
    "tag_name": "v1.2.0",
    "name": "FlashHook v1.2.0 — Mock API 프리셋 지원",
    "body": "## 변경 사항\n- Mock API 프리셋 6종 추가\n- 응답 지연 설정 개선",
    "draft": false,
    "prerelease": false,
    "created_at": "2024-01-15T16:00:00Z",
    "published_at": "2024-01-15T16:05:00Z",
    "html_url": "https://github.com/flashhook-user/my-awesome-app/releases/tag/v1.2.0"
  },
  "repository": {
    "name": "my-awesome-app",
    "full_name": "flashhook-user/my-awesome-app"
  },
  "sender": { "login": "flashhook-user" }
}
```

---

#### **GitHub Webhooks 공식 문서 원본 링크**

[GitHub Webhooks 문서](https://docs.github.com/en/webhooks)

---

### 6. 슬랙 (Slack)

#### [Webhook / Events API] URL Verification & App Events

- **프리셋 시나리오**: 검증 성공(Handshake), `app_mention`, `message`, `retry` 이벤트
- **개발자가 테스트하는 것**: 최초 Slack App 연동 검증, 봇 이벤트 라우팅, 재전송 방어
- **공식 기술 제약 (검증)**:
  - **URL Verification**: 앱 최초 연동 시 전달되는 JSON의 `challenge` 파라미터 값을 그대로 텍스트 혹은 JSON 본문으로 반환해야만 검증을 통과합니다.
  - **Events API Retry**: 서버가 **3초 이내에 응답하지 않으면, 최대 3회 자동 재전송**합니다. _(재전송 간격이 "1분 단위의 지수 백오프"라는 서술은 공식 문서에서 명확히 확인되지 않음 — 2025년 기준 변경 가능성 있음)_
  - 중복 처리를 방지하기 위해 헤더의 `X-Slack-Retry-Num`을 확인해야 하며, 재시도를 중단하고 싶다면 응답에 `X-Slack-No-Retry: 1` 헤더를 포함시키는 로직 등을 정교하게 테스트할 수 있습니다.

> ⚠️ **동적 응답 필요 (URL Verification)**: Slack이 전송하는 `challenge` 값은 매 요청마다 랜덤하게 생성되는 문자열입니다. 고정 mockConfig로는 이 값을 응답 body에 echo할 수 없습니다.\
> **필요 로직**: 수신된 요청 body를 파싱 → `challenge` 필드 추출 → `{"challenge": "<추출된 값>"}` 형태의 JSON을 `Content-Type: application/json`으로 즉시 반환. 또는 `Content-Type: text/plain`으로 challenge 문자열만 반환해도 검증 통과.

##### 응답 명세

**[수신] URL Verification (Challenge Handshake)**

```
Method: POST  (Slack → FlashHook)
Content-Type: application/json
```

```json
{
  "token": "deprecated-legacy-token-value",
  "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
  "type": "url_verification"
}
```

_FlashHook 응답 (⚠️ 동적 응답 필요):_

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P"
}
```

---

**[수신] `app_mention` 이벤트**

```
Method: POST  (Slack → FlashHook)
Content-Type: application/json
X-Slack-Signature: v0=dummyslacksignaturehash1234567890abcdef
X-Slack-Request-Timestamp: 1705283400
```

```json
{
  "token": "deprecated-legacy-token-value",
  "team_id": "T0FLASHHK1",
  "api_app_id": "A0FLASHAPP",
  "event": {
    "type": "app_mention",
    "user": "U0USER1234",
    "text": "<@U0BOTID123> webhook 테스트 시작해줘",
    "ts": "1705283400.000016",
    "channel": "C0CHANNEL1",
    "event_ts": "1705283400000016"
  },
  "type": "event_callback",
  "event_id": "Ev0EVENTID1",
  "event_time": 1705283400
}
```

_FlashHook 응답: `200 OK` (3초 이내, body 없음 또는 빈 JSON `{}`)_

---

**[수신] `retry` 이벤트 (재전송 방어 테스트)**

```
Method: POST  (Slack → FlashHook)
Content-Type: application/json
X-Slack-Retry-Num: 1
X-Slack-Retry-Reason: http_timeout
```

```json
{
  "type": "event_callback",
  "event_id": "Ev0EVENTID1",
  "event": {
    "type": "app_mention",
    "user": "U0USER1234",
    "text": "<@U0BOTID123> webhook 테스트 시작해줘",
    "ts": "1705283400.000016"
  }
}
```

_재시도 중단 응답:_

```
Status: 200 OK
X-Slack-No-Retry: 1
```

---

#### **Slack Events API 공식 문서 원본 링크**

[Slack Events API 문서](https://api.slack.com/events-api)

---

#### [동적 응답 핸들러]

Slack URL Verification 시나리오는 수신되는 `challenge` 값을 그대로 반환해야 하는 특수성이 있습니다.
이를 해결하기 위해 FlashHook Backend/Frontend에 `presetType` 기반의 동적 핸들러가 구축되었습니다.

- **Frontend (`presets.ts`)**: Slack URL Verification (Challenge Echo) 시나리오 선택 시 `isDynamic: true` 속성을 사용해 상태 코드/바디 편집 UI를 비활성화하고 `presetType: 'SLACK_URL_VERIFICATION'`을 Backend로 전달합니다.
- **Backend (`MockResponseScheduler.java`)**: `presetType`이 일치하면 `handleSlackUrlVerification(rawBody)`로 라우팅하여 JSON 페이로드 내 `"type": "url_verification"` 여부를 확인하고 `"challenge"` 값을 동적으로 추출하여 반환합니다.
