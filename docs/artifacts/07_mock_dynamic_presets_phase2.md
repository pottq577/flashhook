# 7. Mock API 동적 프리셋 Phase 2 구현 계획 및 설계

본 문서는 `02_mock_api_features.md`에 기술된 프리셋 중, 현재 백엔드 코드에 구현되지 않은 **동적 응답 및 웹훅 시그니처 자동 생성 프리셋(Phase 2)**에 대한 구현 계획과 아키텍처 설계를 다룹니다.

현재 `MockResponseScheduler.java`에는 `Slack URL Verification` 기능만 하드코딩 형태로 구현되어 있습니다. 향후 PortOne, GitHub 등의 동적 프리셋을 확장 지원하기 위한 리팩토링 및 설계 가이드라인입니다.

---

## 7.1. 미구현 동적 프리셋 항목 및 요구사항

### 1. 포트원 V2 (PortOne) 시그니처 동적 갱신

- **문제점**: 포트원 웹훅을 시뮬레이션하거나 개발자 서버로 Replay(재전송)할 때, 페이로드에 포함된 시그니처(`webhook-signature`)는 타임스탬프를 기반으로 합니다. 저장된 과거 로그를 그대로 Replay하면 타임스탬프 만료로 인해 개발자 서버에서 검증 실패(401/403)가 발생합니다.
- **요구사항**:
  - 웹훅 발송 직전에 현재 Unix Time으로 `webhook-timestamp`를 갱신
  - 새로운 UUID로 `webhook-id` 생성
  - `"{webhook-id}.{webhook-timestamp}.{body}"` 문자열을 개발자가 설정한 시크릿 키로 **HMAC-SHA256 서명**
  - 계산된 HMAC-SHA256 다이제스트는 base64로 인코딩하고, 앞에 "v1," 접두사를 붙여 `webhook-signature` 헤더에 삽입한다.
  - `secretKey`는 "whsec_" 접두사가 포함된 포트원 발급 원본 형식을 그대로 입력받으며, 서명 계산 시점에 접두사를 제거하고 나머지 문자열을 base64 디코딩한 바이트를 HMAC 키로 사용한다.

### 2. 깃허브 (GitHub) 시그니처 동적 갱신

- **문제점**: GitHub 웹훅 역시 페이로드 위변조 방지를 위해 `X-Hub-Signature-256` 헤더를 검증하므로, Replay 시 Body 내용이 약간이라도 변경되거나 시크릿 키 검증이 필요할 때 동적 해싱이 필요합니다.
- **요구사항**:
  - 발송될 Raw Body를 개발자가 설정한 시크릿 키로 **HMAC-SHA256 서명**
  - 헤더명은 `X-Hub-Signature-256`이며, HMAC-SHA256 다이제스트는 hex로 인코딩한다. `sha256={hash}` 형태로 계산하여 헤더에 주입 후 발송

---

## 7.2. 아키텍처 설계: 전략 패턴(Strategy Pattern) 도입

현재의 `if ("SLACK_URL_VERIFICATION".equals(presetType))` 구조는 확장성이 떨어집니다. 이를 `DynamicPresetHandler` 인터페이스를 통한 전략 패턴(Strategy Pattern)으로 리팩토링해야 합니다.

### 인터페이스 설계 (예시)

```java
// 수신 파이프라인 — Mock 응답을 동적으로 생성
public interface ResponsePresetHandler {
    String getPresetType();
    DeferredResult<ResponseEntity<?>> handleResponse(String rawBody, MockConfig mockConfig);
}

// 발송 파이프라인 — Replay/Generator 발송 시 헤더·바디를 동적으로 변환
public interface RequestSigningPresetHandler {
    String getPresetType();
    WebhookPayload handleRequestGeneration(WebhookPayload payload, Map<String, Object> presetOptions);
}
```

### 컴포넌트 모듈 구성

1. **`SlackPresetHandler`**: `ResponsePresetHandler`를 구현하여 기존 URL Verification 챌린지 에코(Echo) 기능을 담당합니다.
2. **`PortOnePresetHandler`**: `RequestSigningPresetHandler`를 구현하여 Replay API 파이프라인 실행 시 타임스탬프 갱신 및 HMAC 서명을 수행합니다.
3. **`GitHubPresetHandler`**: `RequestSigningPresetHandler`를 구현하여 Body 해싱 및 `X-Hub-Signature-256` 헤더 주입을 수행합니다.

---

## 7.3. 사용자 설정 (MockConfig) 스키마 확장

웹훅 시그니처를 서버 측에서 동적으로 계산하려면, 개발자가 발급받은 '시크릿 키'를 FlashHook이 알고 있어야 합니다.

**DB 스키마 추가 (JSON 옵션 필드)**

```json
{
  "presetType": "PORTONE_V2",
  "presetOptions": {
    "secretKey": "test_secret_key_12345"
  }
}
```

> **보안 고려사항 (Security Consideration)**:
> `secretKey`는 절대로 DB에 평문으로 저장되어서는 안 됩니다.
> 엔드포인트 생성/수정 시 서비스 계층에서 **AES-256 등 양방향 암호화**를 적용하여 DB에 저장하고, Replay/Mock 발송 시점에 메모리에서 복호화하여 사용하는 설계가 필수적입니다.

---

## 7.4. 단계별 구현 마일스톤 (Phase 2)

- **Step 1: 아키텍처 리팩토링**
  - `DynamicPresetHandler` 인터페이스 정의 및 스프링 빈 자동 주입(`List<DynamicPresetHandler>`)
  - `MockResponseScheduler`의 Slack 하드코딩 로직을 분리하여 `SlackPresetHandler`로 마이그레이션
- **Step 2: 스키마 확장 및 암복호화 모듈 적용**
  - `MockConfig` 엔티티에 `presetOptions` 컬럼(JSON) 추가
  - 암복호화 유틸리티 구현 및 서비스 로직 적용
- **Step 3: 시그니처 생성 프리셋 기능 구현**
  - `PortOnePresetHandler`, `GitHubPresetHandler` 모듈 구현
  - `WebhookLogService.replayLog()` 로직 내에 `handleRequestGeneration` 훅(Hook) 연동
