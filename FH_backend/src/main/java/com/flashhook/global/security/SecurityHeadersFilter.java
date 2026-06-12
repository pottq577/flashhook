package com.flashhook.global.security;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 기본 보안 HTTP 헤더 추가 필터
 * Spring Security를 미사용함에 따라 필수 헤더들을 수동으로 추가
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (response instanceof HttpServletResponse httpResponse) {
            httpResponse.setHeader("X-Content-Type-Options", "nosniff");
            httpResponse.setHeader("X-Frame-Options", "DENY");
            httpResponse.setHeader("Content-Security-Policy", "default-src 'self'");
            
            if (request.isSecure()) {
                httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            }
            
            // 민감한 경로에만 캐시 비활성화 적용
            if (request instanceof HttpServletRequest httpRequest) {
                String path = httpRequest.getRequestURI();
                if (path.startsWith("/api/auth") || path.startsWith("/api/user")) {
                    httpResponse.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
                    httpResponse.setHeader("Pragma", "no-cache");
                }
            }
        }
        
        chain.doFilter(request, response);
    }
}
