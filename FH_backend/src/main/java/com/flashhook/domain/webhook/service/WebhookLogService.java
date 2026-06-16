package com.flashhook.domain.webhook.service;

import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.UnknownHostException;
import java.util.Collections;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SNIHostName;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.flashhook.domain.endpoint.model.Endpoint;
import com.flashhook.domain.endpoint.repository.EndpointRepository;
import com.flashhook.domain.webhook.dto.WebhookLogDetailResponse;
import com.flashhook.domain.webhook.dto.WebhookLogResponse;
import com.flashhook.domain.webhook.model.WebhookLog;
import com.flashhook.domain.webhook.repository.WebhookLogRepository;
import com.flashhook.global.exception.CustomException;
import com.flashhook.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 웹훅 로그 조회/삭제 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookLogService {

    static {
        // Host 헤더를 수동으로 설정하기 위해 필요 (IP 핀닝 시 원본 호스트 전달용)
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
    }

    private final WebhookLogRepository webhookLogRepository;
    private final EndpointRepository endpointRepository;
    private final MongoTemplate mongoTemplate;

    /**
     * 로그 목록 조회 (페이징)
     */
    public Page<WebhookLogResponse> getLogs(String endpointId, String lastSeenId, int page, int size, String sort) {
        if (page < 0 || size <= 0 || size > 100) {
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        Direction direction = "asc".equalsIgnoreCase(sort)
                ? Direction.ASC
                : Direction.DESC;

        PageRequest pageRequest = PageRequest.of(page,
                size, Sort.by(direction, "receivedAt").and(Sort.by(direction, "logId")));

        Page<WebhookLog> logPage;
        if (lastSeenId != null && !lastSeenId.isEmpty()) {
            // 커서 기반 조회 시 페이지는 0으로 고정
            pageRequest = PageRequest.of(0, size, Sort.by(direction, "receivedAt").and(Sort.by(direction, "logId")));

            WebhookLog lastLog = webhookLogRepository.findByLogId(lastSeenId).orElse(null);
            if (lastLog != null) {
                if (!lastLog.getEndpointId().equals(endpointId)) {
                    throw new CustomException(ErrorCode.INVALID_REQUEST);
                }
                if (direction == Direction.ASC) {
                    logPage = webhookLogRepository.findNextPage(
                            endpointId, lastLog.getReceivedAt(), lastLog.getLogId(), pageRequest);
                } else {
                    logPage = webhookLogRepository.findPreviousPage(
                            endpointId, lastLog.getReceivedAt(), lastLog.getLogId(), pageRequest);
                }
            } else {
                logPage = webhookLogRepository.findByEndpointId(endpointId, pageRequest);
            }
        } else {
            logPage = webhookLogRepository.findByEndpointId(endpointId, pageRequest);
        }

        return logPage.map(WebhookLogResponse::from);
    }

    /**
     * 로그 상세 조회
     */
    public WebhookLogDetailResponse getLogDetail(String endpointId, String logId) {
        WebhookLog log = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new CustomException(ErrorCode.LOG_NOT_FOUND));

        if (!log.getEndpointId().equals(endpointId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        return WebhookLogDetailResponse.from(log);
    }

    /**
     * 엔드포인트의 모든 로그 삭제
     */
    @CacheEvict(value = "endpoints", key = "#endpointId")
    @Transactional
    public void deleteAll(String endpointId) {
        endpointRepository.findByEndpointId(endpointId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENDPOINT_NOT_FOUND));

        webhookLogRepository.deleteAllByEndpointId(endpointId);
        Query query = Query.query(Criteria.where("endpointId").is(endpointId));
        Update update = new Update().set("logCount", 0).set("logSizeBytes", 0L);
        mongoTemplate.updateFirst(query, update, Endpoint.class);
    }

    /**
     * 로그 재전송 (Replay)
     */
    public void replayLog(String endpointId, String logId, String destinationUrl) {
        InetAddress resolvedIp = validateReplayDestination(destinationUrl);

        WebhookLog webhookLog = webhookLogRepository.findByLogId(logId)
                .orElseThrow(() -> new CustomException(ErrorCode.LOG_NOT_FOUND));

        if (!webhookLog.getEndpointId().equals(endpointId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected HttpURLConnection openConnection(URL url, java.net.Proxy proxy) throws java.io.IOException {
                URL pinnedUrl;
                try {
                    pinnedUrl = new URI(url.getProtocol(), url.getUserInfo(), resolvedIp.getHostAddress(), url.getPort(), url.getPath(), url.getQuery(), url.getRef()).toURL();
                } catch (URISyntaxException e) {
                    throw new java.io.IOException("Failed to construct URI for IP pinning", e);
                }
                HttpURLConnection connection = super.openConnection(pinnedUrl, proxy);
                if (connection instanceof HttpsURLConnection httpsConnection) {
                    String originalHost = url.getHost();
                    httpsConnection.setHostnameVerifier((hostname, session) -> {
                        try {
                            return HttpsURLConnection.getDefaultHostnameVerifier().verify(originalHost, session);
                        } catch (Exception e) {
                            log.error("HTTPS hostname verification failed for originalHost: {}", originalHost, e);
                            return false;
                        }
                    });

                    SSLSocketFactory defaultFactory = httpsConnection.getSSLSocketFactory();
                    httpsConnection.setSSLSocketFactory(new SSLSocketFactory() {
                        @Override
                        public String[] getDefaultCipherSuites() {
                            return defaultFactory.getDefaultCipherSuites();
                        }

                        @Override
                        public String[] getSupportedCipherSuites() {
                            return defaultFactory.getSupportedCipherSuites();
                        }

                        @Override
                        public Socket createSocket(Socket s, String host, int port, boolean autoClose)
                                throws java.io.IOException {
                            Socket socket = defaultFactory.createSocket(s, host, port, autoClose);
                            if (socket instanceof SSLSocket sslSocket) {
                                SSLParameters params = sslSocket.getSSLParameters();
                                params.setServerNames(Collections.singletonList(new SNIHostName(originalHost)));
                                sslSocket.setSSLParameters(params);
                            }
                            return socket;
                        }

                        @Override
                        public Socket createSocket(String host, int port) throws java.io.IOException {
                            return defaultFactory.createSocket(host, port);
                        }

                        @Override
                        public Socket createSocket(String host, int port, InetAddress localHost, int localPort)
                                throws java.io.IOException {
                            return defaultFactory.createSocket(host, port, localHost, localPort);
                        }

                        @Override
                        public Socket createSocket(InetAddress host, int port) throws java.io.IOException {
                            return defaultFactory.createSocket(host, port);
                        }

                        @Override
                        public Socket createSocket(InetAddress address, int port, InetAddress localAddress,
                                int localPort) throws java.io.IOException {
                            return defaultFactory.createSocket(address, port, localAddress, localPort);
                        }
                    });
                }
                return connection;
            }
        };
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        RestTemplate restTemplate = new RestTemplate(factory);

        HttpHeaders headers = new HttpHeaders();
        if (webhookLog.getHeaders() != null) {
            webhookLog.getHeaders().forEach(headers::add);
        }
        // 원래 Host 헤더는 충돌할 수 있으므로 제거 후 새로 주입
        headers.remove(HttpHeaders.HOST);
        try {
            URI destinationUri = new URI(destinationUrl);
            String host = destinationUri.getHost();
            int port = destinationUri.getPort();
            boolean isDefaultPort = port == -1
                    || ("http".equalsIgnoreCase(destinationUri.getScheme()) && port == 80)
                    || ("https".equalsIgnoreCase(destinationUri.getScheme()) && port == 443);
            headers.add(HttpHeaders.HOST, isDefaultPort ? host : host + ":" + port);
        } catch (URISyntaxException e) {
            log.error("Failed to parse destination URL for replay: {}", sanitizeUrlForLog(destinationUrl), e);
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }

        HttpEntity<Object> entity = new HttpEntity<>(webhookLog.getBody(), headers);

        try {
            restTemplate.exchange(
                    destinationUrl,
                    HttpMethod.valueOf(webhookLog.getMethod()),
                    entity,
                    String.class);
            log.info("Webhook replayed successfully: destinationUrl={}, endpointId={}, logId={}",
                    sanitizeUrlForLog(destinationUrl), endpointId, logId);

            Query query = Query.query(Criteria.where("logId").is(logId));
            Update update = new Update().set("replayStatus", "SUCCESS").unset("replayError");
            mongoTemplate.updateFirst(query, update, WebhookLog.class);

        } catch (Exception e) {
            log.warn("웹훅 재전송 실패: destinationUrl={}, logId={}", sanitizeUrlForLog(destinationUrl), logId, e);
            Query query = Query.query(Criteria.where("logId").is(logId));
            Update update = new Update().set("replayStatus", "FAILED").set("replayError", e.getMessage());
            mongoTemplate.updateFirst(query, update, WebhookLog.class);
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private InetAddress validateReplayDestination(String destinationUrl) {
        try {
            URI uri = new URI(destinationUrl);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new CustomException(ErrorCode.INVALID_REQUEST);
            }

            InetAddress inetAddress = InetAddress.getByName(uri.getHost());
            byte[] address = inetAddress.getAddress();
            boolean isIpv6Ula = address.length == 16 && (address[0] & (byte) 0xFE) == (byte) 0xFC;
            if (inetAddress.isAnyLocalAddress() ||
                    inetAddress.isLoopbackAddress() ||
                    inetAddress.isLinkLocalAddress() ||
                    inetAddress.isSiteLocalAddress() ||
                    inetAddress.isMulticastAddress() ||
                    isIpv6Ula) {
                throw new CustomException(ErrorCode.FORBIDDEN);
            }
            return inetAddress;
        } catch (URISyntaxException | UnknownHostException e) {
            log.error("Replay destination URL validation failed: {}", sanitizeUrlForLog(destinationUrl), e);
            throw new CustomException(ErrorCode.INVALID_REQUEST);
        }
    }

    private String sanitizeUrlForLog(String rawUrl) {
        try {
            URI uri = new URI(rawUrl);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme() + "://";
            String host = uri.getHost() == null ? "unknown-host" : uri.getHost();
            String port = uri.getPort() == -1 ? "" : ":" + uri.getPort();
            String path = uri.getPath() == null ? "" : uri.getPath();
            return scheme + host + port + path;
        } catch (Exception e) {
            return "invalid-url";
        }
    }
}
