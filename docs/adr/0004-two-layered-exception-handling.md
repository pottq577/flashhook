# 0004. 비동기 및 이벤트 핸들링에서의 2-Layered 예외 처리 전략

## 1. Context (배경)

FlashHook 백엔드 코드를 작성할 때, 기본 원칙 중 하나는 "최상위 `Exception`의 포괄적 캡처(Catch)를 지양하고 구체적인 예외만 명시적으로 잡는다"는 것이었습니다. 이는 예외 발생 원인을 명확히 하고, 잘못된 로직이 소리 없이 묻히는 것을 방지하기 위함입니다.
하지만 `SseEmitter`를 활용한 브로드캐스팅, `MockResponseScheduler`를 통한 비동기 예약 발송 등 이벤트 기반의 비동기 코드에서 예상치 못한 런타임 에러(NPE 등)가 발생할 경우, 자원 정리가 되지 않고 시스템 일관성이 깨지는 문제(좀비 리소스, 스레드 풀 고갈, DB 상태 불일치 등)가 발견되었습니다.

## 2. Decision (결정)

엄격한 예외 처리 원칙과 비동기 시스템의 안정성을 모두 만족하기 위해 **2-Layered Exception Handling (2계층 예외 처리)** 패턴을 도입하기로 결정했습니다.

```java
try {
    // 비동기 작업 수행 (ex. SSE 전송, 웹훅 재전송)
} catch (IOException | AsyncRequestNotUsableException e) {
    // 1st Layer: 예상되는 비즈니스/네트워크 예외 처리
    // - 클라이언트 연결 종료 등 정상적인 실패 상황 기록
    cleanupResource();
} catch (Exception e) {
    // 2nd Layer: 방어적 캡처 (Catch-all)
    // - 예상치 못한 런타임 에러로부터 스레드 생존 보장 및 상태 일관성 복구에만 사용
    log.error("Unexpected error, executing cleanup", e);
    cleanupResource(); // 자원 반환 및 상태(FAILED 등) 롤백 보장
}
```

## 3. Consequences (결과)

- **장점**:
  - 스레드와 리소스가 좀비 상태로 남는 치명적인 버그를 원천적으로 방어할 수 있습니다.
  - 예상된 예외와 예기치 못한 예외의 로그 레벨을 분리하여 디버깅이 쉬워집니다.
- **단점**:
  - `catch (Exception e)` 블록이 추가됨에 따라 코드가 다소 길어집니다.
- **주의사항**:
  - `catch (Exception e)` 블록 내부에서는 예외를 덮어쓰거나 무시해서는 안 되며, **반드시 로깅과 자원 정리(Cleanup)**에만 사용해야 합니다.
