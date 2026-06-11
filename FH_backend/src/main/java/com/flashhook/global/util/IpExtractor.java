package com.flashhook.global.util;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.regex.Pattern;

/**
 * 클라이언트 IP 추출 유틸리티
 * 리버스 프록시 환경에서 X-Forwarded-For 헤더를 우선 사용
 */
public final class IpExtractor {

    private static final Logger log = LoggerFactory.getLogger(IpExtractor.class);
    // 간단한 IPv4, IPv6 정규식 패턴 (허용되는 문자만 체크)
    private static final Pattern IP_PATTERN = Pattern.compile("^([0-9a-fA-F.:]+)$");

    private IpExtractor() {
        // 인스턴스 생성 방지
    }

    /**
     * HttpServletRequest에서 클라이언트 IP 추출
     * X-Forwarded-For 헤더가 있으면 첫 번째 IP 반환, 없으면 getRemoteAddr() 반환
     */
    public static String extract(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank() || "unknown".equalsIgnoreCase(xfHeader.trim())) {
            return fallback(request, "X-Forwarded-For is missing or unknown");
        }
        
        String clientIp = xfHeader.split(",")[0].trim();
        if (clientIp.isEmpty()) {
            return fallback(request, "X-Forwarded-For contains only whitespace");
        }
        
        if (!IP_PATTERN.matcher(clientIp).matches()) {
            return fallback(request, "Invalid IP format: " + clientIp);
        }
        
        return clientIp;
    }

    private static String fallback(HttpServletRequest request, String reason) {
        String remoteAddr = request.getRemoteAddr();
        log.warn("IP Extraction fallback to getRemoteAddr() [{}]: {}", remoteAddr, reason);
        return remoteAddr;
    }
}
