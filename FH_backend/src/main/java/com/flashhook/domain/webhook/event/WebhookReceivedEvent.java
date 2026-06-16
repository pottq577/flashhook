package com.flashhook.domain.webhook.event;

import com.flashhook.domain.webhook.model.WebhookLog;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 웹훅 수신 이벤트 (POJO 스타일)
 * ApplicationEventPublisher를 통해 발행되며, SSE 전파 등에 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class WebhookReceivedEvent {

    private WebhookLog webhookLog;
}
