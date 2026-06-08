package com.flashhook.domain.endpoint.service;

import com.flashhook.domain.endpoint.dto.EndpointCreateRequest;
import com.flashhook.domain.endpoint.dto.EndpointResponse;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 엔드포인트 비즈니스 로직
 */
@Service
@RequiredArgsConstructor
public class EndpointService {

    private final EndpointRepository endpointRepository;

    /**
     * 엔드포인트 생성
     */
    public EndpointResponse create(EndpointCreateRequest request, String ip) {
        // TODO: 구현 필요
        return null;
    }

    /**
     * 엔드포인트 정보 조회
     */
    public EndpointResponse getInfo(String endpointId) {
        // TODO: 구현 필요
        return null;
    }

    /**
     * 엔드포인트 삭제
     */
    public void delete(String endpointId) {
        // TODO: 구현 필요
    }
}
