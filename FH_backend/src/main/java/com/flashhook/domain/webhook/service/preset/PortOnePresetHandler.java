package com.flashhook.domain.webhook.service.preset;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

import com.flashhook.domain.webhook.dto.WebhookPayload;
import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.exception.PresetException;
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
        String body = payload.body() == null ? "" : payload.body();
        String signedContent = webhookId + "." + timestamp + "." + body;

        String secret = secretKey.startsWith("whsec_") ? secretKey.substring(6) : secretKey;
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid PortOne webhook secret format", e);
            return payload;
        } catch (Exception e) {
            log.error("Unexpected error during PortOne secret decoding", e);
            return payload;
        }

        byte[] digestBytes = hmacSha256(keyBytes, signedContent);
        String signature = "v1," + Base64.getEncoder().encodeToString(digestBytes);

        HttpHeaders newHeaders = new HttpHeaders();
        if (payload.headers() != null) {
            newHeaders.putAll(payload.headers());
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
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            log.error("Failed to generate HMAC-SHA256 signature", e);
            throw new PresetException(ErrorCode.PRESET_SIGNATURE_FAILED,
                    "PortOne 시크릿 키 형식이 올바르지 않거나 서명 생성에 실패했습니다");
        } catch (Exception e) {
            log.error("Unexpected error during HMAC-SHA256 signature generation", e);
            throw new PresetException(ErrorCode.PRESET_SIGNATURE_FAILED,
                    "PortOne 서명 생성 중 예상치 못한 오류가 발생했습니다");
        }
    }
}
