package com.flashhook.global.util;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EncryptionUtil {

    private static final String KEY_ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Key key;

    public EncryptionUtil(@Value("${flashhook.security.secret-key}") String secretKey) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("flashhook.security.secret-key must be configured");
        }
        byte[] validKeyBytes = deriveKey(secretKey.getBytes(StandardCharsets.UTF_8), 32);
        this.key = new SecretKeySpec(validKeyBytes, KEY_ALGORITHM);
    }

    private static byte[] deriveKey(byte[] inputKey, int length) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(inputKey, "HmacSHA256"));
            byte[] derived = mac.doFinal("flashhook-encryption-key".getBytes(StandardCharsets.UTF_8));
            return Arrays.copyOf(derived, length);
        } catch (java.security.GeneralSecurityException | IllegalArgumentException e) {
            throw new com.flashhook.global.exception.EncryptionException("Key derivation failed", e);
        }
    }

    public String encrypt(String value) {
        if (value == null) return null;
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[IV_LENGTH + encrypted.length];
            System.arraycopy(iv, 0, out, 0, IV_LENGTH);
            System.arraycopy(encrypted, 0, out, IV_LENGTH, encrypted.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (java.security.GeneralSecurityException | IllegalArgumentException e) {
            throw new com.flashhook.global.exception.EncryptionException("Encryption failed", e);
        }
    }

    public String decrypt(String value) {
        if (value == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            byte[] iv = Arrays.copyOfRange(decoded, 0, IV_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(decoded, IV_LENGTH, decoded.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] decrypted = cipher.doFinal(encrypted);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (java.security.GeneralSecurityException | IllegalArgumentException e) {
            throw new com.flashhook.global.exception.EncryptionException("Decryption failed", e);
        }
    }
}
