# 시스템 한계치 및 부하 테스트 설계 분석

> **문서 목적 / 독자**: 오픈소스 기여자, 면접관 등 외부 독자를 위한 공유용 문서입니다.
> FlashHook 의 실제 구현(코드)을 근거로 시스템의 처리 한계와 병목 지점을 도출하고, 그것을
> 어떻게 부하 테스트로 검증할지의 방법론까지 설명합니다. 수치는 "이론적 예측 → 실측으로 확정"
> 이라는 관점으로 읽어 주세요.
>
> **연관 문서**: 실행 절차/시나리오는 [`08_load_test_execution_plan.md`](./08_load_test_execution_plan.md),
> 아키텍처 전반은 [`04_system_architecture.md`](./04_system_architecture.md), 구현 대조는
> [`07_implementation_sync.md`](./07_implementation_sync.md) 참조.

FlashHook 은 가입 없이 24시간 동안 임시 엔드포인트를 발급받아 웹훅을 실시간(SSE)으로 수신하는
단일 인스턴스 플랫폼입니다(Spring Boot 4.x, MongoDB, Redis). 본 문서는 **동시 접속 500명**,
**웹훅 수신 500 TPS** 라는 스트레스 상황을 기준으로 한계를 분석합니다.

---

## 0. 웹훅 1건이 처리되는 경로 (병목 이해의 전제)

부하 특성을 이해하려면 요청이 **서로 다른 3개의 스레드 풀**을 거친다는 점이 핵심입니다.

```
[외부 서비스] --HTTP--> (1) Tomcat 워커 스레드
                          │  RateLimitFilter: Redis Lua INCR/EXPIRE 검증
                          │  WebhookService.receive():
                          │    - MongoDB 로그 Insert
                          │    - findAndModify 로 카운터 원자적 증가(logCount/size)
                          │    - 로그 상한(500건/5MB) enforce
                          │    - eventPublisher.publishEvent(WebhookReceivedEvent)  ← 여기서 분기
                          │
                          ├─(2) taskExecutor (@Async @EventListener)
                          │      SseEmitterService.handleWebhookReceived():
                          │        해당 EP 구독자에게 for 루프로 순차 send  ← SSE 팬아웃
                          │
                          └─(3) MockResponseScheduler.schedule() → DeferredResult
                                 별도 ScheduledExecutorService(코어×2)
                                 delayMs>0 이면 지연 후 응답, 아니면 즉시 응답
```

| # | 스레드 풀 | 담당 | 크기(현재) |
|---|-----------|------|-----------|
| (1) | Tomcat 워커 | 요청 수신 + Redis 검증 + Mongo write | Tomcat 기본(maxThreads 200) |
| (2) | `taskExecutor` (AsyncConfig) | **SSE 이벤트 팬아웃** | core 4 / max 8 / queue 100 |
| (3) | `MockResponseScheduler` 내부 | 모의 응답 지연(DeferredResult) | `availableProcessors()×2` |

> **매우 중요**: 웹훅 HTTP 응답(3)은 SSE 팬아웃(2)의 **완료를 기다리지 않는다.**
> `WebhookService.receive()` 는 이벤트만 발행하고 즉시 `MockConfig` 를 반환하며, SSE 전파는
> 별도 `@Async` 스레드에서 비동기로 일어납니다. 따라서 **웹훅 응답 지연(p95/p99)에는 SSE 병목이
> 반영되지 않으며**, SSE 성능은 "웹훅 수신 → SSE 이벤트 도달"까지의 지연을 **별도로** 측정해야
> 보입니다(§2.B, 08 문서의 SSE 시나리오).

---

## 1. 커넥션 유지 한계 (SSE)

**목표치**: 동시 접속자 500명(= 활성 SSE 스트림 500개)

FlashHook 대시보드는 서버와 SSE 커넥션을 맺고 로그를 실시간 수신합니다. Spring MVC 의 `SseEmitter`
는 **비동기 서블릿** 위에서 동작하여, 커넥션이 열려 있는 동안 Tomcat 워커 스레드를 계속 점유하지
않습니다(스트림 유지 ≠ 스레드 점유). 따라서 연결 "유지" 자체의 비용은 낮습니다.

- Tomcat 기본 최대 커넥션 수용량은 8,192개이며, OS Open FD(보통 65,535)와 JVM 힙(연결당 수 KB)의
  제한을 받습니다.
- 활성 emitter 는 `Map<endpointId, CopyOnWriteArrayList<SseEmitter>>` 로 **인메모리** 보관되고,
  30초 주기 heartbeat(`@Scheduled`) 로 좀비 커넥션을 정리합니다.
- 결론: **동시 500 스트림 유지**는 단일 JVM 에서 스레드 고갈 없이 안정적으로 방어 가능한 수준입니다.

> ⚠️ 단, "연결 유지"와 "이벤트 전파"는 별개입니다. 500개 연결이 조용히 열려만 있는 것과, 그 500개로
> 초당 수백 건을 밀어내는 것은 완전히 다른 부하이며 후자는 §2.B 의 팬아웃 병목에 걸립니다.

---

## 2. 처리량 병목 구간 분석

**목표치**: 웹훅 수신 500 TPS. 웹훅 1건당 (1)Mongo Insert → (2)`findAndModify` 카운터 →
(3)Redis Lua Rate Limit → (4)`ApplicationEvent` 발행 후 `taskExecutor` 로 SSE 비동기 전파.

### A. 데이터베이스 I/O 처리량 — 여유 있음

`application.yaml` 의 MongoDB 커넥션 풀은 `minPoolSize=10&maxPoolSize=100` 입니다.
리틀의 법칙($L=\lambda W$)으로, 쓰기 1건(Insert + findAndModify)이 5ms 라고 가정하면
풀 100개의 이론적 상한은 약 10,000 TPS($100 / 0.005 / 2$) 수준입니다. 실제 트래픽은 다수의
엔드포인트로 분산 유입되어 단일 다큐먼트 락 경합도 낮으므로, **500 TPS 는 DB 병목 없이 소화** 가능
하다고 예측합니다. (실측으로 확정 필요)

### B. 비동기 스레드 풀 고갈 ⚠️ (가장 큰 병목)

SSE 팬아웃(`SseEmitterService.handleWebhookReceived`)은 `@Async` 로 **`taskExecutor`
(core 4 / max 8 / queue 100)** 에서 실행됩니다. 두 가지 구조적 특성이 병목을 만듭니다.

1. **이벤트당 태스크 1개, 내부는 순차 send**: 하나의 `WebhookReceivedEvent` 를 처리하는 태스크가
   해당 엔드포인트의 모든 구독자에게 **for 루프로 blocking send** 합니다. 즉 태스크 1건의 비용은
   `(구독자 수 × 1회 send 시간)` 에 비례합니다.
2. **큐 초과 시 기본 거부 정책**: `ThreadPoolTaskExecutor` 는 거부 핸들러를 지정하지 않아 기본
   `AbortPolicy` 를 사용합니다. 큐(100)가 가득 차고 max(8) 도 포화되면 **`TaskRejectedException`
   이 발생하고 해당 SSE 이벤트는 유실**됩니다(웹훅 자체는 저장·응답되지만 실시간 전파만 누락).

산술 예측: 스레드 8개가 이벤트 1건 전송에 평균 20ms 걸린다고 가정하면 최대 처리량은
약 **400 TPS**($8 / 0.02$). 500 TPS 유입 시 인입이 처리 속도를 초과 → 약 1초 만에 큐(100)가
포화 → 이벤트 유실이 시작됩니다. **문서 예측상 임계는 ~400 TPS 부근**입니다.

- **관찰 지표**: "수신 웹훅 수 vs 실제 SSE 도달 수"로 **유실률**을, "수신→도달"로 **전파 지연**을
  측정. 특정 TPS 부근에서 지연이 급격히 벌어지거나 유실이 발생하는 지점이 임계.
- **튜닝 방향**: `max` / `queue` 상향(예: 시작점 `max=50`, `queue=1000`) + 거부 정책 재검토
  (`CallerRunsPolicy` 등). 단, 스레드를 무작정 늘리면 컨텍스트 스위칭/힙 압박이 커지므로
  **최적값은 반드시 실측으로 결정**해야 합니다. 특히 개발 머신과 운영(Oracle Cloud ARM 단일
  인스턴스)은 코어 수·메모리·네트워크가 달라 최적값 자체가 다를 수 있습니다.

### C. 어뷰징 방어벽 (Rate Limit)

Redis Lua(고정 윈도우)로 **웹훅 수신 100회/분/EP(≈1.6 TPS)**, 엔드포인트 생성 5회/10분/IP 로
제한합니다. 이는 악의적 트래픽 방어의 필수 요소이나, 부하 테스트에서는 가장 먼저 429 를 유발하는
장벽이므로 **용량 측정 시에는 임시로 완화**해야 합니다(§4). 반대로 "Rate Limit 이 정확히 동작하는가"
자체도 별도 검증 대상입니다(08 문서 Phase 1d).

---

## 3. 자주 간과되는 추가 한계

- **엔드포인트당 로그 상한(500건 / 5MB)**: 상한 도달 후에는 저장 로직이 "정상 write" 가 아니라
  "상한 처리(거부/정리)" 로 바뀝니다. 장시간(Soak) 테스트에서 이 지점을 넘어가면 측정값이 오염되므로,
  **순수 write 성능 측정 시에는 상한을 임시 상향**하고, **상한 동작 성능은 별도 시나리오**로 봅니다.
- **DeferredResult 하드 타임아웃 15s / 모의 지연 상한 10s**: 큰 `delayMs` 설정은 응답을 붙잡아
  Tomcat 커넥션을 오래 점유시킬 수 있습니다.
- **단일 인스턴스 전제**: SSE emitter 는 인메모리이고 Redis Pub/Sub 스케일아웃은 현재 스텁입니다.
  즉 **수평 확장 시 다른 인스턴스 구독자에게 이벤트가 전달되지 않습니다.** 스케일아웃은 별도 구현 과제.
- **페이로드 1MB 제한**: 폼/멀티파트/HTTP form-post 모두 1MB 로 제한(413).
- **24h TTL**: 엔드포인트·로그가 24시간 후 자동 삭제되므로, 초장기 데이터 누적 시나리오와는 무관.

---

## 4. 부하 테스트를 위한 전제 조건 (요약)

| 항목 | 기본값 | 부하 테스트 시 |
|------|--------|----------------|
| 웹훅 수신 Rate Limit | 100/분/EP | 용량 측정 시 대폭 완화(또는 다수 IP) |
| 엔드포인트 생성 Rate Limit | 5/10분/IP | 완화 또는 `CF-Connecting-IP` 로 IP 분산(로컬 한정, §주의) |
| 로그 상한 | 500건 / 5MB | 순수 write 측정 시 상향, 상한 동작은 별도 테스트 |
| SSE 팬아웃 풀 | core4/max8/queue100 | **먼저 디폴트로 측정 → 이후 튜닝 재측정** |

> ⚠️ **`CF-Connecting-IP` 트릭 주의**: 로컬에서는 `127.0.0.1` 이 신뢰 프록시라 이 헤더로 클라이언트
> IP 를 조작해 IP 기반 한도를 우회/분산할 수 있습니다. 그런데 이 신뢰 프록시 설정(`server.tomcat.remoteip`)은
> **base `application.yaml` 에 있어 스테이징/운영에도 동일하게 적용**됩니다. 운영은 Cloudflare Tunnel
> 뒤라 인그레스가 CF 로 한정되면 완화되지만, **스테이징이 CF 를 우회해 직접 접근 가능하면 실제
> 레이트리밋/블랙리스트 우회 취약점**이 됩니다. 스테이징 테스트 전 직접 노출 여부를 반드시 확인하세요.

---

## 5. 요약 및 시사점

- FlashHook 의 단일 인스턴스 구조는 **500 동시 SSE 연결 유지**에는 견고합니다(§1).
- 그러나 **고 TPS 실시간 전파**의 병목은 DB 가 아니라 **비동기 이벤트 큐 적체(§2.B)** 이며,
  현재 설정(max8/queue100 + AbortPolicy + 순차 send)상 **~400 TPS 부근에서 이벤트 유실**이
  예측됩니다.
- 따라서 500 TPS 안정화를 위해서는 **(1) 부하 테스트용 Rate Limit/로그 상한 임시 완화,
  (2) 비동기 스레드 풀·큐·거부정책 튜닝** 이 병행되어야 하며, 그 최적값은 **"디폴트로 먼저 측정 →
  튜닝 → 재측정"** 순서로, 최종 임계치는 **운영과 동일 스펙 환경에서** 확정해야 합니다.
- 위 예측을 실제로 검증·수치화하는 절차는 [`08_load_test_execution_plan.md`](./08_load_test_execution_plan.md)
  를 참조하세요.
