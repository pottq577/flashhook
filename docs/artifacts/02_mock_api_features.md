# 5. Mock API 기능 및 템플릿

사용자가 외부 서비스로 반환되는 응답값을 자유롭게 커스터마이징할 수 있는 **Mock API** 기능입니다. 결제 모듈, 소셜 로그인 등 외부 연동 시 특정 응답에 따른 타임아웃, 예외 처리 등을 손쉽게 테스트할 수 있습니다.

## 5.1. 세부 설정 스펙 및 DB 모델

사용자가 직접 설정할 수 있는 항목:

- **Status Code**: 응답 상태 코드 (기본 200)
- **Response Delay**: 응답 지연 시간 (최대 10,000ms 제한)
- **Response Headers & Body**: 커스텀 헤더 및 반환 본문

**[DB/API 설계]**

- `Endpoint` 도큐먼트 내부에 `mockConfig` 서브 도큐먼트를 내장(Embed).
- 부분 수정 API (`PATCH /api/endpoints/{endpointId}/mock`)를 제공.
- 웹훅 수신 컨트롤러는 `delayMs`가 존재하면 비동기(DeferredResult)로 대기 후 설정된 헤더/바디와 함께 응답을 반환.

## 5.2. Mock API & Webhook 프리셋

"Webhook Catcher" 기능과 "Mock API" 기능이 개발자들에게 실질적인 테스트 가치를 제공할 수 있도록, 6개 주요 서비스(카카오, 토스페이먼츠, 포트원V2, 솔라피, 깃허브, 슬랙)의 **공식 문서를 기반으로 한 기술적 제약사항**과 **개발자 테스트 시나리오**를 종합하여 구성한 프리셋 목록입니다.

### 1. 카카오 (Kakao)

#### [REST API] OAuth 토큰 발급 및 사용자 정보 조회

- **프리셋 시나리오**: 로그인 성공, `invalid_client`, `invalid_grant`, `misconfigured`, 토큰 만료, 응답 지연(3/5초)
- **개발자가 테스트하는 것**: OAuth 예외 처리, 재로그인 로직, 서버 장애 시 Timeout 및 Fallback 처리
- **공식 기술 제약 (검증)**:
  - `invalid_client`: client_id/secret 누락, 잘못된 앱 키 타입(REST API 키 대신 JS 키 사용 등) 시 발생.
  - `invalid_grant`: 인가 코드 또는 리프레시 토큰 만료/재사용 시, 혹은 redirect_uri가 불일치할 때 발생.
  - `misconfigured` (KOE009): 카카오 로그인 비활성화 등 플랫폼 설정 오류.

#### [Webhook] 계정 연결 해제 및 상태 변경

- **프리셋 시나리오**: 앱 연결 해제 알림, 카카오톡 채널 추가/차단 알림
- **개발자가 테스트하는 것**: 사용자 탈퇴에 따른 데이터 동기화 로직, 타임아웃 예외 처리
- **공식 기술 제약 (검증)**: 카카오 웹훅 서버는 **3초 이내에 HTTP 200 OK 응답**을 받아야 합니다. FlashHook의 `응답 지연(Delay)` 프리셋을 통해 타임아웃 엣지 케이스를 안전하게 테스트할 수 있습니다.

#### **카카오디벨로퍼스 공식 문서 원본 링크**

[카카오디벨로퍼스 공식 문서](https://developers.kakao.com)

### 2. 토스페이먼츠 (Toss Payments)

#### [REST API] 결제 승인 및 취소

- **프리셋 시나리오**: 승인 성공/실패, 결제 취소/부분 취소, 이미 취소된 결제, 잔액 부족
- **개발자가 테스트하는 것**: 결제 예외 처리, 결제 실패 시 주문 롤백 처리, 재시도 정책
- **공식 기술 제약 (검증)**:
  - 승인 API: `ALREADY_PROCESSED_PAYMENT` (중복 승인), `PROVIDER_ERROR` (일시적 뱅킹망 장애), `INVALID_REJECT_CARD` (카드사 거절) 등의 400 에러를 명확하게 핸들링해야 합니다.
  - 취소 API: `ALREADY_CANCELED_PAYMENT` (이미 취소됨) 처리 및 멱등성 보장이 필수적입니다.

#### [Webhook] 결제 상태 알림

- **프리셋 시나리오**: 가상계좌 입금 통보, 서비스 상태(Status Page) 변경 알림
- **개발자가 테스트하는 것**: 비동기 입금 확인, 중복 이벤트 방어 로직
- **공식 기술 제약 (검증)**: 가맹점 서버가 **HTTP 2xx를 응답하지 않으면 최대 7회까지 재전송**합니다. Mock API에서 고의로 500 에러를 반환하여 멱등성(Idempotency) 로직과 중복 방어 처리를 테스트하는 데 최적화되어 있습니다.

#### **토스페이먼츠 개발자 센터 공식 문서 원본 링크**

[토스페이먼츠 개발자센터](https://docs.tosspayments.com)

### 3. 포트원 V2 (PortOne)

#### [REST API] 결제 단건 조회 API

- **프리셋 시나리오**: 조회 성공(2000), 존재하지 않는 결제, 미승인 상태(PENDING-1000), 카드사 거절(6000번대)
- **개발자가 테스트하는 것**: 결제 검증 로직, 클라이언트 위변조 방어
- **공식 기술 제약 (검증)**:
  - 포트원 V2는 1000~8000번대의 세분화된 에러 코드를 제공합니다. (예: 4000번대 결제 유효성 오류, 5000번대 PG사 시스템 오류).
  - 지연 응답에 대비하여 클라이언트 단의 Read Timeout 60초 설정을 권장합니다.
  - 요청 중복 방지를 위해 `Idempotency-Key` 헤더를 검증하며, 중복 검출 시 409 (`IDEMPOTENCY_OUTSTANDING_REQUEST`)를 반환합니다.

#### [Webhook] 결제 웹훅

- **프리셋 시나리오**: 결제 승인 완료, 가상계좌 입금 완료, 결제 취소
- **개발자가 테스트하는 것**: 위변조 방지(시그니처 검증) 및 상태 머신 검증
- **공식 기술 제약 (검증)**: Standard Webhooks 스펙을 따르는 **웹훅 시그니처 검증**이 필수입니다. 잘못된 시그니처를 전송하는 프리셋을 통해 서버의 위변조 방지 로직을 테스트할 수 있으며, 실패 시 총 5회 재전송을 시도합니다.

#### **포트원 V2 공식 문서 원본 링크**

[포트원 V2 공식 문서](https://developers.portone.io)

### 4. 솔라피 (Solapi)

#### [REST API] 문자 발송 API & [Webhook] 발송 결과 알림

- **프리셋 시나리오**: 발송 성공(2000), 잔액 부족(1030), 발신번호 미등록(3059), 대량 발송(GROUP-REPORT)
- **개발자가 테스트하는 것**: 알림 시스템 및 SMS 상태 동기화
- **공식 기술 제약 (검증)**:
  - **REST API**: 1xxx(입력 파라미터 오류), 3xxx(통신사 에러) 등 명확한 에러 코드가 존재합니다. 번호는 하이픈 없는 숫자 포맷이어야 합니다.
  - **Webhook**: 수신 서버는 **5초 이내 HTTP 200 반환**이 필수입니다. 발송 실패(3xxx) 리포트를 수신해 다른 자동화 파이프라인(Make, n8n 등)으로 연계하는 로직을 테스트하기 좋습니다.

#### **SOLAPI 개발자 공식 문서 원본 링크**

[SOLAPI 개발자 문서](https://docs.solapi.com)

### 5. 깃허브 (GitHub)

#### [Webhook] Event Notifications

- **프리셋 시나리오**: Push Event, Pull Request Opened/Merged, Release Published
- **개발자가 테스트하는 것**: CI/CD 파이프라인 트리거, GitOps 이벤트 처리
- **공식 기술 제약 (검증)**:
  - 수신 서버는 **10초 이내에 2XX 응답을 반환**해야 합니다.
  - GitHub는 실패한 웹훅에 대해 **자동 재전송(Retry)을 지원하지 않으며 완전히 드롭**합니다. (동일 이벤트 재현을 위해서는 수동 재전송 또는 API 호출이 필요함)
  - `X-Hub-Signature-256` 헤더를 통해 무결성을 검증합니다. Mock API 프리셋으로 이런 페이로드를 반복 재현하면 로컬 개발 생산성을 크게 높일 수 있습니다.

#### **GitHub Webhooks 공식 문서 원본 링크**

[GitHub Webhooks 문서](https://docs.github.com/en/webhooks)

### 6. 슬랙 (Slack)

#### [Webhook / Events API] URL Verification & App Events

- **프리셋 시나리오**: 검증 성공(Handshake), `app_mention`, `message`, `retry` 이벤트
- **개발자가 테스트하는 것**: 최초 Slack App 연동 검증, 봇 이벤트 라우팅, 재전송 방어
- **공식 기술 제약 (검증)**:
  - **URL Verification**: 앱 최초 연동 시 전달되는 JSON의 `challenge` 파라미터 값을 그대로 텍스트 혹은 JSON 본문으로 반환해야만 검증을 통과합니다.
  - **Events API Retry**: 서버가 **3초 이내에 응답하지 않으면, 1분 단위의 지수 백오프 알고리즘으로 최대 3회 자동 재전송**합니다.
  - 중복 처리를 방지하기 위해 헤더의 `X-Slack-Retry-Num`을 확인해야 하며, 재시도를 중단하고 싶다면 응답에 `X-Slack-No-Retry: 1` 헤더를 포함시키는 로직 등을 정교하게 테스트할 수 있습니다.

#### **Slack Events API 공식 문서 원본 링크**

[Slack Events API 문서](https://api.slack.com/events-api)
