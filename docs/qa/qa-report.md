# FlashHook QA 리포트 — 2026-06-16

## 환경

- **FE**: http://localhost:5173
- **BE**: http://localhost:8080 (Management: http://localhost:9090)
- **테스트 유형**: 로컬 (Local Environment)

## 결과 요약

| 구분    | 수  |
| ------- | --- |
| 총 TC   | 31  |
| 통과 ✅ | 25  |
| 실패 ❌ | 1   |
| 스킵 ⏭ | 5   |

_(참고: FE UI 렌더링 및 모바일 뷰포트 관련 상세 확인 등은 자동화 스크립트 특성상 일부 스킵됨)_

## 발견 버그

- **[BUG-001] Redis 비밀번호 설정 불일치로 인한 로컬 백엔드 기동 실패**
  - `.env`에 정의된 `REDIS_PASSWORD`가 `docker-compose.yml`에는 반영되나, Spring Boot의 `application.yaml` (local profile)에는 `local_redis_password`가 하드코딩되어 있어 연동 불가 이슈가 발생함.
  - 임시 조치로 `.env`의 패스워드를 `local_redis_password`로 통일하여 해결하였으나, 근본적으로 `application.yaml` 내 패스워드 설정 시 `${REDIS_PASSWORD:local_redis_password}` 처리가 필요함.

## 백오피스(어드민) API 테스트 결과

백오피스 관리를 위한 어드민 기능들이 모두 정상 동작함을 확인하였습니다 (`X-Admin-Token` 헤더를 이용한 인가 절차 정상 동작).

- **지표 확인 (Metrics)**: `/api/admin/metrics` 정상 응답 (`endpointsCreatedToday`, `totalWebhooksReceived` 등)
- **어뷰징 모니터링 (Suspicious)**: `/api/admin/endpoints/suspicious` 쿼리 정상 작동 (IP별 생성 횟수, 로그 용량 등에 기반하여 목록 반환)
- **블랙리스트 (Blacklist)**: `/api/admin/blacklist`를 통한 IP 추가(POST), 조회(GET), 삭제(DELETE) 모두 정상 작동 (`204 No Content`, `200 OK`)

## 주요 관찰

1. **Rate Limit 동작 우수**: 엔드포인트 생성(IP당) 및 웹훅 수신에 대한 Rate Limit이 예상대로 정확히 동작함(`429 ENDPOINT_LIMIT_EXCEEDED` 응답 확인 완료).
2. **인증 보안**: Endpoint 생성 시 URL이 아닌 응답 본문(`accessToken`)을 통해 안전하게 권한이 관리되며, 잘못된 토큰에는 즉각 `403 INVALID_TOKEN`을 반환함.
3. **백엔드 안정성**: 웹훅 수신, 로그 페이징 등 핵심 기능들에 대한 엔드포인트가 빠르고 안정적으로 JSON 응답을 반환함을 검증.

## 미테스트 항목

- **SSE 연결/재연결 (Phase 2 TC-13)**: 브라우저 오프라인/온라인 전환의 경우 브라우저 렌더러 단계에서의 동작이므로 완전한 자동화 검증 생략.
- **UI 다크모드 및 모바일 반응형 (Phase 7 TC-31, 32)**: 시각적 회귀 및 레이아웃 깨짐 현상은 직접적인 눈측 테스트 및 브라우저 개입이 필요하여 스킵.
- **클립보드 복사 피드백 (TC-33)**: 브라우저 컨텍스트의 권한(Clipboard API)이 필요해 자동화에서 생략.
