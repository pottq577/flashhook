package com.flashhook.domain.admin.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Getter
@NoArgsConstructor
public class BlacklistRequest {
    @NotBlank
    @Pattern(regexp = "^(?:\\d{1,3}\\.){3}\\d{1,3}$|^[0-9a-fA-F:]+$", message = "Invalid IP format")
    private String ip;
}
