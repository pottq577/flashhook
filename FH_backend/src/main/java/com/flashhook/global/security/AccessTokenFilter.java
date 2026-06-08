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
public class AccessTokenFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // TODO: 구현 필요
        filterChain.doFilter(request, response);
    }
}
