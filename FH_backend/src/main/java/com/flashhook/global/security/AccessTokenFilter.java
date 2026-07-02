package com.flashhook.global.security;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.global.exception.ErrorCode;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AccessTokenFilter extends OncePerRequestFilter {

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
    private final EndpointRepository endpointRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        MDC.put("traceId", traceId);
        try {
            String path = request.getRequestURI();
            String method = request.getMethod();

            if ("OPTIONS".equalsIgnoreCase(method)) {
                filterChain.doFilter(request, response);
                return;
            }

            // /api/endpoints/{id} 또는 /api/endpoints/{id}/... 형태인지 확인
            // (단, POST /api/endpoints는 제외)
            if (path.startsWith("/api/endpoints/") && path.length() > "/api/endpoints/".length()) {
                if (PATH_MATCHER.match("/api/endpoints/*/stream", path) && "GET".equalsIgnoreCase(method)) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String[] parts = path.split("/");
                if (parts.length >= 4) { // ["", "api", "endpoints", "{id}", ...]
                    String endpointId = parts[3];

                    String token = request.getHeader("X-Access-Token");
                    if (token == null || token.isEmpty()) {
                        token = request.getParameter("token");
                    }

                    if (token == null || token.isEmpty()) {
                        sendErrorResponse(response, ErrorCode.INVALID_TOKEN);
                        return;
                    }

                    Endpoint endpoint = endpointRepository.findByEndpointId(endpointId).orElse(null);
                    if (endpoint == null || !AccessTokenUtil.verifyToken(token, endpoint.getAccessTokenHash())) {
                        sendErrorResponse(response, ErrorCode.INVALID_TOKEN);
                        return;
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("traceId");
        }
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
