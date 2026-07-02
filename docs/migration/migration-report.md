# Spring Boot Migration Phase 0 Report

## 1. 현재 의존성 현황
- **Spring Boot 버전**: `3.5.15` (build.gradle)
- **주요 Spring Boot Starters**:
  - `spring-boot-starter-web`
  - `spring-boot-starter-actuator`
  - `spring-boot-starter-validation`
  - `spring-boot-starter-cache`
  - `spring-boot-starter-data-mongodb`
  - `spring-boot-starter-data-redis`
  - `spring-boot-starter-test`
- **Spring 관련 3rd-party 의존성**:
  - `archunit-junit5:1.2.1` (Spring과 직접 연관은 없으나 테스트 관련 외부 의존성)
  - 기타 Spring Cloud 등 Boot가 직접 관리하지 않는 대형 3rd-party 프레임워크는 없음.

## 2. 코드베이스 검색 결과
- **`javax.*` import 잔재**:
  - 발견됨: `javax.crypto.*`, `javax.net.ssl.*`
  - 분석: 모두 Java SE 표준 라이브러리 패키지이며, `javax.servlet` 등 Jakarta EE 전환 대상 클래스는 존재하지 않음.
- **`com.fasterxml.jackson.*` import 내역**:
  - `JsonProcessingException`
  - `ObjectMapper`
  - `JsonNode`
- **`@MockBean` / `@SpyBean` 사용처**:
  - 검색 결과 없음 (마이그레이션 불필요)
- **`WebSecurityConfigurerAdapter`**:
  - 검색 결과 없음 (이미 Spring Security 최신 방식 적용 중인 것으로 파악됨)
- **`RestTemplate` 사용처**:
  - 발견됨: `ReplayHttpClient.java` 내에서 사용 중. Spring 6.1 이상에서 `RestClient`가 권장되므로, 4.0.7 전환 시 Deprecation 여부 확인 필요.
- **Undertow starter**:
  - `build.gradle`에 존재하지 않음. (기본 Tomcat 사용)
- **JUnit 4 (`org.junit.Test`) 잔재**:
  - 검색 결과 없음. (JUnit 5 플랫폼 정상 사용 중)

## 3. 결론
- Jakarta EE 마이그레이션 이슈가 없으며, 보안/테스트 프레임워크의 레거시 잔재도 없어 버전업의 기술적 허들은 낮을 것으로 예상됨.
- Phase 1 진행 준비 완료.
