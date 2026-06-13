package com.flashhook.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.MediaType;
import org.springframework.dao.OptimisticLockingFailureException;

import java.time.Instant;

import lombok.extern.slf4j.Slf4j;

/**
 * 전역 예외 처리기
 */
@Slf4j
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
     * 유효성 검사 예외 처리
     */
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(org.springframework.web.bind.MethodArgumentNotValidException e, HttpServletRequest request) {
        String message = e.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        if (isSseRequest(request)) {
            return ResponseEntity.status(ErrorCode.INVALID_REQUEST.getStatus()).build();
        }
        return ResponseEntity
                .status(ErrorCode.INVALID_REQUEST.getStatus())
                .body(ErrorResponse.builder()
                        .code(ErrorCode.INVALID_REQUEST.getCode())
                        .message(message != null ? message : ErrorCode.INVALID_REQUEST.getMessage())
                        .status(ErrorCode.INVALID_REQUEST.getStatus())
                        .timestamp(Instant.now())
                        .path(request.getRequestURI())
                        .build());
    }

    /**
     * 낙관적 락 예외 처리
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<?> handleOptimisticLockingFailureException(OptimisticLockingFailureException e, HttpServletRequest request) {
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
        log.error("Unhandled Exception", e);
        if (isSseRequest(request)) {
            return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getStatus()).build();
        }
        return ResponseEntity
                .status(ErrorCode.INTERNAL_ERROR.getStatus())
                .body(ErrorResponse.builder()
                        .code(ErrorCode.INTERNAL_ERROR.getCode())
                        .message(ErrorCode.INTERNAL_ERROR.getMessage())
                        .status(ErrorCode.INTERNAL_ERROR.getStatus())
                        .timestamp(Instant.now())
                        .path(request.getRequestURI())
                        .build());
    }

    private boolean isSseRequest(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE);
    }
}
