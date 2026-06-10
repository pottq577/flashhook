# FlashHook

1초 만에 URL을 생성하여 임시로 웹훅을 수신하고 디버깅할 수 있는 개발자 유틸리티입니다. 회원가입 없이 즉시 사용 가능한 엔드포인트를 제공하며, 인입된 웹훅 데이터를 실시간으로 대시보드에 렌더링합니다.

## 핵심 기술 스택

- **Backend:** Java 21, Spring Boot 3.3, MongoDB (TTL), Redis (Rate Limit)
- **Frontend:** React 19, TypeScript, Vite, Zustand, FSD (Feature-Sliced Design) 아키텍처
- **Infra/통신:** SSE (Server-Sent Events), Docker

## 아키텍처 및 데이터 흐름

FlashHook은 무작위 웹훅 Payload를 유연하게 수용하기 위해 MongoDB를 사용하며, Redis 기반 슬라이딩 윈도우로 무분별한 요청을 방어합니다. 데이터는 브라우저와 SSE를 통해 실시간 연동되며, 24시간 후 자동 파기됩니다.

자세한 시스템 구조는 `docs/artifacts/CONTEXT.md`를 참고하세요.

## 빠른 시작 (로컬 환경)

1. 인프라 실행 (Redis, MongoDB)

```bash
docker-compose up -d
```

2. 백엔드 및 프론트엔드 서버 구동
3. Cloudflare Tunnel 등을 이용해 로컬 포트 외부 노출

```bash
cloudflared tunnel --url http://localhost:8080
```

4. 생성된 URL을 외부 서비스 웹훅 엔드포인트로 등록 후 대시보드에서 실시간 수신 확인

## 핵심 챌린지 및 해결

- **휘발성 데이터 생명주기 관리:** MongoDB TTL 인덱스로 24시간 만료 데이터 스케줄링 없이 원격 삭제.
- **비정형 JSON 데이터 수용:** 스키마-리스 NoSQL(MongoDB)을 통해 다양한 3rd Party Payload 무손실 저장.
- **실시간 비동기 이벤트 푸시:** Spring `@EventListener`와 SSE(Server-Sent Events)를 통해 브라우저 무새로고침 실시간 렌더링.
