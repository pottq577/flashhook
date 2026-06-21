package com.flashhook.global.exception;

public class PresetException extends BusinessException {
    public PresetException(ErrorCode errorCode) {
        super(errorCode);
    }

    public PresetException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}
