package com.flashhook.domain.webhook.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SseDeliveryFailedEvent {
    private String logId;
    private String errorMessage;
}
