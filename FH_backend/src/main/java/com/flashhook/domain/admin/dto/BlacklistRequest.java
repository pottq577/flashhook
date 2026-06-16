package com.flashhook.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BlacklistRequest {
    @NotBlank
    @IpAddress
    private String ip;
}
