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
        // TODO: 구현 필요
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * 엔드포인트 정보 조회
     */
    @GetMapping("/{endpointId}")
    public ResponseEntity<EndpointResponse> getInfo(@PathVariable String endpointId) {
        // TODO: 구현 필요
        return ResponseEntity.ok().build();
    }

    /**
     * 엔드포인트 삭제
     */
    @DeleteMapping("/{endpointId}")
    public ResponseEntity<Void> delete(@PathVariable String endpointId) {
        // TODO: 구현 필요
        return ResponseEntity.noContent().build();
    }
}
