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

| Filter            | 적용 경로                               | 동작                                              |
| ----------------- | --------------------------------------- | ------------------------------------------------- |
| RateLimitFilter   | `/api/endpoints` (POST), `/api/hooks/*` | Redis 카운터 체크 → 초과 시 429                   |
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
