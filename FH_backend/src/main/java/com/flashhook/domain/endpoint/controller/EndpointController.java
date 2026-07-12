package com.flashhook.domain.endpoint.controller;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.dto.MockUpdateRequest;
import com.flashhook.domain.endpoint.service.EndpointService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 엔드포인트 CRUD 컨트롤러
 */
@RestController
@RequestMapping("/api/endpoints")
@RequiredArgsConstructor
public class EndpointController {

    private final EndpointService endpointService;

    /**
     * 엔드포인트 생성
     */
    @PostMapping
    public ResponseEntity<EndpointResponse> create(
        @Valid @RequestBody(required = false) EndpointCreateRequest request,
        HttpServletRequest httpRequest
    ) {
        String ip = httpRequest.getRemoteAddr();
        EndpointResponse response = endpointService.create(request, ip);

        ResponseCookie cookie = ResponseCookie.from(
            "fh_token_" + response.endpointId(),
            response.accessToken()
        )
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/api/endpoints/" + response.endpointId())
            .maxAge(24 * 60 * 60)
            .build();

        EndpointResponse safeResponse = response
            .toBuilder()
            .accessToken(null)
            .build();

        return ResponseEntity.status(HttpStatus.CREATED)
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(safeResponse);
    }

    /**
     * 엔드포인트 정보 조회
     */
    @GetMapping("/{endpointId}")
    public ResponseEntity<EndpointResponse> getInfo(
        @PathVariable String endpointId
    ) {
        EndpointResponse response = endpointService.getInfo(endpointId);
        return ResponseEntity.ok(response);
    }

    /**
     * 엔드포인트 삭제
     */
    @DeleteMapping("/{endpointId}")
    public ResponseEntity<Void> delete(@PathVariable String endpointId) {
        endpointService.delete(endpointId);

        ResponseCookie cookie = ResponseCookie.from(
            "fh_token_" + endpointId,
            ""
        )
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/api/endpoints/" + endpointId)
            .maxAge(0)
            .build();

        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .build();
    }

    /**
     * 모의 설정 업데이트
     */
    @PatchMapping("/{endpointId}/mock")
    public ResponseEntity<EndpointResponse> updateMock(
        @PathVariable String endpointId,
        @Valid @RequestBody MockUpdateRequest request
    ) {
        EndpointResponse response = endpointService.updateMockConfig(
            endpointId,
            request
        );
        return ResponseEntity.ok(response);
    }
}
