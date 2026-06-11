package com.flashhook.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.MediaType;

import java.time.Instant;

/**
 * 전역 예외 처리기
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * CustomException 처리
     */
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<?> handleCustomException(CustomException e, HttpServletRequest request) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(e.getErrorCode().getStatus()).build();
        }
        return ResponseEntity
                .status(e.getErrorCode().getStatus())
                .body(ErrorResponse.builder()
                        .code(e.getErrorCode().getCode())
                        .message(e.getErrorCode().getMessage())
                        .status(e.getErrorCode().getStatus())
                        .timestamp(Instant.now())
                        .path(request.getRequestURI())
                        .build());
    }

    /**
     * 낙관적 락 예외 처리
     */
    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<?> handleOptimisticLockingFailureException(org.springframework.dao.OptimisticLockingFailureException e, HttpServletRequest request) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(ErrorCode.CONCURRENT_MODIFICATION.getStatus()).build();
        }
        return ResponseEntity
                .status(ErrorCode.CONCURRENT_MODIFICATION.getStatus())
                .body(ErrorResponse.builder()
                        .code(ErrorCode.CONCURRENT_MODIFICATION.getCode())
                        .message(ErrorCode.CONCURRENT_MODIFICATION.getMessage())
                        .status(ErrorCode.CONCURRENT_MODIFICATION.getStatus())
                        .timestamp(Instant.now())
                        .path(request.getRequestURI())
                        .build());
    }

    /**
     * 기타 예외 처리
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception e, HttpServletRequest request) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(500).build();
        }
        return ResponseEntity
                .status(500)
                .body(ErrorResponse.builder()
                        .code(ErrorCode.INTERNAL_ERROR.getCode())
                        .message(ErrorCode.INTERNAL_ERROR.getMessage())
                        .status(500)
                        .timestamp(Instant.now())
                        .path(request.getRequestURI())
                        .build());
    }

    private boolean isSseRequest(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE);
    }
}
