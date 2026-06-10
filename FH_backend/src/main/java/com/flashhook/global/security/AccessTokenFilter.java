package com.flashhook.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 액세스 토큰 검증 필터
 * /api/endpoints/{id}/** 경로에 대해 X-Access-Token 헤더 또는 ?token= 쿼리 파라미터 검증
 */
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.global.exception.ErrorCode;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AccessTokenFilter extends OncePerRequestFilter {

    private final EndpointRepository endpointRepository;

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

        // /api/endpoints/{id} 또는 /api/endpoints/{id}/... 형태인지 확인
        // (단, POST /api/endpoints는 제외)
        if (path.startsWith("/api/endpoints/") && path.length() > "/api/endpoints/".length()) {
            if (path.endsWith("/stream") && "GET".equalsIgnoreCase(method)) {
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

                Optional<Endpoint> endpointOpt = endpointRepository.findByEndpointId(endpointId);
                if (endpointOpt.isEmpty()) {
                    sendErrorResponse(response, ErrorCode.INVALID_TOKEN);
                    return;
                }

                Endpoint endpoint = endpointOpt.get();
                if (!AccessTokenUtil.verifyToken(token, endpoint.getAccessTokenHash())) {
                    sendErrorResponse(response, ErrorCode.INVALID_TOKEN);
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
