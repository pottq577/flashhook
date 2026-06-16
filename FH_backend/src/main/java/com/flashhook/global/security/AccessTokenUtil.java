package com.flashhook.global.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

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
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 토큰 해시 (SHA-256)
     */
    public static String hashToken(String rawToken) {
        if (rawToken == null)
            return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    public static boolean verifyToken(String rawToken, String hash) {
        if (rawToken == null || hash == null)
            return false;
        return MessageDigest.isEqual(
                hashToken(rawToken).getBytes(StandardCharsets.UTF_8),
                hash.getBytes(StandardCharsets.UTF_8));
    }
}
