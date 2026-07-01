package com.flashhook.global.ratelimit;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.flashhook.global.exception.ErrorCode;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
@Order(Ordered.LOWEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    public static final String CREATE_LIMIT_PREFIX = "rl:create2:";

    @Value("${flashhook.ratelimit.endpoint-create:5}")
    private int endpointCreateLimit;

    @Value("${flashhook.ratelimit.webhook-receive:100}")
    private int webhookReceiveLimit;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = request.getHeader("X-Real-IP");
        if (clientIp == null || clientIp.isEmpty()) {
            clientIp = request.getRemoteAddr();
        }

        // 0. 블랙리스트 체크 (가장 먼저)
        if (path.startsWith("/api/hooks/") || path.startsWith("/api/endpoints")) {
            if (rateLimitService.isBlacklisted(clientIp)) {
                sendErrorResponse(response, ErrorCode.FORBIDDEN);
                return;
            }
        }

        // 1. 웹훅 수신 API (ANY /api/hooks/{endpointId})
        if (path.startsWith("/api/hooks/")) {
            String[] parts = path.split("/");
            if (parts.length >= 4) {
                String endpointId = parts[3];
                String key = "rl:hook:" + endpointId + ":" + clientIp;
                // 1분(60초) 기준
                if (!rateLimitService.isAllowed(key, webhookReceiveLimit, 60)) {
                    sendErrorResponse(response, ErrorCode.RATE_LIMIT_EXCEEDED);
                    return;
                }
            }
        }

        // 2. 엔드포인트 생성 API (POST /api/endpoints)
        if ("POST".equalsIgnoreCase(method) && "/api/endpoints".equals(path)) {
            String key = CREATE_LIMIT_PREFIX + clientIp;
            // 10분(600초) 기준
            if (!rateLimitService.isAllowed(key, endpointCreateLimit, 10 * 60)) {
                sendErrorResponse(response, ErrorCode.ENDPOINT_LIMIT_EXCEEDED);
                return;
            }
        }

        // 3. Replay API (POST /api/endpoints/{endpointId}/logs/{logId}/replay)
        if ("POST".equalsIgnoreCase(method) && path.startsWith("/api/endpoints/") && path.endsWith("/replay")) {
            String[] parts = path.split("/");
            if (parts.length >= 7) {
                String endpointId = parts[3];
                String key = "rl:replay:" + endpointId;
                // 1분(60초) 기준 20회 제한
                if (!rateLimitService.isAllowed(key, 20, 60)) {
                    sendErrorResponse(response, ErrorCode.RATE_LIMIT_EXCEEDED);
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendErrorResponse(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getStatus());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        String json = String.format(
                "{\"code\":\"%s\",\"message\":\"%s\",\"status\":%d}",
                errorCode.getCode(), errorCode.getMessage(), errorCode.getStatus());
        response.getWriter().write(json);
    }
}
