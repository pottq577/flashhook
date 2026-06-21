package com.flashhook.global.exception;

/**
 * 암호화 및 복호화 처리 중 발생하는 예외
 */
public class EncryptionException extends BusinessException {

    public EncryptionException(String message, Throwable cause) {
        super(ErrorCode.INTERNAL_ERROR, message, cause);
    }
}
