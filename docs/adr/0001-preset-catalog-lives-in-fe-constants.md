# ADR-0001: Preset Catalog Lives in Frontend Constants

**Status**: Accepted  
**Date**: 2026-06-13

## Context

FlashHook의 Mock API 기능에는 외부 서비스(카카오, 토스페이먼츠, 포트원 V2, 솔라피, GitHub, Slack)의 실제 응답을 흉내내는 **프리셋** 기능이 필요합니다. 프리셋 하나는 `{ statusCode, delayMs, headers, body }` 4개 필드를 한 번에 세팅합니다.

이 프리셋 데이터를 **어디에 저장하고 어떻게 제공할 것인가**에 대해 두 가지 선택지가 있었습니다:

- **A안 (FE 상수 파일)**: `presets.ts`에 TypeScript 객체로 정의. FE 빌드 타임에 번들에 포함.
- **B안 (BE API)**: `GET /api/presets` 엔드포인트를 통해 서버에서 내려줌.

## Decision

**A안 — FE 상수 파일**을 선택합니다.

프리셋 데이터는 외부 서비스의 공식 응답 스펙을 반영한 **정적 상수**입니다. 런타임에 변경될 이유가 없으며, `docs/artifacts/02_mock_api_features.md`에 전부 사전 정의되어 있습니다. FE 상수 파일로 두면 문서와 코드가 1:1로 대응되어 유지보수가 명확합니다.

B안은 프리셋 내용 자체가 동적으로 변경될 필요가 있을 때 유효하지만, 현재 도메인에서 그런 요구사항은 없습니다.

## Consequences

- **프리셋 내용 변경 시 FE 재배포가 필요합니다.** (의도적으로 수용한 트레이드오프)
- 카탈로그 파일(`presets.ts`)이 `docs/artifacts/02_mock_api_features.md`와 단일 진실 공급원 역할을 공유합니다. 둘 중 하나가 바뀌면 다른 하나도 함께 업데이트해야 합니다.
- **Dynamic Preset** (Slack URL Verification, GitHub/PortOne 시그니처 등)은 이 결정의 범위 밖입니다. 해당 케이스는 Phase 2에서 `presetType` 필드와 BE 핸들러를 함께 추가합니다. → ADR 별도 작성 예정.
