# K-API Preset Implementation Status (Living Document)

## Progress Summary
- **Current Progress**: 88%
- **Tickets Completed**: 8 / 9

| Ticket ID | Description | Priority | Status |
|---|---|---|---|
| FH-PRESET-001 | 카카오 unlink 웹훅 페이로드 및 응답 코드 수정 | P0 | [x] Completed |
| FH-PRESET-002 | 토스페이먼츠 PROVIDER_ERROR -> FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING 교체 | P0 | [x] Completed |
| FH-PRESET-003 | 솔라피 statusCode 3059 의미 수정 및 5초 타임아웃 명시 | P0 | [x] Completed |
| FH-PRESET-004 | 포트원 V2 웹훅 재전송 옵트인 서술 제거 | P1 | [x] Completed |
| FH-PRESET-005 | 카카오 KOE 에러 메시지 정확성 보강 | P1 | [x] Completed |
| FH-PRESET-006 | Slack X-Slack-No-Retry 사용 조건 명확화 | P2 | [x] Completed |
| FH-PRESET-007 | 카카오 채널 추가/차단 이벤트 프리셋 별도 분리 | P2 | [x] Completed |
| FH-PRESET-008 | GitHub Webhook 추가 헤더 및 시크릿-없음 케이스 프리셋 추가 | P2 | [x] Completed |
| FH-PRESET-009 | 토스페이먼츠 PAYMENT_STATUS_CHANGED 웹훅 프리셋 추가 | P2 | [ ] Planned |

---

## Chronological Change Log

### 2026-06-17T04:27:00Z
- **Event**: Living Document initialized.
- **Details**: Created `docs/review/kapi_preset_implementation_status.md` to track all 9 preset synchronization tasks.

### 2026-06-17T04:30:00Z
- **Event**: FH-PRESET-001 [P0] Completed.
- **Details**: Updated Kakao unlink payload JSON with string IDs and UNLINK_FROM_APPS referrer type. Changed response code from 200 to 202 Accepted. Split presetType in frontend presets into KAKAO_UNLINK_WEBHOOK and KAKAO_ACCOUNT_STATUS_CHANGE.

### 2026-06-17T04:31:00Z
- **Event**: FH-PRESET-002 [P0] Completed.
- **Details**: Replaced Toss Payments non-existent PROVIDER_ERROR (400) preset with FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING (500) in both specification document and frontend presets.ts.

### 2026-06-17T04:32:00Z
- **Event**: FH-PRESET-003 [P0] Completed.
- **Details**: Updated Solapi 3059 error message and label to "번호도용문자 차단 서비스에 가입된 발신번호입니다." in the spec and presets.ts. Specified 5 seconds timeout limit for Solapi webhooks in the spec document.

### 2026-06-17T04:33:00Z
- **Event**: FH-PRESET-004 [P1] Completed.
- **Details**: Removed the incorrect opt-in retry description for PortOne V2 from the spec document (since PortOne V2 retries 5 times by default).

### 2026-06-17T04:34:00Z
- **Event**: FH-PRESET-005 [P1] Completed.
- **Details**: Updated Kakao KOE101 error_description to "Not exist client_id flashhook-dummy-rest-api-key" in spec and presets.ts, and added note about official pattern format for KOE320.

### 2026-06-17T04:35:00Z
- **Event**: FH-PRESET-006 [P2] Completed.
- **Details**: Added "x-slack-no-retry" to backend ALLOWED_HEADERS in MockResponseScheduler.java. Updated spec document and presets.ts to use status code 500 and include the "X-Slack-No-Retry: 1" header to align with Slack's non-200 OK retry cancellation policy.

### 2026-06-17T04:36:00Z
- **Event**: FH-PRESET-007 [P2] Completed.
- **Details**: Separated Kakao channel callback from Kakao Login SSF/SET callback in both the specification document and presets.ts. Added a comparison table to explain differences in hosting domains, success status codes, payload formats, and events.

### 2026-06-17T04:37:00Z
- **Event**: FH-PRESET-008 [P2] Completed.
- **Details**: Added GitHub hook headers (X-GitHub-Hook-ID, User-Agent, target type/id) and a secret-none scenario (no signature header) to the spec document and presets.ts. Configured GITHUB presetType and isDynamic flag to enable HMAC-SHA256 signature generator trigger.
