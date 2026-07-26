# Architecture Refactoring Plan

## Global Constraints
- Target workspace: `/home/hyun2y00/01_Portfolio/02_FlashHook/.worktrees/refactor-arch`
- Work strictly inside the `FH_backend` directory.
- Ensure 2-Layered exception handling (ADR-0004) is preserved.
- Code style must match existing conventions (Lombok, strict MVC, etc.).
- Never bypass `Husky` or commit hooks.
- All refactoring must result in passing tests (`./gradlew test`).

## Task 1: SseEmitterService Persistence Leak
Extract the DB update logic from SseEmitterService.
1. Create `SseDeliveryFailedEvent` in `com.flashhook.domain.webhook.event` with `logId` and `errorMessage` fields.
2. Modify `SseEmitterService.java` to remove `MongoTemplate` injection. When SSE fails, publish `SseDeliveryFailedEvent`.
3. Create an event listener in `WebhookLogService.java` (or equivalent) to handle `SseDeliveryFailedEvent` and update `sseDeliveryStatus` to "FAILED" and `sseError` using the repository or `MongoTemplate`.
4. Ensure tests pass.

## Task 2: MockResponseScheduler Header Parsing Leak
Extract HTTP header sanitization logic.
1. Create `HttpHeaderSanitizer` in `com.flashhook.domain.webhook.util`.
2. Move the ALLOWED_HEADERS, header sanitization, charset extraction, and content-type fallback logic from `MockResponseScheduler.schedule()` into `HttpHeaderSanitizer.sanitize(Map<String, String> rawHeaders)`.
3. Refactor `MockResponseScheduler` to inject and use `HttpHeaderSanitizer` to prepare the headers.
4. Ensure tests pass.

## Task 3: WebhookService Responsibility Overload
Extract log cap enforcement and payload processing.
1. Create `WebhookPayloadProcessor` in `com.flashhook.domain.webhook.util` to handle JSON parsing (Object mapping) and `bodyPreview` creation logic.
2. Create `LogCapEnforcer` in `com.flashhook.domain.webhook.service` (or util) and move the `enforceLogCap` logic and `mongoTemplate` dependency out of `WebhookService` into `LogCapEnforcer`.
3. Refactor `WebhookService.receive()` to delegate payload parsing to `WebhookPayloadProcessor` and capacity management to `LogCapEnforcer`.
4. Ensure tests pass.
