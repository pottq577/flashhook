# FlashHook Context

## 1. Domain Overview & Core Entities

FlashHook is a temporary webhook catcher service. It solves a specific problem: providing developers a zero-friction, 1-second process to generate a temporary endpoint URL to receive, inspect, and debug external webhooks (like payments or third-party integrations).

**Core Entities:**

- **Endpoint (`com.flashhook.domain.endpoint.model.Endpoint`)**:
  - A generated webhook receiver URL.
  - Stored in MongoDB (`endpoints` collection).
  - Uses a TTL index to auto-expire 24 hours after creation.
- **WebhookLog (`com.flashhook.domain.webhook.model.WebhookLog`)**:
  - The payload of an incoming HTTP request (headers, body, method).
  - Stored in MongoDB (`logs` collection) with a 24-hour TTL.
- **MockConfig (`com.flashhook.domain.endpoint.model.MockConfig`)**:
  - Embedded inside `Endpoint`. Defines the mock HTTP response (status, delay, headers, body) returned to the external caller.
- **Static Preset (`presets.ts`)**:
  - Named scenarios (e.g., "카카오 — ALREADY_PROCESSED_PAYMENT") that map to a fixed `MockConfig` tuple.
  - Applying a preset issues a `PATCH /api/endpoints/{id}/mock` with `presetType: null` to clear any dynamic handlers.
- **Dynamic Preset (Phase 2 & Future)**:
  - **Type A (Response Handler)**: Requires parsing the request to echo values (e.g., Slack URL Verification). Routes to `MockResponseScheduler` via `presetType`.
  - **Type B (Webhook Sender)**: Active sending of signed webhook payloads (e.g., GitHub `X-Hub-Signature-256`).

## 2. System Architecture & Data Flow

The system uses a Vite/React frontend, a Spring Boot backend, MongoDB (persistence + TTL), and Redis (caching + rate limit + Pub/Sub).

**Data Flow (Webhook to Dashboard):**
1. **Creation**: User creates an endpoint. Backend rate-limits the IP via Redis and persists the `Endpoint` in MongoDB.
2. **Subscription**: Frontend connects to SSE via `/api/endpoints/{id}/stream`.
3. **Receiving Data**: External provider sends a POST request to the webhook URL.
4. **Processing & Mocking**: Backend saves the `WebhookLog` to MongoDB. `MockResponseScheduler` reads the `MockConfig` and asynchronously returns the configured HTTP response (with optional delay).
5. **Distribution**: The webhook event is published over **Redis Pub/Sub** and broadcasted to connected SSE clients.
6. **Render**: Frontend `log.store.ts` (Zustand) catches the SSE event and animates it in the UI.

## 3. Frontend Architecture (React/Vite)

The frontend strictly enforces **Feature-Sliced Design (FSD)**.

- **`app/`**: Global setups (`QueryProvider.tsx`).
- **`pages/`**: Routable views (`landing`, `dashboard`, `not-found`).
- **`widgets/`**: Reusable complex blocks (`MockConfigPanel`, `log-viewer`).
- **`features/`**: Specific interactions.
- **`entities/`**: Core domain logic, **Zod** schemas (`endpoint.schema.ts`, `log.schema.ts`), and queries.
- **`shared/`**: UI components, API clients, and `toast.store.ts`.

**State Management:**
- **TanStack Query**: Server state (fetching, mutations). Globally handles token expiration and 500 errors.
- **Zustand**: Client/UI state. `log.store.ts` manages real-time logs (max 500) from SSE without prop-drilling.

## 4. Backend Architecture (Spring Boot 3)

The backend uses **Domain-Driven Design (DDD) / Package-by-Feature** under `com.flashhook`.

- **`domain/`**: Contains `endpoint` and `webhook` packages. Each has `controller`, `service`, `repository`, `model`.
  - **Controllers**: `EndpointController`, `WebhookReceiveController`, `WebhookStreamController`.
- **`global/`**: Cross-cutting concerns (`config`, `exception`, `ratelimit`).
- **SSE Logic (`SseEmitterService`)**: Manages active connections in a `ConcurrentHashMap`. Sends 30-second heartbeats (`ping`).
- **Mock Responses (`MockResponseScheduler`)**: Evaluates `MockConfig` to delay or customize responses to external callers.

## 5. Infrastructure & Local Development

- **Redis**: Handles fixed-window rate limiting (via Lua script) and Pub/Sub for high-availability SSE distribution across server instances.
- **MongoDB**: Relies on TTL indexes for data purging.
- **Local Testing**:
  1. `docker-compose up -d` for Redis/MongoDB.
  2. Use Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8080`) to expose the local backend to third-party services like Slack or Stripe.
- **Proxy Timeouts**: Production proxies (Nginx/AWS ALB) kill idle connections. The 30-second SSE ping prevents this.

## 6. Development Guidelines

1. **FSD Enforcement**: Modules in `entities/` MUST NOT import from `widgets/` or `pages/`.
2. **API Contracts**: All JSON payloads must be parsed/validated through Zod schemas in `entities/`.
3. **Lombok**: Use `@Getter`, `@RequiredArgsConstructor`. Avoid `@Data` on MongoDB entities to prevent serialization loops.
4. **Zero Magic**: Keep code explicit. No hidden side-effects. Verification (build/lint/test) must pass before claiming completion.
