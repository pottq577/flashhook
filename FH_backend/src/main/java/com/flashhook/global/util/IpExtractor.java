package com.flashhook.global.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 클라이언트 IP 추출 유틸리티
 * 리버스 프록시 환경에서 X-Forwarded-For 헤더를 우선 사용
 */
public final class IpExtractor {

    private IpExtractor() {
        // 인스턴스 생성 방지
    }

    /**
     * HttpServletRequest에서 클라이언트 IP 추출
     * X-Forwarded-For 헤더가 있으면 첫 번째 IP 반환, 없으면 getRemoteAddr() 반환
     */
    public static String extract(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        } else {
            // X-Forwarded-For가 여러 IP를 포함할 경우 첫 번째 IP 사용
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
