package com.flashhook.domain.webhook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

public record ReplayRequest(
    @NotBlank(message = "목적지 URL은 필수입니다.")
    String destinationUrl
) {}
