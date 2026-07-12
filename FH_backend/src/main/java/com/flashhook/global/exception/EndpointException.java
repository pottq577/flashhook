package com.flashhook.global.exception;

public class EndpointException extends BusinessException {

    public EndpointException(ErrorCode errorCode) {
        super(errorCode);
    }

    public EndpointException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}
