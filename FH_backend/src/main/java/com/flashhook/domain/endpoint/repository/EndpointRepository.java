package com.flashhook.domain.endpoint.repository;

import com.flashhook.domain.endpoint.model.Endpoint;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

/**
 * 엔드포인트 리포지토리
 */
public interface EndpointRepository extends MongoRepository<Endpoint, String> {

    Optional<Endpoint> findByEndpointId(String endpointId);

    long countByCreatorIp(String ip);
}
