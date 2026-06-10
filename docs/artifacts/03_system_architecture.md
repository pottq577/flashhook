# FlashHook — 시스템 통합 아키텍처 및 설계 명세서

> 인프라, 백엔드, 그리고 DB 모델링을 포괄하는 전사적 아키텍처 설계
> 최종 수정: 2026-06-11

---

## Part 1. 인프라 아키텍처 (비용 최적화)

> 비용 최적화 MVP ($0/월) 및 프로덕션 스케일업 설계

### 1.1. MVP 아키텍처 (비용: 월 $0)

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

#### 1.1.1. 구성 요소

| 구성      | 선택                    | 이유                                                                                                         |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Compute   | Oracle Cloud ARM (Free) | Spring Boot + Redis 동시 운영을 위해 2GB 이상의 메모리가 필수. 24GB RAM을 영구 무료로 제공하는 유일한 선택지 |
| FE 호스팅 | Vercel                  | React SPA 정적 배포, GitHub 연동 자동 CI/CD, 무료                                                            |
| DNS/CDN   | Cloudflare              | 도메인 구매 원가 수준, DNS, DDoS 방어, SSL, CDN 무료 제공                                                    |
| DB        | MongoDB Atlas M0        | 무료. 512MB 스토리지. 24시간 TTL 서비스라 용량 충분                                                          |
| Cache     | Redis (Oracle 내 설치)  | Rate Limit, SSE `stream_token` 관리용                                                                        |

#### 1.1.2. 도메인 구조

```text
flashhook.kr          → Vercel (React SPA)
api.flashhook.kr      → Oracle Cloud ARM (Spring Boot API)
```

#### 1.1.3. 월 예상 비용

```text
Oracle Cloud ARM (24GB):      $0
Vercel (FE 호스팅):             $0
Cloudflare (DNS/SSL/CDN):     $0
MongoDB Atlas M0:             $0
도메인 (.kr / Cloudflare):    연 $10~12
─────────────────────────────────
총합:                         $0/월 (도메인 유지비 제외)
```

### 1.2. "AWS 비사용" 포트폴리오 면접 대응 전략

Route 53, S3, CloudFront를 AWS로 구성하는 절충안도 있지만, Vercel과 Cloudflare가 각각 그 역할을 무료로 대체하므로 포트폴리오 운영 비용을 최소화하기 위해 해당 구조를 채택했습니다.

> **면접 답변 예시:**
> "AWS가 업계 표준인 걸 알고 있고 스케일아웃 시 ECS Fargate로 전환하는 설계도 문서에 준비했습니다. 포트폴리오 장기 운영을 위해 JVM 메모리 요구사항(2GB 이상)을 충족하는 유일한 무료 옵션인 Oracle Cloud 파트를 선택했고, 프론트엔드 및 DNS 역시 Vercel과 Cloudflare를 통해 비용 효율을 극대화했습니다."

### 1.3. 프로덕션 스케일업 아키텍처 (AWS 전환 시나리오)

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

#### 스케일업 전환 기준

| 전환 시점          | 변경 사항                                           |
| ------------------ | --------------------------------------------------- |
| SSE 동시 접속 100+ | Oracle → **ECS Fargate** (오토 스케일링)            |
| Redis 메모리 부족  | 단일 인스턴스 → **ElastiCache** (관리형)            |
| MongoDB 512MB 초과 | Atlas M0 → **M10+** (전용 클러스터)                 |
| 엔터프라이즈 운영  | Vercel/Cloudflare → **Route 53 + CloudFront + ALB** |
| 멀티 인스턴스 SSE  | **Redis Pub/Sub**로 SSE 이벤트 브로드캐스트         |

### 1.4. CI/CD 파이프라인

#### 현재 구축 상태 (CI)
현재는 GitHub Actions 기반의 지속적 통합(CI) 파이프라인(`.github/workflows/ci.yml`)만 구성되어 있습니다.
- **공통**: Docker Compose를 활용한 로컬 DB 구동
- **백엔드**: Java 21 기반 Gradle 빌드, 테스트
- **프론트엔드**: Playwright E2E 테스트 자동화

#### MVP 배포 파이프라인 (CD)
```text
[GitHub Push]
    ├─ FE (Vercel): Push 즉시 Vercel 연동으로 자동 빌드 & 배포
    └─ BE (GitHub Actions): Gradle build → Docker 이미지 빌드 → Oracle Cloud SSH 배포
```

### 1.5. 서버 내부 구성 및 Nginx 설정 (MVP)

```text
Oracle Cloud ARM 인스턴스
├── Nginx (:80, :443)
│   ├── SSL 인증서 (Cloudflare Origin Cert 또는 Let's Encrypt)
│   └── 리버스 프록시 → localhost:8080
├── Spring Boot (:8080)
├── Redis (:6379)
└── Docker Compose (Spring Boot + Redis 구동)
```

#### Nginx 설정 핵심 (SSE)
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

### 1.6. 인프라 보안 설정

| 항목           | 설정                                                              |
| -------------- | ----------------------------------------------------------------- |
| Security Group | 인바운드: 80, 443 (Cloudflare IP 대역만 허용 권장) + 22 (내 IP만) |
| Redis          | 외부 노출 ✕. localhost 바인딩만                                   |
| MongoDB Atlas  | Oracle Cloud IP 화이트리스트만 허용                               |
| SSH            | Key Pair 인증. 비밀번호 로그인 비활성화                           |

---

## Part 2. DB 모델링 및 데이터 생명주기

> MongoDB + Redis 데이터 설계

### 2.1. DB 구성 개요

| 저장소  | 역할                                        | 데이터 특성                   |
| ------- | ------------------------------------------- | ----------------------------- |
| MongoDB | 엔드포인트 메타 + 웹훅 로그                 | 영속(24h TTL), 비정형 Payload |
| Redis   | SSE 연결 관리, Rate Limit 카운터, 임시 캐시 | 휘발성, 빠른 읽기/쓰기        |

### 2.2. MongoDB Collections

#### 2.2.1. endpoints
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
```

#### 2.2.2. logs
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
  { name: "idx_endpoint_received_logId" }
);
// 개별 로그 상세 조회용
db.logs.createIndex({ logId: 1 }, { unique: true });
```

### 2.3. Redis Key 설계

```text
# Rate Limiting — Fixed Window Counter
rl:create:{ip}                      → INCR + EXPIRE 86400s (5개/IP/24시간)
rl:hook:{endpointId}:{ip}           → INCR + EXPIRE 60s  (100건/EP/IP/분)

# SSE 연결 관리
stream_token:{token}                → SET + EXPIRE 30s (SSE 연결용 일회용 토큰)
sse:connections:{ip}                → SET (동시 SSE 수 추적, 최대 5) (예정)

# IP당 활성 엔드포인트 수 (빠른 조회용 캐시)
endpoint:count:{ip}                 → INCR/DECR + TTL 없음 (MongoDB와 동기화)
```

### 2.4. 데이터 보존 및 생명주기 정책 (Data Lifecycle)

FlashHook은 무한히 증가할 수 있는 웹훅 데이터로 인한 스토리지 비용 폭증을 막고, 휘발성 테스트 목적에 맞게 단기 데이터 보존 원칙을 따릅니다.

1. **보존 기간 (TTL) 및 자동 폐기**: 모든 엔드포인트와 해당 엔드포인트로 수신된 로그는 **생성 시점으로부터 24시간 후 자동 폐기**됩니다. (MongoDB TTL Index, Redis 자동 EXPIRE 연동)
2. **앱 레벨 스토리지 캡 (Storage Cap)**: 단일 엔드포인트가 비정상적으로 많은 웹훅을 수신하여 몽고DB 스토리지를 독점하는 것을 방지하기 위해 캡(Cap)을 적용합니다.
   - 개수 제한: 엔드포인트당 최대 500건 유지 (초과 시 순환 덮어쓰기)
   - 용량 제한: 누적 로그 크기 최대 5MB 유지

**[데이터 흐름도]**
```text
[생성] → endpoints + Redis 카운터
  ↓
[수신] → logs 삽입 + 앱 레벨 캡 체크 (500건/5MB)
  ↓  초과 시 → 가장 오래된 로그 삭제 (순환 덮어쓰기)
  ↓
[24시간 경과] → MongoDB TTL Index가 endpoints, logs 자동 삭제
             → Redis 키는 자체 EXPIRE로 소멸
```

#### 앱 레벨 캡 적용 로직 (의사코드)
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

---

## Part 3. 백엔드 아키텍처

> Java Spring Boot / 3-Layer + ApplicationEvent

### 3.1. 아키텍처 패턴 선택

**3-Layer + Spring ApplicationEvent** 패턴을 선택했습니다.
단순하지만 쓰기 작업과 SSE 푸시가 하나의 Service 클래스에 섞이는 문제를 해결하기 위해, 3-Layer의 단순함은 유지하면서 웹훅 수신 후 SSE로 보내는 흐름만 이벤트로 분리했습니다. CQRS는 현재 도메인 복잡도 대비 오버엔지니어링으로 판단해 제외했습니다.

**[핵심 이벤트 흐름]**
```text
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
- **@Async 필수.** 동기 시 SSE 푸시 지연이 외부 서비스의 타임아웃을 유발할 위험이 있음.

### 3.2. 패키지 구조

```text
com.flashhook
├── FlashHookApplication.java
│
├── domain/
│   ├── endpoint/
│   │   ├── controller/                // EndpointController.java (엔드포인트 CRUD)
│   │   ├── service/                   // EndpointService.java
│   │   ├── repository/                // EndpointRepository.java (MongoDB)
│   │   ├── dto/                       // EndpointCreateRequest.java 등
│   │   └── model/                     // Endpoint.java (MongoDB Document)
│   │
│   └── webhook/
│       ├── controller/
│       │   ├── WebhookReceiveController.java  // 웹훅 수신 (ANY /api/hooks/{id})
│       │   ├── WebhookLogController.java      // 로그 조회/삭제 API
│       │   └── WebhookStreamController.java   // SSE 스트림 API
│       ├── service/
│       │   ├── WebhookService.java            // 수신 처리 + 저장 + 이벤트 발행
│       │   ├── WebhookLogService.java         // 로그 조회/삭제
│       │   └── SseEmitterService.java         // SSE 관리 + @Async 이벤트 수신 → 푸시
│       ├── repository/
│       │   └── WebhookLogRepository.java      
│       ├── dto/
│       ├── model/
│       └── event/
│           └── WebhookReceivedEvent.java      // ApplicationEvent
│
└── global/
    ├── config/                        // AsyncConfig, MongoConfig, RedisConfig, SseConfig 등
    ├── infrastructure/redis/          // Redis Pub/Sub 브릿지 (스케일아웃 대비용)
    ├── security/                      // AccessTokenFilter, AccessTokenUtil
    ├── ratelimit/                     // RateLimitFilter, RateLimitService
    ├── exception/                     // GlobalExceptionHandler, ErrorCode
    └── util/                          // IpExtractor
```

### 3.3. 핵심 코드 설계 세부

- **비동기 이벤트 처리**: `AsyncConfig`에서 `ThreadPoolTaskExecutor`를 설정하여 비동기 작업을 처리.
- **웹훅 수신 및 이벤트 발행**: `WebhookService.receive()`에서 페이로드를 파싱 및 MongoDB에 저장한 후 `WebhookReceivedEvent` 이벤트를 비동기로 발행.
- **SSE 이벤트 푸시**: `SseEmitterService`에서 `@Async @EventListener`를 통해 이벤트를 수신한 뒤 클라이언트에게 스트리밍.
- **스케일아웃 (ECS) 대비**: MVP는 단일 인스턴스지만, 스케일업 시 `RedisMessagePublisher`와 `RedisMessageSubscriber`를 통해 이벤트를 Redis Pub/Sub 채널을 거쳐 각 인스턴스에 중계하도록 설계. (현재 코드 레벨 뼈대 준비됨)
- **페이징 전략**: 로그 조회 시 빠른 처리를 위해 커서 기반 페이징(Cursor Pagination) 적용 (`lastSeenId`).

### 3.4. Filter 체인

```text
HTTP 요청 인입
    ↓
[RateLimitFilter]     ← /api/endpoints (생성), /api/hooks/* (수신)
    ↓
[AccessTokenFilter]   ← /api/endpoints/{id}/** (단, GET /stream 제외)
    ↓
[DispatcherServlet → Controller → Service → Repository]
```
