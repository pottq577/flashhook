package com.flashhook.global.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate Limit 필터
 * Redis 기반으로 요청 빈도 제한
 */
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import com.flashhook.global.util.IpExtractor;
import com.flashhook.global.exception.ErrorCode;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    @Value("${flashhook.ratelimit.endpoint-create:5}")
    private int endpointCreateLimit;

    @Value("${flashhook.ratelimit.webhook-receive:100}")
    private int webhookReceiveLimit;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 1. 엔드포인트 생성 API (POST /api/endpoints)
        if ("POST".equalsIgnoreCase(method) && "/api/endpoints".equals(path)) {
            String ip = IpExtractor.extract(request);
            String key = "rl:create:" + ip;
            // 10분(600초) 기준
            if (!rateLimitService.isAllowed(key, endpointCreateLimit, 600)) {
                sendErrorResponse(response, ErrorCode.RATE_LIMIT_EXCEEDED);
                return;
            }
        }

        // 2. 웹훅 수신 API (ANY /api/hooks/{endpointId})
        if (path.startsWith("/api/hooks/")) {
            String[] parts = path.split("/");
            if (parts.length >= 4) {
                String endpointId = parts[3];
                String key = "rl:hook:" + endpointId;
                // 1분(60초) 기준
                if (!rateLimitService.isAllowed(key, webhookReceiveLimit, 60)) {
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
            errorCode.getCode(), errorCode.getMessage(), errorCode.getStatus()
        );
        response.getWriter().write(json);
    }
}
