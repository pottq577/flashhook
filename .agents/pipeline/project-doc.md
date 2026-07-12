# Project Documentation

> Generated: 2026-07-12T13:55:22+09:00 | Mode: FULL

## Tech Stack

- Runtime: Node.js, Java 21
- Language: TypeScript, JavaScript, Java 21, HTML, CSS, Shell
- Framework: React 19, Vite 8 (Frontend) / Spring Boot 4.0.7 (Backend)
- Database: MongoDB, Redis
- Styling: CSS Modules (Native)
- State Management: Zustand, React Query

## Dependencies

- **Core (Frontend)**: `@tanstack/react-query`, `zod`, `zustand`, `framer-motion`, `lucide-react`, `react-router-dom`, `react-error-boundary`
- **Core (Backend)**: `spring-boot-starter-web`, `spring-boot-starter-data-mongodb`, `spring-boot-starter-data-redis`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`, `lombok`
- **Testing**: `playwright`, `com.tngtech.archunit`, `junit`
- **Dev/Infra**: `vite`, `typescript`, `eslint`, `husky`, `lint-staged`

## Architecture Pattern

Separated Frontend/Backend architecture (SPA + REST API).

- **Frontend (`FH_frontend`)**: Standard Vite-React modular structure.
- **Backend (`FH_backend`)**: Standard Spring Boot MVC/Layered architecture (Controller-Service-Repository).

## Folder Structure

- `FH_frontend/`: Frontend React application source.
- `FH_backend/`: Backend Spring Boot application source.
- `docs/`: Project documentation.
- `e2e/` & `loadtest/`: Test configuration and scripts.
- `seo-pages/`: SEO optimization related pages.

## Code Style Conventions

- **Frontend**: ESLint (`eslint.config.js`), TypeScript strict mode, Husky + lint-staged pre-commit hooks.
- **Backend**: Standard Java style with Lombok annotations to reduce boilerplate; OpenRewrite configured.

## Modularity Practices

- **Frontend**: Distinct directories for `/src`, `/api` (Service Communication), and `/e2e`.
- **Backend**: MVC layered separation (Controllers, Services, Repositories).

## Data Architecture

- **Primary Database**: MongoDB (via Spring Data MongoDB).
- **Caching/Session**: Redis (via Spring Data Redis).

## Cross-Cutting Concerns

- **Validation**: Zod (Frontend), Spring Boot Starter Validation (Backend).
- **Observability & Analytics**: Micrometer / Prometheus (Backend), Vercel Analytics / Speed Insights (Frontend).
- **Error Handling**: `react-error-boundary` (Frontend).

## Service Communication

Frontend communicates with Backend REST APIs via `@tanstack/react-query` and `fetch`/`axios` (located in `FH_frontend/api`).

## Test Coverage

- Overall coverage: Unknown
- Testing framework: Playwright (E2E), JUnit 5 & ArchUnit (Backend)
- Key untested areas: N/A
- Test patterns used: End-to-End (E2E) on frontend, Architecture boundary testing on backend.

## Entry Points

- **Frontend**: `FH_frontend/index.html` and `src/main.tsx` (or equivalent Vite entry).
- **Backend**: Spring Boot Application main class in `FH_backend/src/main/java/...`.
- **Infrastructure**: `docker-compose.yml` / `docker-compose.prod.yml`.

## Last Scanned

2026-07-12T13:55:22+09:00
