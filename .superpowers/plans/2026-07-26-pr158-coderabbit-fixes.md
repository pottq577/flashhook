# PR 158 Coderabbit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement 12 code review comments (4 Actionable + 8 Nitpicks) from Coderabbit on PR 158.

**Architecture:** We will apply fixes directly to the `refactor/architecture-improvements` branch in the `.worktrees/refactor-arch` worktree. The fixes are grouped by component.

**Tech Stack:** Java, Spring Boot, MongoDB

## Global Constraints

- Target workspace: `/home/hyun2y00/01_Portfolio/02_FlashHook/.worktrees/refactor-arch`
- Work strictly inside the `FH_backend` directory.
- Verify each finding against current code. Fix only still-valid issues.
- All refactoring must result in passing tests (`./gradlew test`).

---

### Task 1: HttpHeaderSanitizer Fixes

**Files:**
- Modify: `FH_backend/src/main/java/com/flashhook/domain/webhook/util/HttpHeaderSanitizer.java`
- Modify: `FH_backend/src/test/java/com/flashhook/domain/webhook/util/HttpHeaderSanitizerTest.java`

- [ ] **Step 1: Apply Locale.ROOT and MediaType validation**
Modify `HttpHeaderSanitizer.java`. 
- Use `toLowerCase(Locale.ROOT)` for allowlist matching and content-type parsing.
- Validate the sanitized `content-type` value using `org.springframework.http.MediaType.parseMediaType`. If parsing fails, catch `InvalidMediaTypeException` and reset the value to `text/plain`.

- [ ] **Step 2: Add edge case tests**
Modify `HttpHeaderSanitizerTest.java`. Add tests for `sanitize(null)`, headers with null values, and unparsable content-types (e.g., `application/json; charset=`).

- [ ] **Step 3: Run tests and Commit**
Run: `./gradlew test --tests *HttpHeaderSanitizerTest*`
Commit: `fix(webhook): apply Coderabbit fixes for HttpHeaderSanitizer`

---

### Task 2: SseDeliveryFailedEvent & WebhookLogService Fixes

**Files:**
- Modify: `FH_backend/src/main/java/com/flashhook/domain/webhook/event/SseDeliveryFailedEvent.java`
- Modify: `FH_backend/src/main/java/com/flashhook/domain/webhook/service/WebhookLogService.java`
- Modify: `FH_backend/src/test/java/com/flashhook/domain/webhook/service/WebhookLogServiceTest.java`

- [ ] **Step 1: Change Event to record**
Convert `SseDeliveryFailedEvent` to a Java `record`. Update any callers (like tests and WebhookLogService) that used getters.

- [ ] **Step 2: Update WebhookLogService**
- Change `@EventListener` to `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`.
- Inspect `UpdateResult` from `mongoTemplate.updateFirst`. Emit a warning if matched count is 0.
- Broaden `catch (DataAccessException)` to `catch (Exception)`.

- [ ] **Step 3: Update Tests**
Add `DataAccessException` test and zero-match UpdateResult test to `WebhookLogServiceTest`.

- [ ] **Step 4: Run tests and Commit**
Run: `./gradlew test --tests *WebhookLogServiceTest*`
Commit: `fix(webhook): apply Coderabbit fixes for WebhookLogService and Event`

---

### Task 3: SseEmitterService Fixes

**Files:**
- Modify: `FH_backend/src/main/java/com/flashhook/domain/webhook/service/SseEmitterService.java`
- Modify: `FH_backend/src/test/java/com/flashhook/domain/webhook/service/SseEmitterServiceTest.java`

- [ ] **Step 1: Add Metric/Counter for SSE persist failure**
In `SseEmitterService` or wherever the failure is caught, do not just `log.error`. If it was supposed to be in `handleSseDeliveryFailed` or `publishEx`, ensure failure is recorded in a metric counter (e.g., via `MeterRegistry` if available, or just a simple AtomicInteger / separate logging). 

- [ ] **Step 2: Clean up Tests**
Remove the empty `@BeforeEach setUp()` method from `SseEmitterServiceTest`.

- [ ] **Step 3: Run tests and Commit**
Run: `./gradlew test --tests *SseEmitterServiceTest*`
Commit: `fix(webhook): apply Coderabbit fixes for SseEmitterService`

---

### Task 4: LogCapEnforcer Fixes

**Files:**
- Modify: `FH_backend/src/main/java/com/flashhook/domain/webhook/service/LogCapEnforcer.java`

- [ ] **Step 1: Make enforceLogCap asynchronous**
Use `@Async` for the actual deletion loop (`enforceLogCap`) so it doesn't block the request thread in `updateCountersAndEnforceCap`.

- [ ] **Step 2: Use Projection for findAllAndRemove**
Update the deletion flow so it doesn't load full `WebhookLog` bodies into memory. Apply a MongoDB query projection to fetch only `_id` and `bodySize`.

- [ ] **Step 3: Run tests and Commit**
Run: `./gradlew test --tests *LogCapEnforcerTest*` (if it exists) or full tests.
Commit: `fix(webhook): apply Coderabbit fixes for LogCapEnforcer`

---

### Task 5: WebhookPayloadProcessor Annotations

**Files:**
- Modify: `FH_backend/src/main/java/com/flashhook/domain/webhook/util/WebhookPayloadProcessor.java`

- [ ] **Step 1: Check and Update Jackson Annotations**
Check if the Jackson 3.x `tools.jackson.annotation` package is present in the project. If the project uses Jackson 2.x (`com.fasterxml.jackson.annotation`), keep it. Fix only if valid. 
Update `MockConfig` annotations inside the class if needed.

- [ ] **Step 2: Run tests and Commit**
Run: `./gradlew test --tests *WebhookPayloadProcessorTest*`
Commit: `fix(webhook): verify and update Jackson annotations`
