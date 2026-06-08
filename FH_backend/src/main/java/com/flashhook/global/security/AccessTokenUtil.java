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
        return java.util.UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 토큰 해시 (SHA-256)
     */
    public static String hashToken(String rawToken) {
        if (rawToken == null) return null;
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    /**
     * 원본 토큰과 해시값 비교 검증
     */
    public static boolean verifyToken(String rawToken, String hash) {
        if (rawToken == null || hash == null) return false;
        return hashToken(rawToken).equals(hash);
    }
}
