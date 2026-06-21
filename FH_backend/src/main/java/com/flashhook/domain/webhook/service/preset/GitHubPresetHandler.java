package com.flashhook.domain.webhook.service.preset;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

import com.flashhook.domain.webhook.dto.WebhookPayload;
import com.flashhook.global.util.EncryptionUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class GitHubPresetHandler implements RequestSigningPresetHandler {

    private final EncryptionUtil encryptionUtil;

    @Override
    public String getPresetType() {
        return "GITHUB";
    }

    @Override
    public WebhookPayload handleRequestGeneration(WebhookPayload payload, Map<String, Object> presetOptions) {
        if (presetOptions == null || !presetOptions.containsKey("secretKey")) {
            return payload;
        }

        Object encryptedSecretValue = presetOptions.get("secretKey");
        if (!(encryptedSecretValue instanceof String encryptedSecret) || encryptedSecret.isBlank()) {
            return payload;
        }

        String secretKey = encryptionUtil.decrypt(encryptedSecret);
        if (secretKey == null || secretKey.isBlank()) {
            return payload;
        }

        String rawBody = payload.getBody() == null ? "" : payload.getBody();
        String digest = "sha256=" + encodeHex(hmacSha256(secretKey.getBytes(StandardCharsets.UTF_8), rawBody));

        HttpHeaders newHeaders = new HttpHeaders();
        if (payload.getHeaders() != null) {
            newHeaders.putAll(payload.getHeaders());
        }
        newHeaders.set("X-Hub-Signature-256", digest);

        return payload.toBuilder()
                .headers(newHeaders)
                .build();
    }

    private byte[] hmacSha256(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException | IllegalArgumentException e) {
            log.error("Failed to generate HMAC-SHA256 signature", e);
            throw new com.flashhook.global.exception.BusinessException(com.flashhook.global.exception.ErrorCode.INTERNAL_ERROR);
        }
    }

    private String encodeHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
