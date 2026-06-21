package com.flashhook.global.exception;

import lombok.Getter;

/**
 * 커스텀 비즈니스 예외
 * ErrorCode를 포함하여 GlobalExceptionHandler에서 일관된 응답 생성
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
