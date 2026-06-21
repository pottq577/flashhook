package com.flashhook.global.exception;

/**
 * 암호화 및 복호화 처리 중 발생하는 예외
 */
public class EncryptionException extends RuntimeException {

    public EncryptionException(String message, Throwable cause) {
        super(message, cause);
    }
}
