# FlashHook 개발 가이드 (Development Guide)

이 문서는 FlashHook을 로컬에서 띄우고 테스트 환경을 만들려는 개발자와 기여자를 위한 가이드예요.

## 1. 시작하기 전에 (Prerequisites)

로컬 개발 환경에 다음 소프트웨어를 설치해 주세요.

- **Java**: JDK 21
- **Node.js**: v22.22.0 이상 (권장)
- **Database**: MongoDB (로컬 또는 클라우드)
- **Cache / Rate Limiter**: Redis
- **Containerization**: Docker 및 Docker Compose (선택 사항, 로컬 DB 구동용)

## 2. 환경 변수 설정하기

### 2.1. Backend (`FH_backend`)

`FH_backend/src/main/resources/application.yml` 파일은 로컬용 기본 설정 파일이에요.
MongoDB와 Redis 설정이 맞는지 확인해 주세요. 기본적으로 로컬호스트(`localhost`)를 바라보게 설정했어요.

### 2.2. Frontend (`FH_frontend`)

`FH_frontend` 폴더에 `.env.development` 파일을 만들고 아래처럼 백엔드 API URL을 지정해 주세요.

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## 3. 로컬 서버 실행하기

명령어는 프로젝트 최상위 폴더에서 실행해요.

### 3.1. 인프라 실행하기 (MongoDB & Redis)

Docker Compose를 쓰면 로컬 인프라를 쉽게 띄울 수 있어요.

```bash
docker-compose up -d
```

### 3.2. 백엔드 서버 띄우기

Spring Boot 기반 서버를 실행해요.

```bash
cd FH_backend
./gradlew bootRun
```

서버가 뜨면 `http://localhost:9090/actuator/health` 에서 `{"status":"UP"}` 응답을 볼 수 있어요.

### 3.3. 프론트엔드 서버 띄우기

Vite 기반 개발 서버를 실행해요.

```bash
cd FH_frontend
npm install
npm run dev
```

서버가 뜨면 브라우저에서 `http://localhost:5173` 에 접속해 FlashHook 대시보드 화면을 볼 수 있어요.

## 4. 로컬 테스트 및 QA하기

FlashHook에는 백엔드/프론트엔드 연동과 SSE 실시간 응답을 묶어서 검사하는 E2E 자동화 QA 스크립트가 들어있어요.

### 4.1. Playwright 환경 준비하기

E2E 테스트 스크립트를 돌리려면 최상위 폴더에 필수 패키지(`playwright`, `mongodb`)를 설치해야 해요.

```bash
# 프로젝트 루트 디렉토리에서 실행
npm install mongodb playwright
npx playwright install chromium
```

### 4.2. 전체 QA 스크립트 실행하기

백엔드, 프론트엔드, MongoDB, Redis 서버를 모두 띄운 상태에서 다음 스크립트를 실행하면 전체 테스트 케이스를 순서대로 돌려요.

```bash
# 루트 디렉토리에서 실행
node docs/qa/qa-runner-full.mjs
```

실행이 끝나면 다음 두 문서를 자동으로 만들거나 업데이트해요.

- `docs/qa/qa-report-full.md` (전체 성공률 및 요약 리포트)
- `docs/qa/bugs.md` (실패한 테스트 케이스 목록)

## 5. Cloudflare Tunnel로 외부 연동하기 (Zero Trust)

FlashHook은 안전을 위해 서버 포트를 열지 않고 Cloudflare Tunnel을 써요. GitHub이나 Stripe 같은 외부 서비스에서 웹훅을 받으려면 이 터널을 꼭 거쳐야 해요.

### 5.1. 로컬 개발 환경에서 터널 뚫기 (Quick Tunnel)

외부 웹훅을 로컬 백엔드로 바로 쏴보고 싶을 때 써요.

```bash
# 1. cloudflared 설치 (macOS)
brew install cloudflare/cloudflare/cloudflared

# 2. 터널 실행 (백엔드가 8080 포트에 떠있어야 함)
cloudflared tunnel --url http://localhost:8080
```

명령어를 치면 화면에 `https://*.trycloudflare.com` 형태의 임시 URL이 나와요. 이 주소를 타사 서비스의 웹훅 목적지로 등록해서 테스트할 수 있어요.

### 5.2. 프로덕션(운영) 환경에 배포하기

운영 서버는 `docker-compose.prod.yml` 파일로 `cloudflared` 데몬 컨테이너를 함께 배포해요.
서버의 80/443 포트를 전혀 열지 않아서 아주 안전해요.

1. Cloudflare Zero Trust 대시보드에서 Tunnel을 만들어요.
2. 발급받은 `--token` 값을 GitHub Repository Secrets에 `TUNNEL_TOKEN`으로 등록해요.
3. GitHub Actions로 배포하면 `.env` 파일에 토큰이 들어가고 알아서 터널을 연결해요.

## 6. 프로덕션 배포할 때 꼭 확인하기 (Checklist)

운영 환경에 배포하고 나면, 서비스가 멈추는 걸 막기 위해 아래 두 가지를 **꼭 직접 확인하고 설정**해야 해요.

### 6.1. MongoDB TTL 인덱스 직접 만들기

운영 환경(`application-prod.yml`)에서는 성능을 위해 인덱스 자동 생성을 껐어요. 데이터베이스 용량이 꽉 차서 죽는 걸 막으려면, MongoDB 터미널에서 다음 명령어를 쳐서 24시간 뒤에 지워지는(TTL) 인덱스를 한 번 만들어야 해요.

```javascript
use flashhook;
db.endpoints.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });
db.logs.createIndex({ "receivedAt": 1 }, { expireAfterSeconds: 86400 });
```

### 6.2. Cloudflare WAF (Bot 방어) 예외 처리하기

GitHub이나 Stripe처럼 타사에서 웹훅을 보내는 서버는 사람이 아니라 '봇(Bot)'이에요. Cloudflare 봇 방어 모드가 이 요청을 공격으로 착각해서 차단(403)하지 않게 WAF 예외 처리를 꼭 해줘야 해요.

- Cloudflare 대시보드에서 **Security** -> **WAF** -> **Custom rules** 로 이동해요.
- **Field:** `URI Path`, **Operator:** `starts with`, **Value:** `/api/hooks/` 로 설정해요.
- **Action:** `Skip` 을 누르고 밑에 나오는 Bot Fight Mode, Security Level 등을 전부 체크해요.

## 7. 개발 컨벤션 및 유의사항 (Action Items)

Spring Boot 4.0.x 및 최신 라이브러리 환경에 맞추어 다음 컨벤션을 준수해 주세요.

### 7.1. Nullability 어노테이션
- 신규 필터 및 컴포넌트 작성 시, Nullable/NonNull 정책 적용에는 반드시 `org.jspecify.annotations` 패키지를 사용하십시오. (Spring Framework 7 생태계 권장 JSpecify 표준)

### 7.2. 불변 객체(Immutability)와 엔티티 설계
- **값 객체(VO):** `final` 필드와 명시적 `@JsonCreator` 커스텀 생성자를 활용하여 불변성과 기본값을 보장하세요. (파라미터 누락/null 유입 방지)
- **Document 엔티티(`@Document`):** Spring Data MongoDB의 리플렉션 호환성을 고려하여 `final` 키워드 사용을 피하거나 제한적으로 사용하십시오.

### 7.3. Jackson 3 API 사용
- JSON 파싱 및 역직렬화 시 `asText()` 메서드는 타입 캐스팅 모호함으로 인해 deprecated 되었습니다. 대신 `asString()`을 사용하십시오.
