package com.flashhook.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 에러 코드 열거형
 * HTTP 상태, 에러 코드 문자열, 사용자 메시지 포함
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_TOKEN(403, "INVALID_TOKEN", "유효하지 않은 액세스 토큰입니다"),
    ENDPOINT_NOT_FOUND(404, "ENDPOINT_NOT_FOUND", "엔드포인트를 찾을 수 없습니다"),
    RATE_LIMIT_EXCEEDED(429, "RATE_LIMIT_EXCEEDED", "요청 제한을 초과했습니다"),
    ENDPOINT_LIMIT_EXCEEDED(429, "ENDPOINT_LIMIT_EXCEEDED", "엔드포인트 생성 제한을 초과했습니다"),
    PAYLOAD_TOO_LARGE(413, "PAYLOAD_TOO_LARGE", "페이로드 크기가 제한을 초과했습니다"),
    INTERNAL_ERROR(500, "INTERNAL_ERROR", "서버 내부 오류가 발생했습니다");

    private final int status;
    private final String code;
    private final String message;
}
