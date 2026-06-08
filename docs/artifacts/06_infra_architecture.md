# FlashHook — AWS 인프라 아키텍처

> MVP 및 프로덕션 스케일업 설계
> 최종 수정: 2026-06-07

---

## 1. MVP 아키텍처

```
                    ┌─────────────┐
                    │  Route 53   │
                    │ flashhook.kr│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     flashhook.kr/*          api.flashhook.kr/*
              │                         │
     ┌────────▼────────┐      ┌────────▼────────┐
     │   CloudFront    │      │    EC2 (t3.small)│
     │   + ACM (SSL)   │      │                  │
     │                 │      │  ┌──────────────┐│
     │  ┌───────────┐  │      │  │ Nginx        ││
     │  │  S3 Bucket│  │      │  │ (리버스 프록시) ││
     │  │  (React   │  │      │  │ + Let's Encrypt│
     │  │   SPA)    │  │      │  └──────┬───────┘│
     │  └───────────┘  │      │         │        │
     └─────────────────┘      │  ┌──────▼───────┐│
                              │  │ Spring Boot  ││
                              │  │ :8080        ││
                              │  └──────────────┘│
                              │                  │
                              │  ┌──────────────┐│
                              │  │ Redis        ││
                              │  │ :6379        ││
                              │  └──────────────┘│
                              └──────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  MongoDB Atlas  │
                              │  (M0 Free Tier) │
                              └─────────────────┘
```

### 1.1. 구성 요소

| 구성      | 선택                       | 이유                                                            |
| --------- | -------------------------- | --------------------------------------------------------------- |
| Compute   | EC2 t3.small (2 vCPU, 2GB) | Spring Boot + Redis 동시 운영. t3.micro(1GB)는 메모리 부족 위험 |
| FE 호스팅 | S3 + CloudFront            | React SPA 정적 배포. CDN 캐싱. ACM으로 HTTPS 무료               |
| SSL (API) | Nginx + Let's Encrypt      | ALB($16/월) 없이 HTTPS 확보. MVP 비용 절감                      |
| DB        | MongoDB Atlas M0           | 무료. 512MB 스토리지. 24시간 TTL 서비스라 충분                  |
| Cache     | Redis (EC2 내 설치)        | ElastiCache($13/월~) 대신 같은 EC2에서 운영                     |
| DNS       | Route 53                   | 도메인 관리. 서브도메인 분리                                    |

### 1.2. 도메인 구조

```
flashhook.kr          → CloudFront (React SPA)
api.flashhook.kr      → EC2 (Spring Boot API)
```

### 1.3. 월 예상 비용

```
EC2 t3.small (온디맨드):     ~$15/월
S3 + CloudFront (저트래픽):   ~$1/월
MongoDB Atlas M0:             $0
Route 53 호스팅 존:           ~$0.5/월
도메인 (.kr):                 ~₩22,000/년 ≈ $1.5/월
─────────────────────────────────
총합:                         ~$18/월 (약 ₩25,000)
```

> t3.small 예약 인스턴스(1년) 적용 시 ~$9/월로 절감 가능.

---

## 2. 프로덕션 스케일업 아키텍처

서비스 성장 시 전환하는 아키텍처.

```
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

### 2.1. 스케일업 전환 기준

| 전환 시점          | 변경 사항                                   |
| ------------------ | ------------------------------------------- |
| SSE 동시 접속 100+ | EC2 → **ECS Fargate** (오토 스케일링)       |
| Redis 메모리 부족  | EC2 내장 → **ElastiCache** (관리형)         |
| MongoDB 512MB 초과 | Atlas M0 → **M10+** (전용 클러스터)         |
| SSL 관리 부담      | Let's Encrypt → **ALB + ACM**               |
| 멀티 인스턴스 SSE  | **Redis Pub/Sub**로 SSE 이벤트 브로드캐스트 |

### 2.2. SSE 멀티 인스턴스 이슈

MVP(EC2 1대)에선 문제 없음. ECS 스케일아웃 시:

```
문제:
  웹훅 수신 → 인스턴스 A 도착
  SSE 연결 → 인스턴스 B에 있음
  → B의 사용자에게 이벤트 미도달

해결: Redis Pub/Sub
  웹훅 수신
    → MongoDB 저장
    → Redis Pub (채널: endpoint:{id})
    → 모든 인스턴스 Sub
    → 해당 SSE 연결에 푸시
```

---

## 3. 배포 파이프라인

### 3.1. MVP (GitHub Actions)

```
[GitHub Push]
    ↓
[GitHub Actions]
    ├─ FE: npm build → S3 업로드 → CloudFront 캐시 무효화
    └─ BE: Gradle build → Docker 이미지 → EC2 SSH 배포
```

### 3.2. 프로덕션 (GitHub Actions + ECR + ECS)

```
[GitHub Push]
    ↓
[GitHub Actions]
    ├─ FE: npm build → S3 업로드 → CloudFront 캐시 무효화
    └─ BE: Gradle build → Docker 이미지 → ECR Push → ECS 롤링 배포
```

---

## 4. EC2 내부 구성 (MVP)

```
EC2 t3.small
├── Nginx (:80, :443)
│   ├── Let's Encrypt SSL 인증서
│   └── 리버스 프록시 → localhost:8080
├── Spring Boot (:8080)
│   └── application.yml
│       ├── MongoDB Atlas 연결 문자열
│       └── Redis localhost:6379 연결
├── Redis (:6379)
│   └── redis.conf (maxmemory 512mb, eviction policy)
└── Docker (선택)
    └── docker-compose.yml (Spring Boot + Redis)
```

### Nginx 설정 핵심

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

> `proxy_buffering off` 필수. 안 하면 Nginx가 SSE 이벤트를 버퍼링해서 실시간 전달 안 됨.

---

## 5. 보안 설정

| 항목                 | 설정                                         |
| -------------------- | -------------------------------------------- |
| Security Group (EC2) | 인바운드: 80, 443 (0.0.0.0/0) + 22 (내 IP만) |
| Redis                | 외부 노출 ✕. localhost 바인딩만              |
| MongoDB Atlas        | EC2 IP 화이트리스트만 허용                   |
| SSH                  | Key Pair 인증. 비밀번호 로그인 비활성화      |
