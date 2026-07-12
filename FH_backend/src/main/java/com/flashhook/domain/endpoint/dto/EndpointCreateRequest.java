package com.flashhook.domain.endpoint.dto;

import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * 엔드포인트 생성 요청 DTO
 */
@Builder
public record EndpointCreateRequest(
    @Size(max = 100, message = "라벨은 최대 100자까지 가능합니다") String label
) {}
