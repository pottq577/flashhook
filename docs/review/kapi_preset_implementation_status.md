# K-API Preset Implementation Status (Living Document)

## Progress Summary
- **Current Progress**: 22%
- **Tickets Completed**: 2 / 9

| Ticket ID | Description | Priority | Status |
|---|---|---|---|
| FH-PRESET-001 | 카카오 unlink 웹훅 페이로드 및 응답 코드 수정 | P0 | [x] Completed |
| FH-PRESET-002 | 토스페이먼츠 PROVIDER_ERROR -> FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING 교체 | P0 | [x] Completed |
| FH-PRESET-003 | 솔라피 statusCode 3059 의미 수정 및 5초 타임아웃 명시 | P0 | [ ] Planned |
| FH-PRESET-004 | 포트원 V2 웹훅 재전송 옵트인 서술 제거 | P1 | [ ] Planned |
| FH-PRESET-005 | 카카오 KOE 에러 메시지 정확성 보강 | P1 | [ ] Planned |
| FH-PRESET-006 | Slack X-Slack-No-Retry 사용 조건 명확화 | P2 | [ ] Planned |
| FH-PRESET-007 | 카카오 채널 추가/차단 이벤트 프리셋 별도 분리 | P2 | [ ] Planned |
| FH-PRESET-008 | GitHub Webhook 추가 헤더 및 시크릿-없음 케이스 프리셋 추가 | P2 | [ ] Planned |
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
