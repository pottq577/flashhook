package com.flashhook.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record BlacklistRequest(
        @NotBlank @IpAddress String ip) {
}
