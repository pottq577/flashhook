package com.flashhook.domain.endpoint.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.jackson.Jacksonized;

/**
 * 엔드포인트 생성 요청 DTO
 */
@Getter
@Builder
@Jacksonized
@NoArgsConstructor
@AllArgsConstructor
public class EndpointCreateRequest {

    @Size(max = 100, message = "라벨은 최대 100자까지 가능합니다")
    private String label;
}
