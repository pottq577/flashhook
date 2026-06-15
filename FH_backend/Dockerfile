# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
# Grant execution permissions
RUN chmod +x gradlew
# Download dependencies
RUN ./gradlew dependencies --no-daemon

COPY src src
# Build the application
RUN ./gradlew build -x test --no-daemon

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 보안을 위한 non-root 유저 생성
RUN addgroup -S spring && adduser -S spring -G spring

# 빌드된 애플리케이션을 spring 유저 권한으로 복사
COPY --chown=spring:spring --from=builder /app/build/libs/*.jar app.jar

# 유저 변경 (root -> spring)
USER spring:spring

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS:--Xms512m -Xmx1024m} -jar app.jar"]
