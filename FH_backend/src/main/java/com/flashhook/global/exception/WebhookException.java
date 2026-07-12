package com.flashhook.global.exception;

public class WebhookException extends BusinessException {

    public WebhookException(ErrorCode errorCode) {
        super(errorCode);
    }

    public WebhookException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}
