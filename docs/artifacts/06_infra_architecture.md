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
