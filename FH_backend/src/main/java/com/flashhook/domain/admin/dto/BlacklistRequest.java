package com.flashhook.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

public record BlacklistRequest(
    @NotBlank
    @IpAddress
    String ip
) {}
