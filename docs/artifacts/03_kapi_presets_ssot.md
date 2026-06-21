# K-API 프리셋 공식 명세서 (SSOT)

> 본 문서는 FlashHook 서비스에서 제공하는 6대 외부 연동 서비스(카카오, 토스페이먼츠, 포트원 V2, 솔라피, 깃허브, 슬랙)의 실제 API 프리셋 스펙을 규정하는 단일 진실 공급원(SSOT) 문서입니다.
> Updated At: 2026-06-21

---

## 1. 카카오 (Kakao)

### 1.1. 기술 제약 사항 요약

- **OAuth 타임아웃**: 제한 시간 명시 없음 (권장: 3~5초 이내)
- **웹훅 응답 제약**: 3초 이내에 HTTP `202 Accepted` 응답 반환 (SSF/SET 기반). 단, 구버전 Unlink 웹훅 및 카카오톡 채널 콜백 웹훅은 `200 OK` 반환.
- **웹훅 재전송 정책**: 공식 문서 내 자동 재시도 언급 없음.

### 1.2. REST API 프리셋 명세

#### [성공] OAuth 토큰 발급

- **Status**: `200 OK`
- **Content-Type**: `application/json;charset=UTF-8`

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

#### [실패] KOE101 (invalid_client) — REST API 키 오류

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json;charset=UTF-8`

```json
{
  "error": "invalid_client",
  "error_description": "Not exist client_id flashhook-dummy-rest-api-key",
  "error_code": "KOE101"
}
```

#### [실패] KOE320 (invalid_grant) — 인가 코드 만료

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json;charset=UTF-8`

```json
{
  "error": "invalid_grant",
  "error_description": "authorization code not found for code=dummy-expired-code",
  "error_code": "KOE320"
}
```

#### [실패] KOE009 (misconfigured) — 등록되지 않은 플랫폼

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json;charset=UTF-8`

```json
{
  "error": "misconfigured",
  "error_description": "invalid android_key_hash or ios_bundle_id or web_site_url",
  "error_code": "KOE009"
}
```

### 1.3. Webhook 프리셋 명세

#### [수신] 앱 연결 해제 알림 (Unlink Callback)

- **Method**: `POST`
- **Content-Type**: `application/json`
- **FlashHook 응답**: `200 OK` (Body 무시)

```json
{
  "app_id": "123456",
  "user_id": "3891047281",
  "referrer_type": "UNLINK_FROM_APPS",
  "group_user_token": "Yzg5MDQ4MDM4...(optional)"
}
```

_참고: `referrer_type`은 `ACCOUNT_DELETE | FORCED_ACCOUNT_DELETE | UNLINK_FROM_ADMIN | UNLINK_FROM_APPS | INCOMPLETE_SIGN_UP` 중 하나의 값을 가짐._

#### [수신] 카카오톡 채널 추가 알림

- **Method**: `POST`
- **Content-Type**: `application/json`
- **FlashHook 응답**: `200 OK` (Body 무시)

```json
{
  "event": "add_channel",
  "id": "123456",
  "user_id": "3891047281",
  "channel_uuid": "ch_123456",
  "updated_at": "2024-01-15T18:30:00Z"
}
```

---

## 2. 토스페이먼츠 (Toss Payments)

### 2.1. 기술 제약 사항 요약

- **API 타임아웃**: 권장 10초 이내
- **웹훅 응답 제약**: 10초 이내에 HTTP `2xx` 응답 반환
- **웹훅 재전송 정책**: 실패 시 최대 7회 재전송 (간격: 1분 → 4분 → 16분 → 64분 → 256분 → 1024분 → 4096분, 총 3일 19시간 지수 백오프 적용)

### 2.2. REST API 프리셋 명세

#### [성공] 결제 승인 성공

- **Status**: `200 OK`
- **Content-Type**: `application/json`

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

#### [실패] ALREADY_PROCESSED_PAYMENT (중복 승인)

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json`

```json
{
  "code": "ALREADY_PROCESSED_PAYMENT",
  "message": "이미 처리된 결제입니다."
}
```

#### [실패] FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING (결제 기관 오류 - HTTP 500)

- **Status**: `500 Internal Server Error`
- **Content-Type**: `application/json`

```json
{
  "code": "FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING",
  "message": "결제 기관에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}
```

#### [실패] ALREADY_CANCELED_PAYMENT (이미 취소된 결제)

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json`

```json
{
  "code": "ALREADY_CANCELED_PAYMENT",
  "message": "이미 취소된 결제입니다."
}
```

#### [실패] INVALID_REJECT_CARD (카드 사용 거절)

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json`

```json
{
  "code": "INVALID_REJECT_CARD",
  "message": "카드 사용이 거절되었습니다. 카드사에 문의해주세요."
}
```

### 2.3. Webhook 프리셋 명세

#### [수신] 가상계좌 입금 완료 웹훅

- **Method**: `POST`
- **Content-Type**: `application/json`
- **FlashHook 응답**: `200 OK`

```json
{
  "createdAt": "2024-01-15T18:30:00+09:00",
  "secret": "dummyWebhookSecretKey",
  "status": "DONE",
  "transactionKey": "TXN_20240115_VBANK001",
  "orderId": "ORDER-2024-00002"
}
```

#### [수신] 결제 상태 변경 웹훅

- **Method**: `POST`
- **Content-Type**: `application/json`
- **FlashHook 응답**: `200 OK`

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

---

## 3. 포트원 V2 (PortOne V2)

### 3.1. 기술 제약 사항 요약

- **API 타임아웃**: Connection Timeout 및 Read Timeout 모두 30초
- **웹훅 응답 제약**: 10초 이내 응답 권장 (실패 시 재전송)
- **웹훅 재전송 정책**: 실패 시 **최대 5회 기본 자동 재전송** (옵트인 아님). 재전송 간격: `0분 → 1분 → 4분 → 16분 → 64분 → 256분` 지수 백오프 및 jittering 적용.

### 3.2. REST API 프리셋 명세

#### [성공] 결제 조회 성공

- **Status**: `200 OK`
- **Content-Type**: `application/json`

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

#### [실패] PAYMENT_NOT_FOUND (존재하지 않는 결제)

- **Status**: `404 Not Found`
- **Content-Type**: `application/json`

```json
{
  "type": "PAYMENT_NOT_FOUND",
  "message": "존재하지 않는 결제건입니다."
}
```

#### [실패] 미승인 상태 조회 (status: PENDING)

- **Status**: `200 OK`
- **Content-Type**: `application/json`

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

#### [실패] 카드사 거절 (status: FAILED)

- **Status**: `200 OK`
- **Content-Type**: `application/json`

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

#### [실패] IDEMPOTENCY_OUTSTANDING_REQUEST (중복 요청 충돌)

- **Status**: `409 Conflict`
- **Content-Type**: `application/json`

```json
{
  "type": "IDEMPOTENCY_OUTSTANDING_REQUEST",
  "message": "동일한 Idempotency-Key로 이미 처리 중인 요청이 있습니다."
}
```

### 3.3. Webhook 프리셋 명세

#### [수신] 결제 승인 완료 웹훅 (Standard Webhooks 스펙)

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `webhook-id`: `wh_dummy_id_20240115_001`
  - `webhook-timestamp`: `1705283400`
  - `webhook-signature`: `v1,dummyBase64Signature==`
- **FlashHook 응답**: `200 OK`

```json
{
  "type": "Transaction.Paid",
  "data": {
    "paymentId": "payment_dummy_abc123xyz",
    "transactionId": "txn_portone_20240115_001"
  }
}
```

### 3.4. 시그니처 생성 알고리즘

1. **서명 대상 문자열 생성**: `msg_id = webhook-id`, `timestamp = webhook-timestamp`, `payload = requestBody` 일 때, `"{msg_id}.{timestamp}.{payload}"` 생성.
2. **비밀키 가공**: 시크릿 키 문자열의 `whsec_` 접두사 제거 후 남은 문자열을 Base64 디코딩하여 HMAC의 Key로 설정.
3. **HMAC 서명**: HMAC-SHA256 알고리즘을 사용해 대상 문자열 서명 후 Base64 인코딩.
4. **헤더 주입**: `webhook-signature` 헤더에 `v1,{base64_signature}` 포맷으로 주입하여 발송.

---

## 4. 솔라피 (SOLAPI)

### 4.1. 기술 제약 사항 요약

- **API 타임아웃**: 5초 이내 권장
- **웹훅 응답 제약**: **5초 이내에 HTTP 2xx 응답**을 반환해야 함.
- **웹훅 재전송 정책**: 타임아웃 또는 실패 시 지수 백오프(매회 2배 증가) 적용하여 **최대 7회 재시도** (최초 1회 + 재시도 7회 = 총 8회). 8회 최종 실패 시 해당 웹훅이 `INACTIVE`로 자동 강등.
- **재전송 간격**: `15분 → 30분 → 1시간 → 2시간 → 4시간 → 8시간 → 16시간`

### 4.2. REST API 프리셋 명세

#### [성공] 문자 발송 접수 (statusCode: 2000)

- **Status**: `200 OK`
- **Content-Type**: `application/json`

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

_참고: `2000` 코드는 발송대기(잔액부족/한도초과 보류) 및 정상접수(이통사 접수예정)의 이중적 의미를 가짐._

#### [실패] 1030 (잔액 부족)

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json`

```json
{
  "errorCode": "1030",
  "errorMessage": "잔액이 부족합니다."
}
```

#### [실패] 3059 (도용 차단 번호)

- **Status**: `400 Bad Request`
- **Content-Type**: `application/json`
- **설명**: 발신번호가 통신사 부가서비스인 "번호도용문자 차단 서비스"에 가입되어 있어 발송 실패한 케이스.

```json
{
  "errorCode": "3059",
  "errorMessage": "번호도용문자 차단 서비스에 가입된 발신번호입니다."
}
```

### 4.3. Webhook 프리셋 명세

#### [수신] 대량 발송 결과 리포트 (GROUP-REPORT)

- **Method**: `POST`
- **Content-Type**: `application/json`
- **FlashHook 응답**: `200 OK` (5초 이내 응답 필수, Body 내용은 무시)

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

---

## 5. 깃허브 (GitHub)

### 5.1. 기술 제약 사항 요약

- **웹훅 응답 제약**: **10초 이내**에 HTTP 2xx 응답을 반환해야 함.
- **웹훅 재전송 정책**: **자동 재전송 미지원**. 실패한 딜리버리는 완전히 누락되며 개발자가 직접 GitHub 콘솔에서 수동 Redeliver를 실행해야 함.

### 5.2. Webhook 프리셋 명세

#### [수신] Push Event

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `X-GitHub-Event`: `push`
  - `X-GitHub-Delivery`: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
  - `X-Hub-Signature-256`: `sha256=dummyhmacsha256signaturevalue1234567890abcdef` (시크릿이 활성화된 경우에만 전송)
  - `X-GitHub-Hook-ID`: `12345678`
  - `X-GitHub-Hook-Installation-Target-Type`: `repository`
  - `X-GitHub-Hook-Installation-Target-ID`: `987654321`
  - `User-Agent`: `GitHub-Hookshot/abc1234`
- **FlashHook 응답**: `200 OK`

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

#### [수신] Pull Request Opened Event

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**: 위 Push Event 헤더 명세와 동일 (단, `X-GitHub-Event: pull_request`로 설정)
- **FlashHook 응답**: `200 OK`

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

### 5.3. 시그니처 생성 알고리즘

1. **HMAC 계산**: Webhook payload raw body와 설정한 Webhook Secret을 이용해 HMAC-SHA256 해시를 생성.
2. **시그니처 반환**: 생성된 HMAC 해시값을 Hex(16진수) 인코딩.
3. **헤더 주입**: `X-Hub-Signature-256` 헤더에 `sha256={hex_signature}` 포맷으로 값을 주입하여 발송. (Secret 설정이 없는 경우 헤더 제외)

---

## 6. 슬랙 (Slack)

### 6.1. 기술 제약 사항 요약

- **웹훅 응답 제약**: **3초 이내**에 응답을 완료해야 함.
- **웹훅 재전송 정책**: 응답 지연/실패 시 **최대 3회 자동 재시도**.
- **재전송 간격**: `즉시(거의 실시간) → 1분 후 → 5분 후`
- **재전송 제어**: 재시도 딜리버리 수신 시, 응답에 `X-Slack-No-Retry: 1` 헤더를 포함하여 non-200 응답(예: 500 에러)을 반환하면 Slack 측의 추가 재시도가 중단됨.

### 6.2. Webhook 프리셋 명세

#### [수신] URL Verification (Challenge Handshake)

- **Method**: `POST`
- **Content-Type**: `application/json`
- **FlashHook 응답**: `200 OK` (수신된 `challenge` 문자열 값을 바디에 그대로 반환해야 함)

```json
{
  "token": "deprecated-legacy-token-value",
  "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
  "type": "url_verification"
}
```

_동적 응답 예시:_

- Status: `200 OK`
- Content-Type: `application/json`

```json
{
  "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P"
}
```

#### [수신] app_mention Event (봇 호출)

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `X-Slack-Signature`: `v0=dummyslacksignaturehash1234567890abcdef`
  - `X-Slack-Request-Timestamp`: `1705283400`
- **FlashHook 응답**: `200 OK` (3초 이내 응답 필수, 바디는 빈 JSON `{}` 또는 빈 스트링)

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

#### [수신] retry Event (재전송 상황 재현)

- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
  - `X-Slack-Retry-Num`: `1`
  - `X-Slack-Retry-Reason`: `http_timeout`
- **FlashHook 응답**: `500 Internal Server Error` (추가 재전송을 중단하기 위해 `X-Slack-No-Retry: 1` 응답 헤더 주입)

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

### 6.3. 시그니처 생성 알고리즘

1. **서명 대상 문자열 생성**: 버전(`v0`), 타임스탬프(`X-Slack-Request-Timestamp`), 요청 body를 콜론(`:`)으로 연결하여 `"v0:{timestamp}:{body}"` 문자열을 생성.
2. **HMAC 계산**: Slack App의 Signing Secret을 키로 사용하여 대상 문자열을 HMAC-SHA256 서명.
3. **시그니처 반환**: 서명된 바이트를 Hex(16진수)로 인코딩하여 `v0={hex_signature}` 접두사와 함께 `X-Slack-Signature` 헤더로 전달.

---

## 7. 공식 문서 레퍼런스 (SSOT Links)

| 서비스                | 영역                 | 공식 문서 URL (SSOT)                                                                                                     |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Kakao**             | OAuth 에러 코드      | [Kakao Login Trouble Shooting](https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting)                         |
|                       | unlink/계정상태 웹훅 | [Kakao Account Callback](https://developers.kakao.com/docs/ko/kakaologin/callback)                                       |
| **Toss Payments**     | 웹훅 기본 가이드     | [Toss Payments Webhook Guide](https://docs.tosspayments.com/guides/v2/webhook)                                           |
|                       | 웹훅 이벤트 명세     | [Toss Payments Webhook Events](https://docs.tosspayments.com/reference/using-api/webhook-events)                         |
|                       | API 에러 코드 사전   | [Toss Payments Error Codes](https://docs.tosspayments.com/reference/error-codes)                                         |
| **PortOne V2**        | 웹훅 연동 가이드     | [PortOne V2 Webhook Guide](https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2)                      |
|                       | REST API 에러 명세   | [PortOne V2 REST API Reference](https://developers.portone.io/api/rest-v2/payment)                                       |
| **Standard Webhooks** | 표준 시그니처 스펙   | [Standard Webhooks Spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md)     |
| **SOLAPI**            | 웹훅 기본 가이드     | [SOLAPI Webhook Guide](https://solapi.com/developers/api/webhook)                                                        |
|                       | 메시지 상태 코드     | [SOLAPI Message Status Codes](https://solapi.com/message-status-codes)                                                   |
|                       | 3059 상태코드 FAQ    | [SOLAPI 3059 FAQ](https://solapi.com/sms-faq-theft)                                                                      |
| **GitHub**            | 웹훅 베스트 프랙티스 | [GitHub Webhooks Best Practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)   |
|                       | 웹훅 검증 가이드     | [GitHub Validating Webhook Deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) |
| **Slack**             | Events API 가이드    | [Slack Events API Guide](https://docs.slack.dev/apis/events-api/)                                                        |
|                       | 요청 검증 가이드     | [Slack Verifying Requests](https://docs.slack.dev/authentication/verifying-requests-from-slack)                          |
