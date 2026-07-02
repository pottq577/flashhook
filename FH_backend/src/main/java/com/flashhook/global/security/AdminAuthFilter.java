package com.flashhook.global.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.flashhook.global.config.FlashHookProperties;
import com.flashhook.global.exception.ErrorCode;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AdminAuthFilter extends OncePerRequestFilter {

    private final FlashHookProperties properties;

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

        if (path.startsWith("/api/admin")) {
            String token = request.getHeader("X-Admin-Token");
            if (token == null || !MessageDigest.isEqual(
                    token.getBytes(StandardCharsets.UTF_8),
                    properties.admin().secretKey().getBytes(StandardCharsets.UTF_8))) {
                sendErrorResponse(response, ErrorCode.FORBIDDEN);
                return;
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
