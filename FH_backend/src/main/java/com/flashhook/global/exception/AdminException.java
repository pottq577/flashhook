package com.flashhook.global.exception;

public class AdminException extends BusinessException {

    public AdminException(ErrorCode errorCode) {
        super(errorCode);
    }

    public AdminException(ErrorCode errorCode, String customMessage) {
        super(errorCode, customMessage);
    }
}
