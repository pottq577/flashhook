# ADR-0002: Dynamic Preset를 두 종류로 분리한다

**Status**: Accepted  
**Date**: 2026-06-13

## Context

Phase 1 정적 프리셋 설계 과정에서 `docs/artifacts/02_mock_api_features.md`의 `⚠️ 동적 응답 필요` 케이스 3개를 Phase 2로 이연했습니다. 이 3개를 Phase 2에서 구현하기 위해 상세 분석한 결과, 세 케이스가 **서로 다른 유형의 기능**에 속한다는 것을 발견했습니다.

### 분석: 세 케이스의 실제 성격

| 케이스 | 트래픽 방향 | 필요한 기능 |
|---|---|---|
| Slack URL Verification | 외부 → FlashHook → 응답 | 수신 요청의 body를 파싱해서 동적 응답 생성 |
| GitHub `X-Hub-Signature-256` | FlashHook → 사용자 서버 | 사용자 서버로 서명된 페이로드를 **발신** |
| PortOne `webhook-signature` | FlashHook → 사용자 서버 | 사용자 서버로 서명된 페이로드를 **발신** |

- **Slack**: FlashHook이 받은 요청에 대해 `body.challenge` 값을 그대로 응답에 echo하는 패턴. 현재 `WebhookReceiveController` → `MockResponseScheduler` 흐름을 분기 확장하면 구현 가능.
- **GitHub/PortOne**: "내 webhook handler가 올바르게 서명 검증을 하는지 테스트하고 싶다" → FlashHook이 실제 서비스처럼 서명된 웹훅을 **내 서버로 쏴줘야** 한다. 현재 FlashHook에는 이 방향의 발신 기능이 없음.

## Decision

`⚠️ 동적 응답 필요` 케이스를 두 종류로 공식 분리합니다:

### Type A — 동적 응답 핸들러 (Dynamic Response Handler)
> "수신된 요청을 파싱해서 그 내용에 따라 응답을 동적으로 생성"

- **해당 케이스**: Slack URL Verification
- **구현 위치**: `WebhookReceiveController` + `MockResponseScheduler` 분기 확장
- **mockConfig 확장**: `presetType: String` (nullable) 필드 추가. 값이 있으면 고정 응답 대신 핸들러로 라우팅.
- **Phase 2 범위에 포함**

### Type B — 웹훅 발신기 (Webhook Sender)
> "사용자가 등록한 외부 URL로 FlashHook이 서명된 페이로드를 발신"

- **해당 케이스**: GitHub `X-Hub-Signature-256`, PortOne `webhook-signature`
- **구현 위치**: 현재 존재하지 않는 신규 기능 영역 (별도 도메인 설계 필요)
- **mockConfig와 무관**: Mock API 확장이 아니라 독립적인 기능
- **Phase 2 범위 제외 — 별도 기획(Webhook Sender PRD) 대상**

## Consequences

- `docs/artifacts/02_mock_api_features.md`의 GitHub/PortOne 동적 응답 태그는 "Webhook Sender 기능 필요" 표시로 의미가 재정의됩니다.
- Phase 2에서 `presetType` 필드를 추가할 때 Type A(Slack)만 핸들러를 구현하면 됩니다.
- GitHub/PortOne 서명 검증 테스트 기능은 별도 Webhook Sender PRD가 선행되어야 구현할 수 있습니다.
