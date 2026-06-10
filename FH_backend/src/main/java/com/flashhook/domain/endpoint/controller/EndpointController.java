package com.flashhook.domain.endpoint.controller;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.service.EndpointService;
import com.flashhook.global.util.IpExtractor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            HttpServletRequest httpRequest) {
        String ip = IpExtractor.extract(httpRequest);
        EndpointResponse response = endpointService.create(request, ip);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 엔드포인트 정보 조회
     */
    @GetMapping("/{endpointId}")
    public ResponseEntity<EndpointResponse> getInfo(@PathVariable String endpointId) {
        EndpointResponse response = endpointService.getInfo(endpointId);
        return ResponseEntity.ok(response);
    }

    /**
     * 엔드포인트 삭제
     */
    @DeleteMapping("/{endpointId}")
    public ResponseEntity<Void> delete(@PathVariable String endpointId) {
        endpointService.delete(endpointId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 모의 설정 업데이트
     */
    @PatchMapping("/{endpointId}/mock")
    public ResponseEntity<EndpointResponse> updateMock(
            @PathVariable String endpointId,
            @Valid @RequestBody com.flashhook.domain.endpoint.dto.MockUpdateRequest request) {
        EndpointResponse response = endpointService.updateMockConfig(endpointId, request);
        return ResponseEntity.ok(response);
    }
}
