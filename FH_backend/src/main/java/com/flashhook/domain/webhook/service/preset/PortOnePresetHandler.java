package com.flashhook.domain.webhook.service.preset;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

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
public class PortOnePresetHandler implements RequestSigningPresetHandler {

    private final EncryptionUtil encryptionUtil;

    @Override
    public String getPresetType() {
        return "PORTONE_V2";
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

        String webhookId = UUID.randomUUID().toString();
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String body = payload.getBody() == null ? "" : payload.getBody();
        String signedContent = webhookId + "." + timestamp + "." + body;

        String secret = secretKey.startsWith("whsec_") ? secretKey.substring(6) : secretKey;
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid PortOne webhook secret format", e);
            return payload;
        }

        byte[] digestBytes = hmacSha256(keyBytes, signedContent);
        String signature = "v1," + Base64.getEncoder().encodeToString(digestBytes);

        HttpHeaders newHeaders = new HttpHeaders();
        if (payload.getHeaders() != null) {
            newHeaders.putAll(payload.getHeaders());
        }
        newHeaders.set("webhook-id", webhookId);
        newHeaders.set("webhook-timestamp", timestamp);
        newHeaders.set("webhook-signature", signature);

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
}
