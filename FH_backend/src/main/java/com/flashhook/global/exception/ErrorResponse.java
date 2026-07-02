package com.flashhook.global.exception;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공통 에러 응답 DTO
 */
@Builder
public record ErrorResponse(
    String code,
    String message,
    int status,
    Instant timestamp,
    String path,
    List<FieldError> errors
) {

    @Builder
    public record FieldError(
        String field,
        String reason
    ) {}
}
