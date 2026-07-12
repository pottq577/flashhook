package com.flashhook.global.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 전역 예외 처리기
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * BusinessException 처리
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(
        BusinessException e,
        HttpServletRequest request
    ) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(e.getErrorCode().getStatus()).build();
        }
        return ResponseEntity.status(e.getErrorCode().getStatus()).body(
            ErrorResponse.builder()
                .code(e.getErrorCode().getCode())
                .message(
                    e.getCustomMessage() != null
                        ? e.getCustomMessage()
                        : e.getErrorCode().getMessage()
                )
                .status(e.getErrorCode().getStatus())
                .timestamp(Instant.now())
                .path(request.getRequestURI())
                .build()
        );
    }

    /**
     * 유효성 검사 예외 처리
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(
        MethodArgumentNotValidException e,
        HttpServletRequest request
    ) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(
                ErrorCode.INVALID_REQUEST.getStatus()
            ).build();
        }

        List<ErrorResponse.FieldError> errors = e
            .getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error ->
                ErrorResponse.FieldError.builder()
                    .field(error.getField())
                    .reason(error.getDefaultMessage())
                    .build()
            )
            .toList();

        return ResponseEntity.status(
            ErrorCode.INVALID_REQUEST.getStatus()
        ).body(
            ErrorResponse.builder()
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message(ErrorCode.INVALID_REQUEST.getMessage())
                .status(ErrorCode.INVALID_REQUEST.getStatus())
                .timestamp(Instant.now())
                .path(request.getRequestURI())
                .errors(errors)
                .build()
        );
    }

    /**
     * 낙관적 락 예외 처리
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<?> handleOptimisticLockingFailureException(
        OptimisticLockingFailureException e,
        HttpServletRequest request
    ) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(
                ErrorCode.CONCURRENT_MODIFICATION.getStatus()
            ).build();
        }
        return ResponseEntity.status(
            ErrorCode.CONCURRENT_MODIFICATION.getStatus()
        ).body(
            ErrorResponse.builder()
                .code(ErrorCode.CONCURRENT_MODIFICATION.getCode())
                .message(ErrorCode.CONCURRENT_MODIFICATION.getMessage())
                .status(ErrorCode.CONCURRENT_MODIFICATION.getStatus())
                .timestamp(Instant.now())
                .path(request.getRequestURI())
                .build()
        );
    }

    /**
     * SSE 연결 끊김 등 비동기 요청에서 발생하는 클라이언트 접속 종료 예외 (Broken Pipe 등) 처리
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public ResponseEntity<?> handleAsyncRequestNotUsableException(
        AsyncRequestNotUsableException e,
        HttpServletRequest request
    ) {
        // 이 예외는 클라이언트가 브라우저 탭을 닫거나 새로고침했을 때 자연스럽게 발생하므로 DEBUG 레벨로만 남김
        log.debug(
            "Client disconnected during async/SSE request: {}",
            e.getMessage()
        );
        return ResponseEntity.noContent().build();
    }

    /**
     * 404 Not Found 예외 처리
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFoundException(
        NoResourceFoundException e,
        HttpServletRequest request
    ) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(
                ErrorCode.NOT_FOUND.getStatus()
            ).build();
        }
        return ResponseEntity.status(ErrorCode.NOT_FOUND.getStatus()).body(
            ErrorResponse.builder()
                .code(ErrorCode.NOT_FOUND.getCode())
                .message(ErrorCode.NOT_FOUND.getMessage())
                .status(ErrorCode.NOT_FOUND.getStatus())
                .timestamp(Instant.now())
                .path(request.getRequestURI())
                .build()
        );
    }

    /**
     * 잘못된 인자 예외 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgumentException(
        IllegalArgumentException e,
        HttpServletRequest request
    ) {
        log.warn("Illegal argument: {}", e.getMessage());
        if (isSseRequest(request)) {
            return ResponseEntity.status(
                ErrorCode.INVALID_REQUEST.getStatus()
            ).build();
        }
        return ResponseEntity.status(
            ErrorCode.INVALID_REQUEST.getStatus()
        ).body(
            ErrorResponse.builder()
                .code(ErrorCode.INVALID_REQUEST.getCode())
                .message(ErrorCode.INVALID_REQUEST.getMessage())
                .status(ErrorCode.INVALID_REQUEST.getStatus())
                .timestamp(Instant.now())
                .path(request.getRequestURI())
                .build()
        );
    }

    /**
     * 기타 예외 처리
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(
        Exception e,
        HttpServletRequest request
    ) {
        log.error("Unhandled Exception", e);
        if (isSseRequest(request)) {
            return ResponseEntity.status(
                ErrorCode.INTERNAL_ERROR.getStatus()
            ).build();
        }
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getStatus()).body(
            ErrorResponse.builder()
                .code(ErrorCode.INTERNAL_ERROR.getCode())
                .message(ErrorCode.INTERNAL_ERROR.getMessage())
                .status(ErrorCode.INTERNAL_ERROR.getStatus())
                .timestamp(Instant.now())
                .path(request.getRequestURI())
                .build()
        );
    }

    private boolean isSseRequest(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return (
            accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE)
        );
    }
}
