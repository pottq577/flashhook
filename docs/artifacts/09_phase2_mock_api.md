# FlashHook — Phase 2: Mock API 기획 및 설계서

> 최종 수정: 2026-06-08

---

## 1. 개요 및 목표

Phase 1(MVP)이 웹훅의 '단순 수신 및 로깅(Webhook Catcher)' 기능에 집중했다면, Phase 2는 사용자가 외부 서비스로 반환되는 응답값을 자유롭게 커스터마이징할 수 있는 **Mock API** 기능을 제공합니다. 이를 통해 결제 모듈, 소셜 로그인 등 외부 연동 시 특정 응답에 따른 타임아웃, 예외 처리 등을 손쉽게 테스트할 수 있습니다.

---

## 2. 요구사항 정의 (UI/UX)

### 2.1. 화면 배치

- **위치**: 대시보드 화면(`DashboardPage`)의 우측 패널
- **구조**: 기존 '로그 상세 보기' 영역 상단에 탭(Tab) UI를 추가하여 `[로그 상세 | Mock 설정]`으로 화면을 전환할 수 있도록 구현합니다.

### 2.2. K-API 프리셋 기능

자주 사용되는 외부 API 환경(토스페이먼츠, 카카오 로그인, 포트원 등)을 원클릭으로 모방할 수 있는 템플릿(Preset) 기능을 제공합니다.

- **동작 방식**: Select Box에서 프리셋을 선택하면, 상태 코드와 응답 Body 입력창에 프리셋 내용이 자동 주입(Auto-fill)됩니다.
- **수정 권한**: 주입된 템플릿은 단순 가이드 역할이며, 사용자가 언제든지 내용을 자유롭게 수정 및 추가할 수 있습니다.

### 2.3. 세부 설정 필드

사용자가 직접 설정할 수 있는 항목은 다음과 같습니다.

1. **Status Code** (상태 코드): 200, 400, 401, 500 등 (기본값: 200)
2. **Response Delay** (응답 지연 시간): 외부 서비스의 Timeout 처리를 테스트하기 위한 기능. 서버 리소스 보호를 위해 **최대 10,000ms (10초)** 로 제한합니다.
3. **Response Headers** (응답 헤더): `Content-Type` 등 원하는 응답 헤더를 자유롭게 Key-Value 형태로 직접 추가할 수 있습니다. (기본값: `Content-Type: application/json`)
4. **Response Body** (응답 본문): JSON, XML, Plain Text 등 반환할 Body를 작성하는 Textarea 영역입니다.

---

## 3. 백엔드 설계

### 3.1. DB 모델 (MongoDB)

`Endpoint` 도큐먼트 내부에 `mockConfig` 서브 도큐먼트를 내장(Embed)하여 구성합니다.

```java
// MockConfig.java (Embeddable Document)
public class MockConfig {
    private int statusCode = 200;
    private long delayMs = 0;
    private Map<String, String> headers = new HashMap<>(); // 예: {"Content-Type": "application/json"}
    private String body = "ok";
}
```

### 3.2. 신규 API 명세

Mock 설정을 동적으로 업데이트하기 위한 부분 수정(PATCH) API를 추가합니다.

- **Endpoint**: `PATCH /api/endpoints/{endpointId}/mock`
- **보안**: 기존 `AccessTokenFilter`를 통해 인증된 사용자만 수정 가능
- **Request Body**:

```json
{
  "statusCode": 400,
  "delayMs": 5000,
  "headers": {
    "Content-Type": "application/json",
    "X-Custom-Header": "FlashHook"
  },
  "body": "{\"error\": \"Bad Request\"}"
}
```

### 3.3. 수신 로직(WebhookReceiveController) 변경 사항

기존에는 수신된 로그 정보를 JSON으로 무조건 200 OK와 함께 반환했으나, 이제는 해당 엔드포인트의 `mockConfig`를 기반으로 동적인 응답을 생성해야 합니다.

1. **지연(Delay) 처리**: `delayMs`가 0보다 클 경우 지정된 시간만큼 응답을 대기합니다. (Tomcat 스레드 점유 최소화를 위해 현재 `DeferredResult`와 `MockResponseScheduler`를 활용하여 비동기 지연 응답을 반환하도록 구현되어 있습니다.)
2. **헤더 주입**: `mockConfig.headers`의 모든 Key-Value를 HTTP 응답 헤더에 삽입합니다.
3. **상태 및 본문 반환**: 설정된 `statusCode`와 `body` 데이터를 담아 최종 `ResponseEntity`를 반환합니다. (로그 저장 및 SSE 푸시 흐름은 기존과 동일하게 비동기로 병행 동작합니다.)
