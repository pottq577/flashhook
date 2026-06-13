#!/bin/bash
set -e

git add FH_backend/src/main/java/com/flashhook/domain/webhook/service/SseEmitterService.java
git commit -m "fix(backend): SSE Emitter 비동기 처리에 전용 Executor 적용

ForkJoinPool.commonPool() 사용으로 인한 고부하 상황의 리소스 경합을 방지하기 위해,
Spring AsyncConfig의 taskExecutor를 주입받아 비동기 처리에 사용하도록 개선했습니다."

git add FH_backend/src/main/resources/application-prod.yaml docker-compose.yml
git commit -m "fix(backend): 프로덕션 Redis 설정 개선 및 헬스체크 추가

프로덕션 환경에서 조용히 localhost로 붙어 실패를 숨기는 문제를 방지하기 위해 기본값을 제거하고,
비밀번호 설정을 추가했습니다. 또한, 컨테이너 초기화 시간 고려를 위해 헬스체크에 start_period를 도입했습니다."

git add FH_backend/src/main/java/com/flashhook/domain/webhook/service/WebhookService.java
git commit -m "fix(backend): Webhook 삭제 시 실제 결과 기반으로 카운트 차감 보장

enforceLogCap 실행 시 동시성 이슈로 삭제되지 않은 로그까지 카운트에서 차감되는 문제를 방지하기 위해,
mongoTemplate.findAllAndRemove를 사용하여 실제 삭제된 수치만큼만 차감하도록 로직을 수정했습니다."

git add FH_backend/src/main/java/com/flashhook/global/security/AccessTokenFilter.java FH_backend/src/main/resources/logback-spring.xml
git commit -m "fix(backend): MDC 참조 통일 및 traceId 콘솔 로그 출력 추가

코드의 가독성을 높이기 위해 MDC 참조 방식을 통일하고,
콘솔 로그에서도 traceId를 파악할 수 있도록 logback-spring.xml의 패턴 설정을 개선했습니다."

git add FH_frontend/src/shared/lib/queryClient.ts
git commit -m "fix(frontend): sessionStorage 초기화 대상을 앱 전용 키로 제한

API 에러 발생 시 앱과 무관한 동일 오리진 세션 데이터까지 초기화될 수 있는 문제를 방지하기 위해,
'flashhook:' 접두어가 포함된 키만 선택적으로 삭제하도록 변경했습니다."

git add FH_frontend/src/pages/dashboard/ui/DashboardPage.tsx
git commit -m "fix(frontend): DashboardPage 언마운트 시 UI 속성 클린업 누락 해결

컴포넌트가 언마운트될 때 document.body 스타일 변경 내역과 예약된 RAF 콜백이
초기화되지 않아 발생할 수 있는 메모리 누수 및 스타일 깨짐 현상을 해결했습니다."

git add FH_frontend/src/widgets/log-viewer/ui/LogList.tsx
git commit -m "fix(frontend): LogList 렌더링 최적화를 위한 Virtuoso 고유 키 지정

최신 로그가 맨 앞에 삽입되는 구조에서 리스트 아이템의 안정적인 재사용과 불필요한
리렌더링을 방지하기 위해 Virtuoso의 computeItemKey 속성으로 logId를 지정했습니다."

git add FH_frontend/src/shared/api/client.ts FH_frontend/src/widgets/log-viewer/ui/LogItem.tsx
git commit -m "fix(frontend): HTTP 메서드 파싱 대소문자 문제 해결 및 옵셔널 폴백 개선

대소문자가 일치하지 않아 GET 요청에 대한 재시도 로직이 동작하지 않던 버그를 정규화하여 수정하고,
값이 비어있을 때 잘못 덮어씌워지지 않도록 || 연산자를 ??(Nullish Coalescing)로 교체했습니다."

echo "ALL DONE!"
