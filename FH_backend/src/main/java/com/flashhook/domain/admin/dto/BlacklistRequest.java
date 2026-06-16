package com.flashhook.domain.admin.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BlacklistRequest {
    private String ip;
}
