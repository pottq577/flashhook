# FlashHook 개발 가이드 (Development Guide)

이 문서는 FlashHook 프로젝트를 로컬에서 구동하고 테스트 환경을 구축하려는 개발자 및 오픈소스 기여자를 위한 가이드입니다.

## 1. 사전 요구사항 (Prerequisites)

로컬 개발 환경에 다음 소프트웨어가 설치되어 있어야 합니다.

- **Java**: JDK 21
- **Node.js**: v22.22.0 이상 (권장)
- **Database**: MongoDB (로컬 또는 클라우드)
- **Cache / Rate Limiter**: Redis
- **Containerization**: Docker 및 Docker Compose (선택 사항, 로컬 DB 구동용)

## 2. 환경 변수 설정 (Environment Setup)

### 2.1. Backend (`FH_backend`)

`FH_backend/src/main/resources/application.yml` 파일은 로컬용 기본 설정 파일입니다.
MongoDB와 Redis 설정이 올바른지 확인합니다. 기본적으로 로컬호스트(`localhost`)를 바라보게 설정되어 있습니다.

### 2.2. Frontend (`FH_frontend`)

`FH_frontend` 폴더에 `.env.development` 파일을 생성하거나 복사하여 다음과 같이 백엔드 API URL을 지정합니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## 3. 로컬 서버 실행 (Local Running)

프로젝트 루트 디렉토리 기준 명령어입니다.

### 3.1. 인프라스트럭처 구동 (MongoDB & Redis)

Docker Compose를 이용하면 간편하게 로컬 인프라를 띄울 수 있습니다.

```bash
docker-compose up -d
```

### 3.2. Backend 서버 구동

Spring Boot 기반 서버를 실행합니다.

```bash
cd FH_backend
./gradlew bootRun
```

정상적으로 구동되면 `http://localhost:8080/api/actuator/health` 에서 `{"status":"UP"}` 응답을 확인할 수 있습니다.

### 3.3. Frontend 서버 구동

Vite 기반 개발 서버를 실행합니다.

```bash
cd FH_frontend
npm install
npm run dev
```

서버가 구동되면 `http://localhost:5173` 에 접속하여 FlashHook 대시보드 화면을 볼 수 있습니다.

## 4. 로컬 테스트 및 QA (Testing)

FlashHook 프로젝트에는 백엔드/프론트엔드 연동과 SSE 실시간 응답을 아우르는 E2E 자동화 QA 스크립트가 포함되어 있습니다.

### 4.1. Playwright 환경 준비

E2E 테스트 스크립트 실행을 위해 루트 디렉토리에 필수 의존성(`playwright`, `mongodb`)을 설치해야 합니다.

```bash
# 프로젝트 루트 디렉토리에서 실행
npm install mongodb playwright
npx playwright install chromium
```

### 4.2. 전체 QA 스크립트 실행

서버(Backend, Frontend, MongoDB, Redis)가 모두 실행 중인 상태에서 다음 스크립트를 실행하면 `Total TC`가 순차적으로 실행됩니다.

```bash
# 루트 디렉토리에서 실행
node docs/qa/qa-runner-full.mjs
```

실행이 완료되면 다음 두 문서가 자동으로 갱신/생성됩니다.
- `docs/qa/qa-report-full.md` (전체 성공률 및 요약 리포트)
- `docs/qa/bugs.md` (실패한 테스트 케이스 목록)

## 5. Cloudflare Tunnel을 활용한 연동 (Zero Trust)

FlashHook은 인바운드 보안을 위해 호스트 포트를 개방하지 않고 Cloudflare Tunnel을 사용합니다. 외부 서비스(GitHub, Stripe 등)의 웹훅을 수신하려면 이 터널을 거쳐야 합니다.

### 5.1. 로컬 개발 환경에서의 터널링 (Quick Tunnel)

로컬 백엔드로 바로 웹훅을 쏘아보고 싶을 때 사용합니다.

```bash
# 1. cloudflared 설치 (macOS)
brew install cloudflare/cloudflare/cloudflared

# 2. 터널 실행 (백엔드가 8080 포트에 떠있어야 함)
cloudflared tunnel --url http://localhost:8080
```

실행 시 화면에 출력되는 `https://*.trycloudflare.com` 임시 URL을 타사 서비스의 웹훅 목적지로 등록해 테스트할 수 있습니다.

### 5.2. 프로덕션(Production) 운영 환경 배포

운영 서버는 `docker-compose.prod.yml` 파일 내에 `cloudflared` 데몬이 컨테이너로 함께 배포됩니다.
서버의 80/443 포트를 전혀 열지 않으므로 매우 안전합니다.

1. Cloudflare Zero Trust 대시보드에서 Tunnel을 생성합니다.
2. 발급받은 `--token` 값을 GitHub Repository Secrets에 `TUNNEL_TOKEN`으로 등록합니다.
3. GitHub Actions가 배포될 때 `.env` 파일에 토큰이 주입되며 자동으로 터널이 연결됩니다.

## 6. 프로덕션 배포 시 필수 점검 사항 (Checklist)

운영망에 배포를 완료한 직후, 서비스 장애를 막기 위해 다음 두 가지를 **반드시 수동으로 진행**해야 합니다.

### 6.1. MongoDB TTL 인덱스 수동 생성
운영 환경(`application-prod.yml`)에서는 인덱스 자동 생성이 꺼져 있습니다. 따라서 데이터베이스가 꽉 차서 다운되는 것을 막기 위해, MongoDB 터미널에서 다음 명령어로 24시간 만료(TTL) 인덱스를 한 번 만들어 줍니다.

```javascript
use flashhook;
db.endpoints.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });
db.logs.createIndex({ "receivedAt": 1 }, { expireAfterSeconds: 86400 });
```

### 6.2. Cloudflare WAF (Bot 방어) 예외 처리
타사 웹훅 발송 서버(GitHub, Stripe 등)는 사람의 브라우저가 아닌 '자동화된 봇(Bot)'입니다. Cloudflare의 봇 방어 모드가 이들을 공격으로 간주하여 차단(403)하지 않도록 WAF 예외 처리가 필수입니다.

- Cloudflare 대시보드 -> **Security** -> **WAF** -> **Custom rules** 이동
- **Field:** `URI Path`, **Operator:** `starts with`, **Value:** `/api/endpoints/`
- **Action:** `Skip` (이후 나오는 Bot Fight Mode, Security Level 등 모두 체크)

