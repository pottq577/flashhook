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

> ⚠️ **현재 구현 상태 안내**:
> 현재 백엔드 코드상 외부 연동을 돕는 **동적 프리셋 기능**이 완비되어 있습니다.
>
> - **수신 파이프라인(Response)**: Slack URL Verification (요청의 `challenge`를 읽고 즉각 응답)
> - **발송 파이프라인(Request Generation)**: GitHub (`X-Hub-Signature-256`), PortOne V2 (`webhook-signature`)의 시그니처 자동 생성 후 Replay 발송 지원.

---

### 1. 카카오 (Kakao)

#### [REST API] OAuth 토큰 발급 및 사용자 정보 조회

- **프리셋 시나리오**: 로그인 성공, `invalid_client`, `invalid_grant`, `misconfigured`, 토큰 만료, 응답 지연(3/5초)
- **개발자가 테스트하는 것**: OAuth 예외 처리, 재로그인 로직, 서버 장애 시 Timeout 및 Fallback 처리
- **공식 기술 제약 (검증)**:
  - `invalid_client`: client_id/secret 누락, 잘못된 앱 키 타입(REST API 키 대신 JS 키 사용 등) 시 발생. (KOE010: client_secret 누락/불일치, KOE101: client_id 존재하지 않음)
  - `invalid_grant`: 인가 코드 또는 리프레시 토큰 만료/재사용 시, 혹은 redirect_uri가 불일치할 때 발생. (KOE320: 인가 코드 만료·재사용, KOE303: redirect_uri 불일치)
  - `misconfigured` (KOE009): 등록되지 않은 플랫폼에서 액세스 토큰을 요청한 경우 (android_key_hash, ios_bundle_id, web_site_url 불일치).

##### 응답 명세

**[성공] 토큰 발급 성공**

```http
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

```http
Status: 400 Bad Request
Content-Type: application/json;charset=UTF-8
```

```json
{
  "error": "invalid_client",
  "error_description": "Not exist client_id flashhook-dummy-rest-api-key",
  "error_code": "KOE101"
}
```

---

**[실패] `invalid_grant` — 인가 코드 만료 (KOE320)**

```http
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

- Note: `authorization code not found for code=${AUTHORIZATION_CODE}` 형식이 카카오 공식 패턴입니다.

---

**[실패] `misconfigured` — 등록되지 않은 플랫폼 (KOE009)**

```http
Status: 400 Bad Request
Content-Type: application/json;charset=utf-8
```

```json
{
  "error": "misconfigured",
  "error_description": "invalid android_key_hash or ios_bundle_id or web_site_url",
  "error_code": "KOE009"
}
```

---

**[지연] 웹훅 타임아웃 테스트 (3.5초)**

```http
Status: 200 OK  (delayMs: 3500)
Content-Type: application/json
```

_Body는 `ok` 문자열 또는 성공 응답. Delay 프리셋은 mockConfig의 `delayMs` 필드로 제어._

---

#### [Webhook] 계정 상태 변경 알림 (SSF/SET) 및 레거시 연결 해제

- **프리셋 시나리오**: 앱 연결 해제 알림 (구버전 Unlink), 계정 상태 변경 (SSF/SET) 4종(연결 해제, 토큰 만료, 계정 비활성화, 프로필 변경)
- **개발자가 테스트하는 것**: 사용자 탈퇴/계정 정지/비밀번호 변경에 따른 토큰 만료 및 동기화 로직, 타임아웃 예외 처리
- **공식 기술 제약 (검증)**: 카카오 SSF 웹훅 서버는 **3초 이내에 HTTP 202 Accepted 응답**(단, Legacy Unlink 및 카카오톡 채널 콜백 웹훅은 200 OK)을 받아야 합니다. FlashHook의 `응답 지연(Delay)` 프리셋을 통해 타임아웃 엣지 케이스를 안전하게 테스트할 수 있습니다.

##### 응답 명세

> **FlashHook 동작 방식**: 이 프리셋에서 FlashHook은 카카오가 보내는 웹훅을 수신하는 서버 역할을 합니다. 아래 페이로드는 카카오 서버 → FlashHook으로 들어오는 수신 페이로드 예시이며, FlashHook은 이를 받고 202 Accepted (레거시는 200 OK)를 반환해야 합니다.

**[수신] 계정 상태 변경 - 연결 해제 (SSF/SET)**

```http
Method: POST  (카카오 → FlashHook)
Content-Type: application/secevent+jwt
```

```json
{
  "iss": "https://kauth.kakao.com",
  "aud": "123456",
  "iat": 1718251890,
  "toe": 1718251885,
  "txm": "tx-abc-123",
  "jti": "some-unique-jwt-id",
  "events": {
    "https://schemas.openid.net/secevent/oauth/event-type/user-unlinked": {
      "subject": {
        "subject_type": "iss-sub",
        "iss": "https://kauth.kakao.com",
        "sub": "3891047281"
      },
      "reason": "UNLINK_FROM_APPS"
    }
  }
}
```

- Note: 카카오 SSF 이벤트는 이외에도 Tokens Revoked, Account Disabled, User Profile Changed 등 총 17가지가 있으며 프리셋에 주요 4가지가 구현되어 있습니다.

_FlashHook 응답: `202 Accepted` (Body 불필요 — 카카오는 상태 코드만 확인)_

---

**[수신] 앱 연결 해제 알림 (레거시 Unlink)**

```http
Method: POST  (카카오 → FlashHook)
Content-Type: application/x-www-form-urlencoded
```

```text
app_id=123456&user_id=3891047281&referrer_type=UNLINK_FROM_APPS&group_user_token=Yzg5MDQ4MDM4...
```

- Note: 실제로는 위와 같이 form 데이터 형식으로 전송됩니다. FlashHook 프리셋에서는 사용 편의를 위해 이 단순 필드 맵을 JSON 형태로 추상화하여 제공합니다. `referrer_type`은 `ACCOUNT_DELETE | FORCED_ACCOUNT_DELETE | UNLINK_FROM_ADMIN | UNLINK_FROM_APPS | INCOMPLETE_SIGN_UP` 중 하나의 값을 가집니다.

_FlashHook 응답: `200 OK` (Body 불필요 — 카카오는 상태 코드만 확인)_

---

**[지연] 타임아웃 테스트 (3초 초과)**

_mockConfig `delayMs: 3500` 설정으로 카카오의 3초 제한을 초과하는 시나리오를 재현._

---

#### [Webhook] 카카오톡 채널 추가/차단 알림

- **프리셋 시나리오**: 카카오톡 채널 추가 알림, 카카오톡 채널 차단 알림
- **개발자가 테스트하는 것**: 카카오 비즈니스 채널 추가/차단 연동에 따른 CRM 연동, 메시지 발송 동기화
- **공식 기술 제약 (검증)**: 카카오톡 채널 추가/차단 알림 웹훅은 카카오 비즈니스(채널 관리자센터)의 별도 웹훅 시스템에 속하며, 성공 시 **HTTP 200 OK**를 반환해야 합니다.

##### 응답 명세

> **FlashHook 동작 방식**: 이 프리셋에서 FlashHook은 카카오 비즈니스가 보내는 웹훅을 수신하는 서버 역할을 합니다. 아래 페이로드는 카카오 비즈니스 서버 → FlashHook으로 들어오는 수신 페이로드 예시이며, FlashHook은 이를 받고 200 OK를 반환해야 합니다.

**[수신] 카카오톡 채널 추가 알림**

```http
Method: POST  (카카오 비즈니스 → FlashHook)
Content-Type: application/json
```

```json
{
  "event": "add_channel",
  "id": "123456",
  "user_id": "3891047281",
  "channel_uuid": "ch_123456",
  "updated_at": "2024-01-15T18:30:00Z"
}
```

_FlashHook 응답: `200 OK` (Body 불필요 — 카카오는 상태 코드만 확인)_

---

##### 카카오 웹훅 시스템 차이 비교

| 구분              | 카카오 로그인 SSF/SET 웹훅            | 카카오톡 채널 콜백 / 구버전 Unlink 웹훅                |
| ----------------- | ------------------------------------- | ------------------------------------------------------ |
| **제공 기관**     | developers.kakao.com                  | 카카오 디벨로퍼스 / 채널 관리자센터                    |
| **성공 응답**     | `HTTP 202 Accepted`                   | `HTTP 200 OK`                                          |
| **페이로드 포맷** | SET (Security Event Token - JWT 기반) | JSON (플랫 구조)                                       |
| **주요 이벤트**   | OAUTH, RISC, CAEP 카테고리            | 채널 추가/차단, 구버전 Unlink                          |

---

#### **카카오디벨로퍼스 공식 문서 원본 링크**

[카카오디벨로퍼스 공식 문서](https://developers.kakao.com)

---

### 2. 토스페이먼츠 (Toss Payments)

#### [REST API] 결제 승인 및 취소

- **프리셋 시나리오**: 승인 성공/실패, 결제 취소/부분 취소, 이미 취소된 결제, 잔액 부족
- **개발자가 테스트하는 것**: 결제 예외 처리, 결제 실패 시 주문 롤백 처리, 재시도 정책
- **공식 기술 제약 (검증)**:
  - 승인 API: `ALREADY_PROCESSED_PAYMENT` (중복 승인), `INVALID_REJECT_CARD` (카드사 거절) 등의 400 에러 및 `FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING` (일시적 뱅킹망 장애) 등의 500 에러를 명확하게 핸들링해야 합니다.
  - 취소 API: `ALREADY_CANCELED_PAYMENT` (이미 취소됨) 처리 및 멱등성 보장이 필수적입니다.

##### 응답 명세

**[성공] 결제 승인 성공**

```http
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

```http
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

**[실패] `FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING` — 일시적 뱅킹망 장애**

```http
Status: 500 Internal Server Error
Content-Type: application/json
```

```json
{
  "code": "FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING",
  "message": "결제 기관에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}
```

---

**[실패] `ALREADY_CANCELED_PAYMENT` — 이미 취소된 결제**

```http
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

```http
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

```http
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

**[수신] 결제 상태 변경 웹훅**

```http
Method: POST  (토스페이먼츠 → FlashHook)
Content-Type: application/json
```

```json
{
  "eventType": "PAYMENT.STATUS_CHANGED",
  "createdAt": "2024-01-15T18:30:00.123456+09:00",
  "data": {
    "paymentKey": "tgen_20240115_abc12345",
    "orderId": "ORDER-2024-00001",
    "status": "DONE"
  }
}
```

_FlashHook 응답: `200 OK`_

---

##### 결제 웹훅 시스템 비교 (포트원 V2 vs 토스페이먼츠)

| 구분                 | 포트원 V2 결제 웹훅                            | 토스페이먼츠 결제 웹훅                                  |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| **이벤트 타입**      | Standard Webhooks (`Transaction.Paid` 등)      | 토스페이먼츠 고유 구조 (`PAYMENT.STATUS_CHANGED` 등)    |
| **인증/서명**        | `webhook-signature` 헤더 (HMAC-SHA256)         | 서명 헤더 미제공 (가상계좌 입금 통보 등 일반 웹훅 기준) |
| **재시도 제한 시간** | 각 시도 실패 시 exponential backoff 적용 (5회) | 각 시도 실패 시 지수 백오프 적용 (7회)                  |

---

**[재전송 테스트] 500 에러 반환**

```http
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
  - 지연 응답에 대비하여 클라이언트 단의 Connection Timeout 및 Read Timeout을 모두 30초로 설정해야 합니다.
  - 요청 중복 방지를 위해 `Idempotency-Key` 헤더를 검증하며, 중복 검출 시 409 (`IDEMPOTENCY_OUTSTANDING_REQUEST`)를 반환합니다.

##### 응답 명세

**[성공] 결제 조회 성공 (status: 2000)**

```http
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

```http
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

```http
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

```http
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

```http
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
- **공식 기술 제약 (검증)**: Standard Webhooks 스펙을 따르는 **웹훅 시그니처 검증**이 필수입니다. 잘못된 시그니처를 전송하는 프리셋을 통해 서버의 위변조 방지 로직을 테스트할 수 있습니다. 네트워크 문제나 고객사 오류로 웹훅이 실패할 경우 **포트원 V2는 기본적으로 최대 5회까지 자동 재전송**합니다. 재전송 간격은 exponential backoff(`0 → 1 → 4 → 16 → 64 → 256분`) + jittering이 적용됩니다. Mock API에서 의도적으로 400/500을 반환하여 이 5회 재시도 패턴이 가맹점 서버에서 정확히 멱등 처리되는지 검증하는 데 최적입니다. _(참고: 재전송 간격(분 단위 스케줄)은 포트원 자체 문서 페이지 간에도 0→1→4→16→256분과 0→1→4→16→64→256분로 약간 다르게 기재되어 있어, 정확한 최신 간격은 포트원 콘솔 또는 고객지원에 별도 확인이 필요하다.)_

> ⚠️ **동적 시그니처 생성 (구현 완료)**: 포트원 V2 웹훅의 시그니처는 **`webhook-id`, `webhook-timestamp`, 페이로드 body를 조합한 HMAC-SHA256** 값입니다.
> **발송 처리 로직**: 웹훅 로그 Replay 발송 시 `webhook-timestamp` = 현재 Unix 시간(초), `webhook-id` = UUID 생성 → `"{webhook-id}.{webhook-timestamp}.{body}"` 문자열을 AES-256으로 복호화한 시크릿 키로 HMAC-SHA256 서명 → `webhook-signature` 헤더에 `v1,<base64>` 형식으로 삽입되어 안전하게 발송됩니다.

##### 응답 명세

**[수신] 결제 승인 완료 웹훅 (Standard Webhooks 형식)**

```http
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

```http
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

- **프리셋 시나리오**: 발송 성공(2000), 잔액 부족(1030), 도용차단 가입 번호(3059), 대량 발송(GROUP-REPORT)
- **개발자가 테스트하는 것**: 알림 시스템 및 SMS 상태 동기화
- **공식 기술 제약 (검증)**:
  - **REST API**: 1xxx(입력 파라미터 오류), 3xxx(통신사 에러) 등 명확한 에러 코드가 존재합니다. 번호는 하이픈 없는 숫자 포맷이어야 합니다.
  - **Webhook**: 솔라피 웹훅은 **5초 이내에 HTTP 200번대 응답을 반환**해야 합니다. 타임아웃 발생 시 실패로 간주되어 지수 백오프(매회 2배 증가)로 최대 7회 재시도되며, 총 8회 모두 실패 시 웹훅이 INACTIVE 상태로 자동 전환됩니다. 발송 실패(3xxx) 리포트를 수신해 다른 자동화 파이프라인(Make, n8n 등)으로 연계하는 로직을 테스트하기 좋습니다.

##### 응답 명세

**[성공] 문자 발송 성공 (statusCode: 2000)**

```http
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

```http
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

**[실패] 도용차단 가입 번호 (statusCode: 3059)**

```http
Status: 400 Bad Request
Content-Type: application/json
```

```json
{
  "errorCode": "3059",
  "errorMessage": "번호도용문자 차단 서비스에 가입된 발신번호입니다."
}
```

---

**[수신] 발송 결과 웹훅 알림 (대량 발송 리포트)**

```http
Method: POST  (솔라피 → FlashHook)
Content-Type: application/json
```

```json
{
  "groupId": "G4V20240115093045ABCDE12345",
  "accountId": "111111111111",
  "type": "GROUP-REPORT",
  "status": "COMPLETE",
  "count": {
    "total": 100,
    "sentSuccess": 97,
    "sentFailed": 3,
    "sentPending": 0
  },
  "dateSent": "2024-01-15T09:30:10+09:00",
  "dateCompleted": "2024-01-15T09:35:10+09:00"
}
```

_FlashHook 응답: `200 OK` (5초 이내, Body 내용은 무시되고 HTTP 200번대만 반환하면 성공 처리됨)_

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

> ⚠️ **동적 시그니처 생성 (구현 완료)**: GitHub 웹훅의 `X-Hub-Signature-256`은 `sha256=<HMAC-SHA256(secret, rawBody)>` 형식으로, **요청 body와 등록된 시크릿을 기반으로 매 요청마다 새로 계산**됩니다.
> **발송 처리 로직**: Replay 발송 전 raw body를 직렬화한 후 AES-256으로 복호화된 webhook secret으로 HMAC-SHA256 계산 → `sha256=` 접두사를 붙여 `X-Hub-Signature-256` 헤더에 삽입하여 무결성 검증을 통과하도록 발송됩니다.

##### 응답 명세

**[수신] Push Event**

```http
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: push
X-GitHub-Delivery: a1b2c3d4-e5f6-7890-abcd-ef1234567890
X-Hub-Signature-256: sha256=dummyhmacsha256signaturevalue1234567890abcdef
X-GitHub-Hook-ID: 12345678
X-GitHub-Hook-Installation-Target-Type: repository
X-GitHub-Hook-Installation-Target-ID: 987654321
User-Agent: GitHub-Hookshot/abc1234
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

```http
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: pull_request
X-GitHub-Delivery: b2c3d4e5-f6a7-8901-bcde-f12345678901
X-Hub-Signature-256: sha256=dummyhmacsha256signaturevalue_pr_opened
X-GitHub-Hook-ID: 12345678
X-GitHub-Hook-Installation-Target-Type: repository
X-GitHub-Hook-Installation-Target-ID: 987654321
User-Agent: GitHub-Hookshot/abc1234
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

```http
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: release
X-GitHub-Delivery: c3d4e5f6-a7b8-9012-cdef-123456789012
X-Hub-Signature-256: sha256=dummyhmacsha256signaturevalue_release
X-GitHub-Hook-ID: 12345678
X-GitHub-Hook-Installation-Target-Type: repository
X-GitHub-Hook-Installation-Target-ID: 987654321
User-Agent: GitHub-Hookshot/abc1234
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

**[수신] Push Event (시크릿 미설정)**

```http
Method: POST  (GitHub → FlashHook)
Content-Type: application/json
X-GitHub-Event: push
X-GitHub-Delivery: d4e5f6a7-b8c9-0123-def0-123456789012
X-GitHub-Hook-ID: 12345678
X-GitHub-Hook-Installation-Target-Type: repository
X-GitHub-Hook-Installation-Target-ID: 987654321
User-Agent: GitHub-Hookshot/abc1234
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

#### **GitHub Webhooks 공식 문서 원본 링크**

[GitHub Webhooks 문서](https://docs.github.com/en/webhooks)

---

### 6. 슬랙 (Slack)

#### [Webhook / Events API] URL Verification & App Events

- **프리셋 시나리오**: 검증 성공(Handshake), `app_mention`, `message`, `retry` 이벤트
- **개발자가 테스트하는 것**: 최초 Slack App 연동 검증, 봇 이벤트 라우팅, 재전송 방어
- **공식 기술 제약 (검증)**:
  - **URL Verification**: 앱 최초 연동 시 전달되는 JSON의 `challenge` 파라미터 값을 그대로 텍스트 혹은 JSON 본문으로 반환해야만 검증을 통과합니다.
  - **Events API Retry**: 서버가 **3초 이내에 응답하지 않으면, 최대 3회 자동 재전송**합니다. _(재전송 간격: 1차 재시도는 거의 즉시, 2차 재시도는 1분 후, 3차(최종) 재시도는 5분 후에 이루어진다. 공식 문서 docs.slack.dev / api.slack.com 기준으로 확인됨)_
  - 중복 처리를 방지하기 위해 헤더의 `X-Slack-Retry-Num`을 확인해야 하며, 재시도를 중단하고 싶다면 응답에 `X-Slack-No-Retry: 1` 헤더를 포함시키는 로직 등을 정교하게 테스트할 수 있습니다.

> ⚠️ **동적 응답 필요 (URL Verification)**: Slack이 전송하는 `challenge` 값은 매 요청마다 랜덤하게 생성되는 문자열입니다. 고정 mockConfig로는 이 값을 응답 body에 echo할 수 없습니다.\
> **필요 로직**: 수신된 요청 body를 파싱 → `challenge` 필드 추출 → `{"challenge": "<추출된 값>"}` 형태의 JSON을 `Content-Type: application/json`으로 즉시 반환. 또는 `Content-Type: text/plain`으로 challenge 문자열만 반환해도 검증 통과.

##### 응답 명세

**[수신] URL Verification (Challenge Handshake)**

```http
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

```http
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

```http
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

```http
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

_재시도 중단 응답 (Slack 공식 가이드: non-200 응답에 동봉):_

```http
Status: 500 Internal Server Error
X-Slack-No-Retry: 1
```

- Note: 200 OK 응답 시에는 어차피 재시도가 발생하지 않으므로 `X-Slack-No-Retry` 헤더는 의미가 없습니다. 이 헤더는 비정상 응답(4xx/5xx)을 명시적으로 반환할 때 Slack에 재시도 중단을 알리는 용도입니다.

---

#### **Slack Events API 공식 문서 원본 링크**

[Slack Events API 문서](https://api.slack.com/events-api)

---

#### [동적 응답 및 시그니처 핸들러 파이프라인]

Slack URL Verification과 같이 특정 값을 파싱해서 즉시 응답해야 하거나, GitHub/PortOne처럼 발송 시점에 서명을 덧붙여야 하는 특수성을 해결하기 위해 **전략 패턴(Strategy Pattern)** 기반의 핸들러 파이프라인이 구축되어 있습니다.

- **수신 파이프라인 (ResponsePresetHandler)**: Slack 전용. `presetType: 'SLACK_URL_VERIFICATION'` 수신 시, 페이로드에서 `challenge`를 파싱해 200 OK와 함께 즉시 동적 응답합니다.
- **발송 파이프라인 (RequestSigningPresetHandler)**: GitHub, PortOne V2 전용. Webhook Replay 시점에 등록된 `secretKey`를 AES-256 메모리 복호화 후, 실시간 타임스탬프 기반으로 HMAC-SHA256 서명을 생성하고 올바른 형식의 헤더를 삽입하여 재전송합니다.
