# Phase 2: 동적 응답 핸들러 (Dynamic Response Handler) 구현 기획

> **범위**: `presetType: SLACK_URL_VERIFICATION` 단일 케이스  
> **전제**: Phase 1 (정적 프리셋 2-Level 드롭다운) 구현 완료 후 진행  
> **참고 ADR**: `docs/adr/0002-dynamic-preset-split-into-two-types.md`

---

## 1. 배경 및 목적

Slack App을 연동할 때, Slack은 개발자의 서버 URL이 유효한지 검증하기 위해 **URL Verification**을 수행합니다. Slack이 보내는 `challenge` 값은 매 요청마다 랜덤 생성되므로, 고정된 body를 응답하는 현재 mockConfig 구조로는 처리할 수 없습니다.

이 기능을 구현하면 개발자가 FlashHook을 Slack App의 Request URL로 등록한 뒤, **별도 서버 없이 URL Verification을 통과**시키고 이후 이벤트 수신 흐름 전체를 테스트할 수 있습니다.

---

## 2. 사용 시나리오

```
1. 개발자가 대시보드 → [슬랙 → URL Verification] 프리셋 선택
2. FlashHook 엔드포인트 URL을 Slack App 설정의 Request URL에 등록
3. Slack이 POST {type: "url_verification", challenge: "3eZbrw..."} 전송
4. FlashHook이 challenge 값을 추출하여 {"challenge": "3eZbrw..."} 응답
5. Slack이 검증 통과 → 이후 app_mention, message 등 실제 이벤트 수신 가능
```

---

## 3. 구현 범위

### 3.1 Backend — MockConfig 모델 확장

**`MockConfig.java`에 `presetType` 필드 추가:**

```java
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class MockConfig {
    @Builder.Default
    private int statusCode = 200;

    @Builder.Default
    private long delayMs = 0;

    private Map<String, String> headers;

    @Builder.Default
    private String body = "ok";

    // Phase 2 추가
    private String presetType; // null이면 고정 응답, 값이 있으면 동적 핸들러로 라우팅
}
```

**허용 값 (Phase 2 기준):**

| presetType | 설명 |
|---|---|
| `null` | 기본 동작 — 고정 응답 반환 (현재 동작 유지) |
| `SLACK_URL_VERIFICATION` | 요청 body의 `challenge` 값을 echo |

### 3.2 Backend — MockUpdateRequest 확장

```java
public class MockUpdateRequest {
    private Integer statusCode;
    private Long delayMs;
    private Map<String, String> headers;
    private String body;
    private String presetType; // 추가
}
```

### 3.3 Backend — 동적 핸들러 라우팅

`WebhookReceiveController.receive()` 또는 `MockResponseScheduler.schedule()`에서 `presetType` 분기:

```java
// MockResponseScheduler.schedule() 내부
if ("SLACK_URL_VERIFICATION".equals(mockConfig.getPresetType())) {
    return handleSlackUrlVerification(rawBody);
}
// 기존 고정 응답 로직...
```

**`handleSlackUrlVerification()` 로직:**

```
1. rawBody를 JSON으로 파싱
2. "type" 필드 확인 → "url_verification"이 아니면 200 OK 빈 응답 반환
3. "challenge" 필드 추출
4. {"challenge": "<추출된 값>"} 응답 (Content-Type: application/json)
```

> **주의**: `rawBody`는 현재 `WebhookReceiveController`에서 파싱되어 `IncomingWebhookPayload`로 변환됩니다. `MockResponseScheduler`는 현재 `MockConfig`만 받으므로, rawBody를 핸들러까지 전달하는 경로가 추가로 필요합니다. `MockResponseScheduler.schedule(MockConfig, String rawBody)` 시그니처 확장을 검토해야 합니다.

### 3.4 Frontend — Preset Catalog 항목 추가

`presets.ts`에 Slack URL Verification 항목을 동적 프리셋으로 마킹:

```ts
{
  id: 'slack_url_verification',
  label: 'URL Verification (Challenge Echo)',
  desc: '⚡ 동적',
  isDynamic: true,           // UI에서 동적 프리셋임을 표시
  presetType: 'SLACK_URL_VERIFICATION',
  // status/body/delayMs는 의미 없음 — BE 핸들러가 전담
}
```

PATCH 호출 시 `presetType`만 전송하고 `body`는 비워둡니다:

```ts
mutate({
  statusCode: 200,
  delayMs: 0,
  headers: {},
  body: '',
  presetType: 'SLACK_URL_VERIFICATION',
});
```

### 3.5 Frontend — UI 표시

동적 프리셋은 시나리오 목록에서 구분 표시:

- `⚡ 동적` 배지 또는 아이콘 부착
- 선택 시 "이 프리셋은 BE가 요청을 분석해서 응답합니다. Status Code / Body 설정이 무시됩니다." 안내 문구 표시
- STATUS_CODE, BODY 편집 영역 비활성화(disabled)

---

## 4. 구현하지 않는 것 (명시적 제외)

| 케이스 | 이유 |
|---|---|
| GitHub `X-Hub-Signature-256` | Webhook Sender 기능 필요 (별도 PRD) |
| PortOne `webhook-signature` | Webhook Sender 기능 필요 (별도 PRD) |
| Slack `X-Slack-Signature` 검증 | FlashHook이 Slack 서명을 검증할 이유 없음 (보안 게이트가 아님) |

---

## 5. 완료 기준

- [ ] `presetType: SLACK_URL_VERIFICATION` 설정 시 `challenge` echo가 정상 동작한다
- [ ] `presetType: null`인 기존 엔드포인트는 동작에 변화 없다
- [ ] FE에서 동적 프리셋 선택 시 STATUS_CODE/BODY 편집 영역이 비활성화된다
- [ ] Slack App 설정에 FlashHook URL 등록 후 URL Verification이 실제로 통과된다
- [ ] 동적 프리셋(`SLACK_URL_VERIFICATION`) 적용 후, 다른 정적 프리셋으로 전환하면 `presetType`이 `null`로 초기화되고 핸들러 라우팅이 해제된다
