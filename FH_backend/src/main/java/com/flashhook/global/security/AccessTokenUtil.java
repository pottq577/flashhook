package com.flashhook.global.security;

/**
 * 액세스 토큰 유틸리티
 * 토큰 생성, 해시, 검증 담당
 */
public final class AccessTokenUtil {

    private AccessTokenUtil() {
        // 인스턴스 생성 방지
    }

    /**
     * 랜덤 액세스 토큰 생성
     */
    public static String generateToken() {
        // TODO: 구현 필요
        return null;
    }

    /**
     * 토큰 해시 (SHA-256 등)
     */
    public static String hashToken(String rawToken) {
        // TODO: 구현 필요
        return null;
    }

    /**
     * 원본 토큰과 해시값 비교 검증
     */
    public static boolean verifyToken(String rawToken, String hash) {
        // TODO: 구현 필요
        return false;
    }
}
