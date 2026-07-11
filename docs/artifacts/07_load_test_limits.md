# 시스템 한계치 및 부하 테스트 설계 분석

FlashHook 은 가입 없이 24시간 동안 임시 엔드포인트를 발급받아 웹훅을 실시간(SSE)으로 수신하는 단일 인스턴스 플랫폼입니다(Spring Boot 4.x, MongoDB, Redis). \
본 문서는 **동시 접속 500명**, **웹훅 수신 500 TPS** 라는 스트레스 상황을 기준으로 한계를 분석합니다.

---

## 0. 웹훅 1건이 처리되는 경로 (병목 이해의 전제)

부하 특성을 이해하려면 요청이 **서로 다른 3개의 스레드 풀**을 거친다는 점이 핵심입니다.

```text
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

| #   | 스레드 풀                    | 담당                                 | 크기(현재)                  |
| --- | ---------------------------- | ------------------------------------ | --------------------------- |
| (1) | Tomcat 워커                  | 요청 수신 + Redis 검증 + Mongo write | Tomcat 기본(maxThreads 200) |
| (2) | `taskExecutor` (AsyncConfig) | **SSE 이벤트 팬아웃**                | core 4 / max 8 / queue 100  |
| (3) | `MockResponseScheduler` 내부 | 모의 응답 지연(DeferredResult)       | `availableProcessors()×2`   |

> **매우 중요**: 웹훅 HTTP 응답(3)은 SSE 팬아웃(2)의 **완료를 기다리지 않는다.**
> `WebhookService.receive()` 는 이벤트만 발행하고 즉시 `MockConfig` 를 반환하며, SSE 전파는 별도 `@Async` 스레드에서 비동기로 일어납니다.
> 따라서 **웹훅 응답 지연(p95/p99)에는 SSE 병목이 반영되지 않으며**,
> SSE 성능은 "웹훅 수신 → SSE 이벤트 도달"까지의 지연을 **별도로** 측정해야 보입니다(§2.B, 08 문서의 SSE 시나리오).

---

## 1. 커넥션 유지 한계 (SSE)

**목표치**: 동시 접속자 500명(= 활성 SSE 스트림 500개)

FlashHook 대시보드는 서버와 SSE 커넥션을 맺고 로그를 실시간 수신합니다. \
Spring MVC 의 `SseEmitter`는 **비동기 서블릿** 위에서 동작하여, 커넥션이 열려 있는 동안 Tomcat 워커 스레드를 계속 점유하지 않습니다(스트림 유지 ≠ 스레드 점유). \
따라서 연결 "유지" 자체의 비용은 낮습니다.

- Tomcat 기본 최대 커넥션 수용량은 8,192개이며, OS Open FD(보통 65,535)와 JVM 힙(연결당 수 KB)의 제한을 받습니다.
- 활성 emitter 는 `Map<endpointId, CopyOnWriteArrayList<SseEmitter>>` 로 **인메모리** 보관되고, 30초 주기 heartbeat(`@Scheduled`) 로 좀비 커넥션을 정리합니다.
- 결론: **동시 500 스트림 유지**는 단일 JVM 에서 스레드 고갈 없이 안정적으로 방어 가능한 수준입니다.

> ⚠️ 단, "연결 유지"와 "이벤트 전파"는 별개입니다.
> 500개 연결이 조용히 열려만 있는 것과, 그 500개로 초당 수백 건을 밀어내는 것은 완전히 다른 부하이며 후자는 §2.B 의 팬아웃 병목에 걸립니다.

---

## 2. 처리량 병목 구간 분석

**목표치**: 웹훅 수신 500 TPS. 웹훅 1건당 (1)Mongo Insert → (2)`findAndModify` 카운터 → (3)Redis Lua Rate Limit → (4)`ApplicationEvent` 발행 후 `taskExecutor` 로 SSE 비동기 전파.

### A. 데이터베이스 I/O 처리량 — 여유 있음

`application.yaml` 의 MongoDB 커넥션 풀은 `minPoolSize=10&maxPoolSize=100` 입니다. \
리틀의 법칙($L=\lambda W$)으로, 쓰기 1건(Insert + findAndModify)이 5ms 라고 가정하면 풀 100개의 이론적 상한은 약 10,000 TPS($100 / 0.005 / 2$) 수준입니다. \
실제 트래픽은 다수의 엔드포인트로 분산 유입되어 단일 다큐먼트 락 경합도 낮으므로, **500 TPS 는 DB 병목 없이 소화** 가능하다고 예측합니다. (실측으로 확정 필요)

> ⚠️ **Redis 풀 설정 미명시**: `RedisConfig.java`는 `RedisConnectionFactory`를 Lettuce 기본값으로 사용하며 커넥션 풀 크기가 **코드/설정 어디에도 명시되어 있지 않습니다.**
> Lettuce 기본 풀은 단일 공유 커넥션(StatefulRedisConnection)을 사용하므로, 고 TPS 시 Redis 왕복 지연이 처리량 계산에서 누락된 변수가 됩니다.
> 부하 테스트 시 Redis 응답 지연을 별도 관찰 항목으로 추가해야 합니다.

### B. 비동기 스레드 풀 고갈 ⚠️ (가장 큰 병목)

SSE 팬아웃(`SseEmitterService.handleWebhookReceived`)은 `@Async` 로 **`taskExecutor` (core 4 / max 8 / queue 100)** 에서 실행됩니다. \
두 가지 구조적 특성이 병목을 만듭니다.

1. **이벤트당 태스크 1개, 내부는 순차 send**:
   1. 하나의 `WebhookReceivedEvent` 를 처리하는 태스크가 해당 엔드포인트의 모든 구독자에게 **for 루프로 blocking send** 합니다.
   2. 즉 태스크 1건의 비용은 `(구독자 수 × 1회 send 시간)` 에 비례합니다.
2. **큐 초과 시 기본 거부 정책**:
   1. `ThreadPoolTaskExecutor` 는 거부 핸들러를 지정하지 않아 기본 `AbortPolicy` 를 사용합니다.
   2. 큐(100)가 가득 차고 max(8) 도 포화되면 **`TaskRejectedException` 이 발생하고 해당 SSE 이벤트는 유실**됩니다(웹훅 자체는 저장·응답되지만 실시간 전파만 누락).

산술 예측: 스레드 8개가 이벤트 1건 전송에 평균 20ms 걸린다고 가정하면 최대 처리량은 약 **400 TPS**($8 / 0.02$). \
500 TPS 유입 시 인입이 처리 속도를 초과 → 약 1초 만에 큐(100)가 포화 → 이벤트 유실이 시작됩니다. \
**문서 예측상 임계는 ~400 TPS 부근**입니다.

- **관찰 지표**:
  - "수신 웹훅 수 vs 실제 SSE 도달 수"로 **유실률**을, "수신→도달"로 **전파 지연**을 측정.
  - 특정 TPS 부근에서 지연이 급격히 벌어지거나 유실이 발생하는 지점이 임계.
- **튜닝 방향**:
  - `max` / `queue` 상향(예: 시작점 `max=50`, `queue=1000`) + 거부 정책 재검토 (`CallerRunsPolicy` 등).
  - 단, 스레드를 무작정 늘리면 컨텍스트 스위칭/힙 압박이 커지므로 **최적값은 반드시 실측으로 결정**해야 합니다.
  - 특히 개발 머신과 운영(Oracle Cloud ARM 단일 인스턴스)은 코어 수·메모리·네트워크가 달라 최적값 자체가 다를 수 있습니다.

  > ⚠️ **`CallerRunsPolicy` 의 함정**: 이 정책은 큐 포화 시 이벤트 발행 스레드(= 웹훅을 처리 중인 **Tomcat 워커 스레드**)가 직접 구독자 순차 send 를 떠맡게 만듭니다.
  > 즉 이 정책이 발동하는 순간 §0 의 핵심 전제("웹훅 응답 지연 ≠ SSE 전파 지연")가 깨지고, 웹훅 p95/p99 가 SSE 팬아웃 지연을 그대로 흡수합니다(유실 대신 지연을 택하는 트레이드오프).
  > 따라서 튜닝 효과는 "유실률"만이 아니라 **"웹훅 응답 지연과 유실률을 동시에"** 보고 판단해야 합니다(08 문서 Phase 2).

### C. 어뷰징 방어벽

Redis Lua(고정 윈도우)로 다음 4가지 레이트리밋이 적용됩니다 (`RateLimitFilter.java`):

| 대상 API                                     | 한도        | 윈도우 | 키 구조                     |
| -------------------------------------------- | ----------- | ------ | --------------------------- |
| 웹훅 수신 (`/api/hooks/{id}`)                | 100회/EP/IP | 60초   | `rl:hook:{epId}:{clientIp}` |
| 엔드포인트 생성 (`POST /api/endpoints`)      | 5회/IP      | 10분   | `rl:create2:{clientIp}`     |
| Replay (`POST .../{id}/logs/{logId}/replay`) | 20회/EP     | 60초   | `rl:replay:{epId}`          |
| Public 로그 조회 (`GET /api/public/logs/`)   | 60회/IP     | 60초   | `rl:public_log:{clientIp}`  |

레이트리밋은 악의적 트래픽 방어의 필수 요소이나, 부하 테스트에서는 가장 먼저 429 를 유발하는 장벽이므로 **용량 측정 시에는 임시로 완화**해야 합니다(§4). \
반대로 "Rate Limit 이 정확히 동작하는가" 자체도 별도 검증 대상입니다(08 문서 Phase 1d).

> **failOpen 동작**: `FlashHookProperties.RateLimitProperties.failOpen = true`(기본값)로, Redis 장애 시 레이트리밋 검사가 통과됩니다.
> 이는 가용성 우선 정책이며 부하 테스트 중 Redis가 정상인지 확인이 전제됩니다.

---

## 3. 자주 간과되는 추가 한계

- **엔드포인트당 로그 상한(500건 / 5MB)**:
  - 상한 도달 후에는 저장 로직이 "정상 write" 가 아니라 "상한 처리(거부/정리)" 로 바뀝니다.
  - 장시간(Soak) 테스트에서 이 지점을 넘어가면 측정값이 오염되므로, **순수 write 성능 측정 시에는 상한을 임시 상향**하고, **상한 동작 성능은 별도 시나리오**로 봅니다.
- **DeferredResult 하드 타임아웃 15s / 모의 지연 상한 10s**:
  - 큰 `delayMs` 설정은 응답을 붙잡아 Tomcat 커넥션을 오래 점유시킬 수 있습니다.
- **단일 인스턴스 전제**:
  - SSE emitter 는 인메모리이고 Redis Pub/Sub 스케일아웃은 현재 스텁입니다.
  - 즉 **수평 확장 시 다른 인스턴스 구독자에게 이벤트가 전달되지 않습니다.**
  - 스케일아웃은 별도 구현 과제.
- **페이로드 1MB 제한**:
  - 폼/멀티파트/HTTP form-post 모두 1MB 로 제한(413).
- **24h TTL**:
  - 엔드포인트·로그가 24시간 후 자동 삭제되므로, 초장기 데이터 누적 시나리오와는 무관.

---

## 4. 부하 테스트를 위한 전제 조건 (요약)

| 항목                       | 기본값              | 부하 테스트 시                                            |
| -------------------------- | ------------------- | --------------------------------------------------------- |
| 웹훅 수신 Rate Limit       | 100/분/EP           | 용량 측정 시 대폭 완화(또는 다수 IP)                      |
| 엔드포인트 생성 Rate Limit | 5/10분/IP           | 완화 또는 `CF-Connecting-IP` 로 IP 분산(로컬 한정, §주의) |
| 로그 상한                  | 500건 / 5MB         | 순수 write 측정 시 상향, 상한 동작은 별도 테스트          |
| SSE 팬아웃 풀              | core4/max8/queue100 | **먼저 디폴트로 측정 → 이후 튜닝 재측정**                 |

> ⚠️ **`CF-Connecting-IP` 트릭 주의**: 로컬에서는 `127.0.0.1` 이 신뢰 프록시라 이 헤더로 클라이언트 IP 를 조작해 IP 기반 한도를 우회/분산할 수 있습니다.
> 그런데 이 신뢰 프록시 설정(`server.tomcat.remoteip`)은 **base `application.yaml` 에 있어 스테이징/운영에도 동일하게 적용**됩니다.
> 운영은 Cloudflare Tunnel 뒤라 인그레스가 CF 로 한정되면 완화되지만, **스테이징이 CF 를 우회해 직접 접근 가능하면 실제 레이트리밋/블랙리스트 우회 취약점**이 됩니다.
> 스테이징 테스트 전 직접 노출 여부를 반드시 확인하세요.

---

## 5. 요약 및 시사점

- FlashHook 의 단일 인스턴스 구조는 **500 동시 SSE 연결 유지**에는 견고합니다(§1).
- 그러나 **고 TPS 실시간 전파**의 병목은 DB 가 아니라 **비동기 이벤트 큐 적체(§2.B)** 이며, 현재 설정(max8/queue100 + AbortPolicy + 순차 send)상 **~400 TPS 부근에서 이벤트 유실**이 예측됩니다.
- 따라서 500 TPS 안정화를 위해서는 **(1) 부하 테스트용 Rate Limit/로그 상한 임시 완화, (2) 비동기 스레드 풀·큐·거부정책 튜닝** 이 병행되어야 하며, \
  그 최적값은 **"디폴트로 먼저 측정 → 튜닝 → 재측정"** 순서로, 최종 임계치는 **운영과 동일 스펙 환경에서** 확정해야 합니다.

---

## 6. 실측 부하 테스트 결과 (Phase 1 업데이트)

초기 예측(400 TPS 한계)과 달리, 실제 k6 부하 테스트를 통해 다음과 같은 성능 지표가 확인되었습니다.

### 6.1 시나리오별 주요 실측 데이터

| 시나리오 | 구분 | 실제 실행 시간 | 실측 성능 (TPS / Count) | 응답 시간 (p95 / Avg) | 기타 핵심 지표 및 관찰 |
|---|---|---|---|---|---|
| **S0** | Smoke Test | 30초 | **3.0 TPS** (90건/30s) | p95: `12.9ms`, Avg: `5.8ms` | 200 OK 90건, 201 1건 (정상 베이스라인) |
| **S1** | Webhook Capacity | 8분 (480s) | **278.7 TPS** (133,799/480s) | p95: `12.1ms`, Avg: `6.6ms` | Error 0%. (Ramping 목표치 600 TPS 도달 과정 포함) |
| **S2** | SSE Fanout (1:5) | 약 2분 40초 | **Webhook**: 27,749건<br>**SSE Event**: 138,701건 | Webhook p95: `16.6ms` | 하단 [S2 분석 상세] 참조 |
| **S3** | SSE Scale | 1분 | 500 VUs 연결 유지 | p95: `5.7ms`, Avg: `3.1ms` | 500개 커넥션 안정적 유지 및 Handshake 오버헤드 없음 |
| **S4** | Endpoint Spike | 2분 (120s) | **113.7 TPS** (13,649/120s) | p95: `7.0ms`, Avg: `4.0ms` | 동시다발적 생성에도 지연 없는 처리 확인 |
| **S5** | Log Query | 1분 | 100 TPS (6,001/60s) | p95: `6.8ms`, Avg: `4.8ms` | MongoDB Log Read 성능 안정적 |
| **S6** | SSRF Replay | 1분 | **20.0 TPS** (1,201/60s) | p95: `12.3ms`, Avg: `8.5ms` | 하단 [S6 분석 상세] 참조 |
| **S7** | Rate Limit | 1분 | 200 OK 100건<br>429 11건 | 200 p95: `16.7ms`<br>429 p95: `4.7ms` | Rate Limit 도달 시 즉각적 429 반환 (필터단 차단으로 오버헤드 0에 수렴) |
| **S8** | Log Cap (500 limit) | 1분 | 429 Reject 460건 | pre-cap p95: `10.0ms`<br>post-cap p95: `3.0ms` | 500건 초과 시 신규 웹훅 저장 거부 로직 정상 동작 |

### 6.2 [S2] executor.rejected.tasks 측정 및 SSE 유실률

이번 테스트에서 `taskExecutor`가 큐 포화로 거부(Reject)한 작업은 총 **19건**으로 측정되었습니다.
- **예상 SSE 이벤트 수**: 27,749 웹훅 수신 × 5 구독자 = **138,745건**
- **실제 k6 수신 이벤트 수**: **138,701건**
- **총 유실 건수**: 44건 (유실률: **0.031%**)

**분석 결론**:
현재 `taskExecutor`는 웹훅 이벤트 전파(`@Async handleWebhookReceived`)와 SSE Heartbeat 전송(`sendHeartbeat`)이 공유하는 구조입니다. 따라서 기록된 19건의 거부에는 "SSE 팬아웃 거부(1건당 5명 유실)"와 "Heartbeat 거부"가 섞여 있으며, 실측된 유실 건수(44건)가 5의 배수가 아니라는 점에서 다른 원인(k6 VU 끊김 등)이 혼재되어 있을 가능성도 있습니다.
유실률 자체는 목표치인 0.1% 미만을 충족하며, 유실 원인 중 `taskExecutor` 큐 포화가 유력하나 팬아웃/Heartbeat의 정확한 기여도는 아직 미분리 상태입니다. 추후 `Counter.builder("executor.rejected.tasks").tag("task_type", "webhook_fanout"|"heartbeat")`와 같이 태그를 세분화하여 재측정하면 진짜 병목 원인을 구체화할 수 있습니다.

### 6.3 [S6] SSRF 방어 로직 오버헤드 간접 추정

S6(SSRF 검증 포함 리플레이)의 평균 응답 시간은 `8.5ms`, S1(웹훅 수신)은 `6.6ms`로 측정되었습니다.
S6은 S1 대비 **로그 조회 + SSRF IP 검증 로직 실행 + 실제 아웃바운드 HTTP 통신 (가상 인터페이스 싱크 서버)** 과정을 모두 추가로 포함합니다. 이 모든 과정을 합친 평균 소요 시간이 S1 대비 고작 1.9ms 늦다는 것은, **순수 SSRF 방어 로직 자체의 지연(InetAddress 룩업 등)은 이 간접 추정상 ~2ms보다 훨씬 작을 것**임을 의미합니다.
다만, 이는 S1과 서로 다른 부하 프로파일(S1: 600 TPS 램핑, S6: 상수 20 TPS)에서 엔드포인트를 간접 비교한 상한 추정치이며, 검사 로직 자체를 타이머로 직접 계측한 정밀한 값은 아닙니다. 향후 확정적 SLA 보증이 필요하다면 SSRF 검증 함수 내부에 타이머를 심는 백로그 작업이 필요합니다.

### 6.4 로우 데이터 보존 안내

위 실측 지표의 원본 JSON/Prometheus 로우 데이터(가비지 파일 등)는 git 저장소를 비대하게 만드는 것을 막기 위해 `.gitignore`가 적용된 `docs/review/` 디렉토리로 격리되었습니다. 추후 재검증을 대비해 해당 원본 데이터 파일들의 장기 보존이 필요하다면, 압축 아카이브 형태로 S3 등 별도 사내 스토리지에 백업해 두는 것을 권장합니다.
