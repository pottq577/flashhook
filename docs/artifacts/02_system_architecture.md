# FlashHook — DB 모델링

> MongoDB + Redis 데이터 설계
> 최종 수정: 2026-06-07

---

## 1. DB 구성 개요

| 저장소  | 역할                                        | 데이터 특성                   |
| ------- | ------------------------------------------- | ----------------------------- |
| MongoDB | 엔드포인트 메타 + 웹훅 로그                 | 영속(24h TTL), 비정형 Payload |
| Redis   | SSE 연결 관리, Rate Limit 카운터, 임시 캐시 | 휘발성, 빠른 읽기/쓰기        |

---

## 2. MongoDB Collections

### 2.1. endpoints

엔드포인트 메타데이터. 생성 시 1건 삽입, 24시간 후 TTL 자동 삭제.

```json
{
  "_id": ObjectId,
  "endpointId": "a1b2c3d4-5e6f-...",          // UUID v4 (공개용)
  "accessTokenHash": "sha256:e3b0c44...",      // SHA-256 해시 (원본 미저장)
  "label": "Toss 결제테스트",                    // optional, null 허용
  "creatorIp": "203.0.113.1",                   // 생성자 IP (Rate Limit 용)
  "logCount": 42,                               // 현재 로그 수 (앱 레벨 관리)
  "logSizeBytes": 128000,                       // 현재 로그 총 크기 (앱 레벨 관리)
  "version": 0,                                 // Optimistic Locking 필드
  "mockConfig": {                               // 응답 모의 설정
    "statusCode": 200,
    "delayMs": 0,
    "headers": {},
    "body": "ok"
  },
  "createdAt": ISODate("2026-06-07T22:35:00Z"), // TTL Index 기준 필드
  "expiresAt": ISODate("2026-06-08T22:35:00Z")  // FE 표시용
}
```

**인덱스:**

```javascript
// TTL Index — 24시간 후 자동 삭제
db.endpoints.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// 조회용
db.endpoints.createIndex({ endpointId: 1 }, { unique: true });

// IP 기반 활성 엔드포인트 수 조회용 (향후 creatorIp 기반 조회 쿼리 추가 시 인덱스 필요)
// db.endpoints.createIndex({ creatorIp: 1 });
```

### 2.2. logs

웹훅 수신 로그. 엔드포인트당 최대 500건 OR 5MB (앱 레벨 순환 덮어쓰기).

```json
{
  "_id": ObjectId,
  "logId": "log_abc123",
  "endpointId": "a1b2c3d4-5e6f-...",           // endpoints 참조 (JOIN 아님, 필터링용)
  "method": "POST",
  "url": "/api/hooks/a1b2c3d4-...?param=value",
  "headers": {                                   // 전체 헤더 원본
    "Content-Type": "application/json",
    "X-Custom-Header": "some-value",
    "User-Agent": "PaymentService/2.0"
  },
  "queryParams": {                               // 쿼리 파라미터 파싱 결과
    "param": "value"
  },
  "body": {                                      // 원본 Payload (비정형)
    "event": "payment.success",
    "amount": 50000
  },
  "bodyPreview": "{\"event\": \"payment.success\", \"amou...",  // 앞 300자 텍스트 절단
  "contentType": "application/json",
  "clientIp": "203.0.113.1",
  "bodySize": 256,                               // bytes
  "receivedAt": ISODate("2026-06-07T22:40:00Z")  // TTL Index 기준 필드
}
```

**인덱스:**

```javascript
// TTL Index — 24시간 후 자동 삭제
db.logs.createIndex({ receivedAt: 1 }, { expireAfterSeconds: 86400 });

// 엔드포인트별 로그 조회 (최신순 정렬)
db.logs.createIndex(
  { endpointId: 1, receivedAt: -1, logId: -1 },
  { name: "idx_endpoint_received_logId" },
);

// 개별 로그 상세 조회용 (getLogDetail 쿼리 대응)
db.logs.createIndex({ logId: 1 }, { unique: true });
```

---

## 3. Redis Key 설계

```
# Rate Limiting — Fixed Window Counter
rl:create:{ip}                      → INCR + EXPIRE 86400s (5개/IP/24시간)
rl:hook:{endpointId}:{ip}           → INCR + EXPIRE 60s  (100건/EP/IP/분)

# SSE 연결 관리
stream_token:{token}                → SET + EXPIRE 30s (SSE 연결용 일회용 토큰)
sse:connections:{ip}                → SET (동시 SSE 수 추적, 최대 5) (예정)

# IP당 활성 엔드포인트 수 (빠른 조회용 캐시)
endpoint:count:{ip}                 → INCR/DECR + TTL 없음 (MongoDB와 동기화)
```

---

## 4. 데이터 보존 및 생명주기 정책 (Data Lifecycle)

FlashHook은 무한히 증가할 수 있는 웹훅 데이터로 인한 스토리지 비용 폭증을 막고, 휘발성 테스트 목적에 맞게 단기 데이터 보존 원칙을 따릅니다.

### 4.1. 보존 기간 (TTL) 및 자동 폐기

모든 엔드포인트와 해당 엔드포인트로 수신된 로그는 **생성 시점으로부터 24시간 후 자동 폐기**됩니다.

- **MongoDB**: `endpoints`와 `logs` 컬렉션에 설정된 TTL 인덱스(`expireAfterSeconds: 86400`)에 의해 몽고DB 백그라운드 프로세스가 오래된 문서를 자동 삭제합니다.
- **Redis**: Rate Limiting 키 및 상태 캐시 키들은 각각 설정된 TTL(`60s` ~ `86400s`)에 맞춰 자동 만료(Eviction)됩니다. 별도의 애플리케이션 레벨 배치 작업 없이도 데이터베이스 엔진 레벨에서 수명 주기가 관리됩니다.

### 4.2. 앱 레벨 스토리지 캡 (Storage Cap)

단일 엔드포인트가 비정상적으로 많은 웹훅을 수신하여 몽고DB 스토리지를 독점하는 것을 방지하기 위해 캡(Cap)을 적용합니다.

- **개수 제한**: 엔드포인트당 최대 500건의 로그만 유지 (초과 시 오래된 로그 순환 덮어쓰기)
- **용량 제한**: 엔드포인트당 누적 로그 크기 최대 5MB 유지

### 4.3. 데이터 흐름도

```text
[생성] → endpoints + Redis 카운터
  ↓
[수신] → logs 삽입 + 앱 레벨 캡 체크 (500건/5MB)
  ↓  초과 시 → 가장 오래된 로그 삭제 (순환 덮어쓰기)
  ↓
[24시간 경과] → MongoDB TTL Index가 endpoints, logs 자동 삭제
             → Redis 키는 자체 EXPIRE로 소멸
```

---

## 5. 앱 레벨 캡 적용 로직 (의사코드)

```java
void saveLog(WebhookLog log) {
    // 1. 용량 체크
    EndpointMeta meta = endpointRepository.findByEndpointId(log.getEndpointId());

    // 2. 500건 초과 OR 5MB 초과 → 가장 오래된 로그 삭제
    if (meta.getLogCount() > maxLogCount || meta.getLogSizeBytes() > maxLogSizeBytes) {
        WebhookLog oldest = logRepository.findOldestByEndpointId(log.getEndpointId());
        logRepository.delete(oldest);
        meta.decrementLogCount();
        meta.subtractLogSize(oldest.getBodySize());
    }

    // 3. bodyPreview 생성 (앞 300자)
    log.setBodyPreview(truncate(log.getRawBody(), 300));

    // 4. 저장
    logRepository.save(log);
    meta.incrementLogCount();
    meta.addLogSize(log.getBodySize());
    endpointRepository.save(meta);
}
```

# FlashHook — 인프라 아키텍처 (비용 최적화)

> 비용 최적화 MVP ($0/월) 및 프로덕션 스케일업 설계
> 최종 수정: 2026-06-11

---

## 1. MVP 아키텍처 (비용: 월 $0)

```text
                    ┌─────────────┐
                    │ Cloudflare  │
                    │ flashhook.kr│
                    │(DNS/CDN/SSL)│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     flashhook.kr/*          api.flashhook.kr/*
              │                         │
     ┌────────▼────────┐      ┌────────▼────────┐
     │     Vercel      │      │Oracle Cloud ARM │
     │  (React SPA)    │      │(Always Free 24G)│
     └─────────────────┘      │                 │
                              │  ┌────────────┐ │
                              │  │ Nginx      │ │
                              │  └──────┬─────┘ │
                              │         │       │
                              │  ┌──────▼─────┐ │
                              │  │Spring Boot │ │
                              │  └────────────┘ │
                              │                 │
                              │  ┌────────────┐ │
                              │  │ Redis      │ │
                              │  └────────────┘ │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  MongoDB Atlas  │
                              │  (M0 Free Tier) │
                              └─────────────────┘
```

### 1.1. 구성 요소

| 구성      | 선택                    | 이유                                                                                                         |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Compute   | Oracle Cloud ARM (Free) | Spring Boot + Redis 동시 운영을 위해 2GB 이상의 메모리가 필수. 24GB RAM을 영구 무료로 제공하는 유일한 선택지 |
| FE 호스팅 | Vercel                  | React SPA 정적 배포, GitHub 연동 자동 CI/CD, 무료                                                            |
| DNS/CDN   | Cloudflare              | 도메인 구매 원가 수준, DNS, DDoS 방어, SSL, CDN 무료 제공                                                    |
| DB        | MongoDB Atlas M0        | 무료. 512MB 스토리지. 24시간 TTL 서비스라 용량 충분                                                          |
| Cache     | Redis (Oracle 내 설치)  | Rate Limit, SSE `stream_token` 관리용                                                                        |

### 1.2. 도메인 구조

```text
flashhook.kr          → Vercel (React SPA)
api.flashhook.kr      → Oracle Cloud ARM (Spring Boot API)
```

### 1.3. 월 예상 비용

```text
Oracle Cloud ARM (24GB):      $0
Vercel (FE 호스팅):             $0
Cloudflare (DNS/SSL/CDN):     $0
MongoDB Atlas M0:             $0
도메인 (.kr / Cloudflare):    연 $10~12
─────────────────────────────────
총합:                         $0/월 (도메인 유지비 제외)
```

---

## 2. "AWS 비사용" 포트폴리오 면접 대응 전략

Route 53, S3, CloudFront를 AWS로 구성하는 절충안도 있지만, Vercel과 Cloudflare가 각각 그 역할을 무료로 대체하므로 포트폴리오 운영 비용을 최소화하기 위해 해당 구조를 채택했습니다.

> **면접 답변 예시:**
> "AWS가 업계 표준인 걸 알고 있고 스케일아웃 시 ECS Fargate로 전환하는 설계도 문서에 준비했습니다. 포트폴리오 장기 운영을 위해 JVM 메모리 요구사항(2GB 이상)을 충족하는 유일한 무료 옵션인 Oracle Cloud를 선택했고, 프론트엔드 및 DNS 역시 Vercel과 Cloudflare를 통해 비용 효율을 극대화했습니다."

---

## 3. 프로덕션 스케일업 아키텍처 (AWS 전환 시나리오)

서비스 성공 및 트래픽 폭증 시, AWS 기반의 프로덕션 아키텍처로 전환합니다.

```text
                    ┌─────────────┐
                    │  Route 53   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐      ┌────────▼────────┐
     │   CloudFront    │      │      ALB        │
     │   + S3 (SPA)    │      │   + ACM (SSL)   │
     └─────────────────┘      └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  ECS Fargate    │
                              │  (Spring Boot)  │
                              │  Auto Scaling   │
                              │  2~N 컨테이너    │
                              └────────┬────────┘
                                       │
                         ┌─────────────┼─────────────┐
                         │                           │
                ┌────────▼────────┐        ┌────────▼────────┐
                │  ElastiCache    │        │  MongoDB Atlas  │
                │  Redis Cluster  │        │  M10+ (Dedicated)│
                └─────────────────┘        └─────────────────┘
```

### 3.1. 스케일업 전환 기준

| 전환 시점          | 변경 사항                                           |
| ------------------ | --------------------------------------------------- |
| SSE 동시 접속 100+ | Oracle → **ECS Fargate** (오토 스케일링)            |
| Redis 메모리 부족  | 단일 인스턴스 → **ElastiCache** (관리형)            |
| MongoDB 512MB 초과 | Atlas M0 → **M10+** (전용 클러스터)                 |
| 엔터프라이즈 운영  | Vercel/Cloudflare → **Route 53 + CloudFront + ALB** |
| 멀티 인스턴스 SSE  | **Redis Pub/Sub**로 SSE 이벤트 브로드캐스트         |

---

## 4. CI/CD 파이프라인

### 4.1. 현재 구축 상태 (CI)

현재는 GitHub Actions 기반의 지속적 통합(CI) 파이프라인(`.github/workflows/ci.yml`)만 구성되어 있습니다.

- **공통**: Docker Compose를 활용한 로컬 DB 구동
- **백엔드**: Java 21 기반 Gradle 빌드, 테스트
- **프론트엔드**: Playwright E2E 테스트 자동화

### 4.2. MVP 배포 파이프라인 (CD)

```text
[GitHub Push]
    ├─ FE (Vercel): Push 즉시 Vercel 연동으로 자동 빌드 & 배포
    └─ BE (GitHub Actions): Gradle build → Docker 이미지 빌드 → Oracle Cloud SSH 배포
```

---

## 5. 서버 내부 구성 및 Nginx 설정 (MVP)

```text
Oracle Cloud ARM 인스턴스
├── Nginx (:80, :443)
│   ├── SSL 인증서 (Cloudflare Origin Cert 또는 Let's Encrypt)
│   └── 리버스 프록시 → localhost:8080
├── Spring Boot (:8080)
├── Redis (:6379)
└── Docker Compose (Spring Boot + Redis 구동)
```

### Nginx 설정 핵심 (SSE)

```nginx
# SSE를 위한 프록시 설정
location /api/endpoints/ {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # SSE 전용 (stream 경로)
    proxy_buffering off;          # SSE 버퍼링 비활성화
    proxy_cache off;
    proxy_read_timeout 1800s;     # 30분 (SSE 최대 유지)
}
```

## 6. 보안 설정

| 항목           | 설정                                                              |
| -------------- | ----------------------------------------------------------------- |
| Security Group | 인바운드: 80, 443 (Cloudflare IP 대역만 허용 권장) + 22 (내 IP만) |
| Redis          | 외부 노출 ✕. localhost 바인딩만                                   |
| MongoDB Atlas  | Oracle Cloud IP 화이트리스트만 허용                               |
| SSH            | Key Pair 인증. 비밀번호 로그인 비활성화                           |

# FlashHook — 백엔드 아키텍처

> Java Spring Boot / 3-Layer + ApplicationEvent
> 최종 수정: 2026-06-08

---

## 1. 아키텍처 패턴 선택

### 1.1. 선택: 3-Layer + Spring ApplicationEvent

| 패턴                |     판단     | 이유                                                |
| ------------------- | :----------: | --------------------------------------------------- |
| 3-Layer             |    ⭐⭐⭐    | 단순하지만 쓰기→SSE 푸시가 Service에 뒤섞임         |
| CQRS                |     ⭐⭐     | 도메인 2개에 CQRS는 오버엔지니어링                  |
| **3-Layer + Event** | **⭐⭐⭐⭐** | 3-Layer 단순함 유지 + 웹훅→SSE 흐름만 이벤트로 분리 |

### 1.2. 핵심 이벤트 흐름

```
[외부 서비스] → ANY /api/hooks/{id}
                    ↓
            WebhookService.receive()
              ├─ 캡 체크 및 MongoDB 저장 (findAndModify)
              └─ ApplicationEvent 발행 ──(@Async)──→ SseEmitterService.push()
                    ↓ (MockConfig 반환)                     ↓ (비동기)
              MockResponse 동적 응답                 SSE로 클라이언트 푸시
```

- **WebhookService는 SSE를 모름.** 저장 + 이벤트 발행만.
- **SseEmitterService는 저장을 모름.** 이벤트 수신 + 푸시만.
- **@Async 필수.** 동기 시 SSE 푸시 지연 → 외부 서비스 타임아웃 위험.

---

## 2. 패키지 구조

```
com.flashhook
├── FlashHookApplication.java
│
├── domain/
│   ├── endpoint/
│   │   ├── controller/
│   │   │   └── EndpointController.java        // 엔드포인트 CRUD API
│   │   ├── service/
│   │   │   └── EndpointService.java           // 생성, 조회, 삭제
│   │   ├── repository/
│   │   │   └── EndpointRepository.java        // MongoDB Repository
│   │   ├── dto/
│   │   │   ├── EndpointCreateRequest.java     // { "label": "..." }
│   │   │   └── EndpointResponse.java          // 응답 DTO
│   │   └── model/
│   │       └── Endpoint.java                  // MongoDB Document
│   │
│   └── webhook/
│       ├── controller/
│       │   ├── WebhookReceiveController.java  // ANY /api/hooks/{id} — 웹훅 수신
│       │   ├── WebhookLogController.java      // 로그 조회/삭제 API
│       │   └── WebhookStreamController.java   // SSE 스트림 API
│       ├── service/
│       │   ├── WebhookService.java            // 수신 처리 + 저장 + 이벤트 발행
│       │   ├── WebhookLogService.java         // 로그 조회/삭제
│       │   └── SseEmitterService.java         // SSE 연결 관리 + @Async 이벤트 수신 → 푸시
│       ├── repository/
│       │   └── WebhookLogRepository.java      // MongoDB Repository
│       ├── dto/
│       │   ├── WebhookLogResponse.java        // 목록용 (bodyPreview 포함)
│       │   └── WebhookLogDetailResponse.java  // 상세용 (전체 body/headers)
│       ├── model/
│       │   └── WebhookLog.java                // MongoDB Document
│       └── event/
│           └── WebhookReceivedEvent.java      // ApplicationEvent
│
└── global/
    ├── config/
    │   ├── AsyncConfig.java                   // @EnableAsync + ThreadPool 설정
    │   ├── MongoConfig.java                   // MongoDB 연결 설정
    │   ├── RedisConfig.java                   // Redis 연결 설정
    │   ├── WebConfig.java                     // CORS 설정
    │   └── SseConfig.java                     // SSE 타임아웃 설정
    ├── infrastructure/
    │   └── redis/
    │       ├── RedisMessagePublisher.java     // ApplicationEvent → Redis Pub
    │       └── RedisMessageSubscriber.java    // Redis Sub → SseEmitterService
    ├── security/
    │   ├── AccessTokenFilter.java             // 토큰 검증 Servlet Filter
    │   └── AccessTokenUtil.java               // SHA-256 해시 생성/비교
    ├── ratelimit/
    │   ├── RateLimitFilter.java               // Rate Limiting Servlet Filter
    │   └── RateLimitService.java              // Redis Fixed Window Counter
    ├── exception/
    │   ├── GlobalExceptionHandler.java        // @RestControllerAdvice
    │   ├── ErrorCode.java                     // 에러 코드 enum
    │   └── ErrorResponse.java                 // 공통 에러 응답 DTO
    └── util/
        └── IpExtractor.java                   // X-Forwarded-For / RemoteAddr 추출
```

---

## 3. 핵심 코드 설계

### 3.1. 비동기 이벤트 처리

```java
// global/config/AsyncConfig.java
@EnableAsync
@Configuration
public class AsyncConfig {
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

### 3.2. 웹훅 수신 → 이벤트 발행

```java
// domain/webhook/service/WebhookService.java
@Service
@RequiredArgsConstructor
public class WebhookService {
    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public MockConfig receive(String endpointId, IncomingWebhookPayload payload) {
        // 1. 엔드포인트 확인
        Endpoint endpoint = endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        // 2. Object Body 및 Preview 생성
        Object bodyObj = payload.getRawBody();
        if (payload.getContentType() != null && payload.getContentType().toLowerCase().contains("application/json")) {
            try {
                bodyObj = objectMapper.readValue(payload.getRawBody(), Object.class);
            } catch (Exception e) {
                // 파싱 실패 시 원본 문자열 유지
            }
        }

        String bodyPreview = payload.getRawBody();
        if (payload.getRawBody() != null && payload.getRawBody().length() > bodyPreviewLength) {
            int cutIndex = payload.getRawBody().offsetByCodePoints(0, Math.min(payload.getRawBody().codePointCount(0, payload.getRawBody().length()), bodyPreviewLength));
            bodyPreview = payload.getRawBody().substring(0, cutIndex);
        }

        // 3. 로그 저장
        WebhookLog log = WebhookLog.builder()
                .logId(UUID.randomUUID().toString().replace("-", ""))
                .endpointId(endpointId)
                .method(payload.getMethod())
                .url(payload.getUrl())
                .headers(payload.getHeaders())
                .queryParams(payload.getQueryParams())
                .body(bodyObj)
                .bodyPreview(bodyPreview)
                .contentType(payload.getContentType())
                .clientIp(payload.getClientIp())
                .bodySize(payload.getBodySize())
                .receivedAt(Instant.now())
                .build();
        webhookLogRepository.save(log);

        // 4. 엔드포인트 카운터 업데이트 (Atomic)
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update().inc("logCount", 1).inc("logSizeBytes", payload.getBodySize());
        Endpoint updatedEndpoint = mongoTemplate.findAndModify(
            query,
            update,
            org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true),
            Endpoint.class
        );

        if (updatedEndpoint != null) {
            enforceLogCap(updatedEndpoint);
        }

        // 5. 이벤트 발행 (SSE 전파용)
        eventPublisher.publishEvent(new WebhookReceivedEvent(log));

        return endpoint.getMockConfig() != null ? endpoint.getMockConfig() : new MockConfig();
    }
}
```

### 3.3. SSE 이벤트 수신 → 클라이언트 푸시

```java
// domain/webhook/service/SseEmitterService.java
@Service
public class SseEmitterService {
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String endpointId, long timeout) {
        SseEmitter emitter = new SseEmitter(timeout);
        emitters.computeIfAbsent(endpointId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(endpointId, emitter));
        emitter.onTimeout(() -> removeEmitter(endpointId, emitter));
        emitter.onError(e -> removeEmitter(endpointId, emitter));
        return emitter;
    }

    @Async
    @EventListener
    public void handleWebhookReceived(WebhookReceivedEvent event) {
        WebhookLog log = event.getLog();
        List<SseEmitter> targets = emitters.getOrDefault(log.getEndpointId(), List.of());

        for (SseEmitter emitter : targets) {
            try {
                emitter.send(SseEmitter.event()
                    .data(WebhookLogResponse.from(log)));
            } catch (IOException e) {
                removeEmitter(log.getEndpointId(), emitter);
            }
        }
    }
}
```

### 3.4. Redis Pub/Sub 브릿지 (스케일아웃 대비)

```java
// global/infrastructure/redis/RedisMessagePublisher.java
@Component
@RequiredArgsConstructor
public class RedisMessagePublisher {
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    // MVP에선 미사용. 스케일아웃 시 활성화.
    // @Async @EventListener 로 WebhookReceivedEvent 수신
    // → Redis Pub/Sub 채널("webhook:{endpointId}")로 발행
    public void publish(String endpointId, WebhookLogResponse log) {
        String channel = "webhook:" + endpointId;
        redisTemplate.convertAndSend(channel, serialize(log));
    }
}

// global/infrastructure/redis/RedisMessageSubscriber.java
@Component
@RequiredArgsConstructor
public class RedisMessageSubscriber implements MessageListener {
    private final SseEmitterService sseEmitterService;

    // Redis Sub → SseEmitterService.push() 호출
    @Override
    public void onMessage(Message message, byte[] pattern) {
        // 역직렬화 → sseEmitterService에 전달
    }
}
```

**MVP → 스케일아웃 전환:**

```
MVP (EC2 1대):
  WebhookService → ApplicationEvent → @Async SseEmitterService

스케일아웃 (ECS N대):
  WebhookService → ApplicationEvent → @Async RedisMessagePublisher
                                         ↓ Redis Pub/Sub
                                      RedisMessageSubscriber → SseEmitterService
```

SseEmitterService 코드 변경 없이 이벤트 소스만 교체.

### 3.5. 로그 조회 및 페이징 (Cursor Pagination)

대량의 웹훅 로그 조회를 최적화하기 위해 커서 기반 페이징(Cursor Pagination)을 사용합니다.
클라이언트는 `lastSeenId` (마지막으로 조회한 로그 ID)를 전달하며, 응답은 Spring Data `Page` 객체 형태(`content`, `totalElements` 등)로 반환되어 일관된 인터페이스를 제공합니다.

---

## 4. Filter 체인

```
HTTP 요청 인입
    ↓
[RateLimitFilter]     ← /api/endpoints (생성), /api/hooks/* (수신)
    ↓
[AccessTokenFilter]   ← /api/endpoints/{id}/** (단, GET /stream 제외)
    ↓
[DispatcherServlet → Controller → Service → Repository]
```

| Filter            | 적용 경로                                         | 동작                                                                            |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| RateLimitFilter   | `/api/endpoints` (POST), `/api/hooks/*`           | Redis 카운터 체크 → 초과 시 429                                                 |
| AccessTokenFilter | `/api/endpoints/{id}/**` (단, GET `/stream` 제외) | X-Access-Token 헤더 검증 → 실패 시 403. GET `/stream`은 별도 `streamToken` 검증 |

> `/api/hooks/{id}` (웹훅 수신)은 AccessTokenFilter 미적용. 외부 서비스가 호출하므로.

---

## 5. 기술 스택 요약

| 영역      | 기술                                  |
| --------- | ------------------------------------- |
| Framework | Spring Boot 3.5.0                     |
| Language  | Java 21+                              |
| DB        | Spring Data MongoDB                   |
| Cache     | Spring Data Redis                     |
| 실시간    | Spring SseEmitter                     |
| 비동기    | @EnableAsync + ThreadPoolTaskExecutor |
| 빌드      | Gradle                                |
| 컨테이너  | Docker + docker-compose               |

# FlashHook — 프론트엔드 아키텍처 (FSD 기반)

> React 19 (Vite 8) + TypeScript / FSD 아키텍처 기반 다크 모드 SPA
> 최종 수정: 2026-06-10

---

## 1. 기술 스택

| 영역       | 기술                        | 이유                                        |
| ---------- | --------------------------- | ------------------------------------------- |
| Framework  | React 19.2 (Vite 8.0)       | 최신 렌더링 최적화, 압도적인 빌드 속도      |
| Language   | TypeScript 5.7              | 컴파일 타임 안정성 및 강화된 타입 추론      |
| Routing    | react-router-dom v7.17      | 최신 SPA 라우팅 지원                        |
| 아키텍처   | FSD (Feature-Sliced Design) | 비즈니스 로직과 UI 분리, 모듈 확장성 극대화 |
| 상태 관리  | Zustand 5.0                 | 간편하고 성능이 우수한 전역 상태 관리       |
| 비동기     | TanStack Query 5.101        | API 패칭, 캐싱, 서버 상태 동기화            |
| 애니메이션 | Framer Motion 12.40         | 매끄러운 뷰 트랜지션 및 마이크로 인터랙션   |
| E2E/A11y   | Playwright + Axe            | CI/CD 연동 자동화 테스트 및 웹 접근성 검사  |
| 스타일     | Vanilla CSS (CSS Modules)   | 다크 모드 디자인 시스템. 충돌 없는 스타일링 |

---

## 2. 디렉토리 구조 (FSD)

```text
src/
├── app/               // 앱 전역 설정, 진입점 및 프로바이더 (App.tsx, QueryProvider.tsx)
├── pages/             // 페이지 컴포넌트 (라우팅 뷰)
│   ├── landing/
│   ├── dashboard/
│   ├── not-found/
│   ├── about/
│   └── legal/
├── widgets/           // 독립적인 UI 블록 (header, endpoint-info, log-viewer, mock-config, legal)
├── features/          // 사용자 상호작용 및 비즈니스 로직 단위 (realtime-logs)
├── entities/          // 도메인 핵심 데이터 구조, 스토어, API (endpoint, log)
└── shared/            // 재사용 가능한 공통 컴포넌트, 유틸, API 클라이언트
    ├── api/           // fetch 래퍼 클라이언트 (client.ts)
    ├── lib/           // 공통 유틸리티 (useIsMobile.ts 등)
    └── ui/            // 공통 UI 요소 (MethodBadge, Toast, CopyButton, ConfirmModal 등)
```

---

## 3. 라우팅

```tsx
// app/App.tsx
<BrowserRouter>
  <main>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard/:endpointId" element={<DashboardPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </main>
  <CookieBanner />
</BrowserRouter>
```

---

## 4. 핵심 상태 관리 (Zustand & React Query)

초기 기획과 다르게 프로젝트 확장성과 코드의 간결성을 위해 **Zustand**와 **React Query**를 도입했습니다.

### 4.1. 서버 상태 동기화 (TanStack Query)

REST API 통신은 React Query를 통해 캐싱되고 관리됩니다.

- **엔드포인트 정보 및 초기 로그 조회**: `lastSeenId` 커서 기반의 Spring Data Page 객체(`content`, `totalElements`)를 사용하여, 불필요한 네트워크 요청을 줄이고 스크롤 기반의 효율적인 데이터 페칭을 수행합니다.

### 4.2. 전역 상태 관리 (Zustand)

로그 목록 및 선택된 로그 상태는 Zustand 스토어(`useLogStore`)를 통해 관리합니다. SSE 이벤트를 수신하면 Zustand 스토어가 업데이트되며, 이를 구독하는 `widgets`가 반응적으로 렌더링됩니다.

### 4.3. 상태 동기화 및 캐시 무효화 전략 (Cache Invalidation)

데이터 동기화 및 최신 상태 유지를 위해 아래와 같은 캐시 관리 전략을 취합니다.

- **SSE 웹훅 이벤트 수신 시 (Optimistic/Reactive Update)**:
  - 새로운 웹훅 로그가 들어오면 무거운 백엔드 전체 로그 조회 API(`GET /logs`)를 다시 호출하지 않습니다.
  - SSE로 넘어온 `data` (단일 로그 JSON)를 Zustand 스토어 배열의 **맨 앞(Unshift)**에 직접 주입하여 즉각적인 UI 반영(낙관적 렌더링)을 수행합니다.
- **로그 전체 삭제 시 (Query Invalidation)**:
  - 사용자가 "모든 로그 삭제"를 수행하면 React Query의 `invalidateQueries({ queryKey: ['logs', endpointId] })`를 호출하여 서버 상태와 클라이언트 상태를 강제 동기화하고 로컬 캐시를 파기합니다.
- **만료(TTL)로 인한 엔드포인트 증발 시**:
  - React Query 폴링이나 SSE 도중 `404 ENDPOINT_NOT_FOUND` 또는 `403 INVALID_TOKEN` 에러가 발생하면, 글로벌 에러 핸들러에서 이를 낚아채어 로컬 스토리지 및 내부 상태를 초기화하고 만료 안내 페이지 또는 홈으로 리다이렉션합니다.

---

## 5. 데이터 흐름 (DashboardPage)

```text
[초기 로그 로드]
    ↓ API: GET /api/endpoints/{id}/logs?lastSeenId={cursor} (Spring Data Page 형식)
    ↓ 응답의 content를 Store에 적재 (totalElements 확인)

[SSE 연결 플로우 - features/realtime-logs]
    1. POST /api/endpoints/{id}/stream-token (Header: X-Access-Token)
       → 단기 일회성 streamToken 발급
    2. EventSource 연결: GET /api/endpoints/{id}/stream?streamToken={streamToken}
       → SSE 수신 대기

[SSE 이벤트 수신]
    ↓ onMessage
Zustand Store 업데이트 (addLog - entities/log/model)
    ↓
<DashboardPage> (pages/dashboard/ui)
  ├── <EndpointInfo>, <ConnectionStatus> (widgets/endpoint-info) - 상태 및 만료 표시
  ├── <LogList> (widgets/log-viewer)      - 좌측: 새로운 로그 슬라이드인 애니메이션
  └── Tab Navigation (DashboardPage)      - 우측: 조건부 렌더링
        ├── <LogDetail> (widgets/log-viewer) - 로그 상세 뷰
        └── <MockConfigPanel> (widgets/mock-config) - Mock 응답 설정 패널 (Phase 2 동작 중)
```

---

## 6. API 클라이언트 및 타입 정의

- **API 클라이언트 (`shared/api/client.ts`)**: fetch 래퍼를 구성하여 런타임에 sessionStorage 토큰을 자동으로 헤더에 주입합니다.
- **도메인 단위 분리 (`entities/`)**: 각 도메인(Endpoint, Log)에 대한 쿼리(`*.queries.ts`)와 타입 모델이 엄격하게 관리되어 프론트/백엔드 규약을 강제합니다.

---

## 7. 접근성 및 테스트 (Playwright)

초기 계획에 없던 Playwright를 도입하여 E2E 테스트 및 접근성(A11y) 검사를 자동화했습니다.

- `@axe-core/playwright`를 통해 WCAG 2.1 AA 기준을 통과하는지 검증합니다.
- CI 파이프라인에서 자동으로 구동되어 회귀 오류(Regression)를 방지합니다.
