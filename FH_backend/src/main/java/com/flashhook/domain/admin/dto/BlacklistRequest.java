package com.flashhook.domain.admin.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotBlank;
@Getter
@NoArgsConstructor
public class BlacklistRequest {
    @NotBlank
    @IpAddress
    private String ip;
}
