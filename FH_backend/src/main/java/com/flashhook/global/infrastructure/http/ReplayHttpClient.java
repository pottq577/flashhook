package com.flashhook.global.infrastructure.http;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.Proxy;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.UnknownHostException;
import java.util.Collections;
import java.util.Objects;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SNIHostName;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.flashhook.global.exception.ErrorCode;
import com.flashhook.global.exception.WebhookException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ReplayHttpClient {

    static {
        System.setProperty("sun.net.http.allowRestrictedHeaders", "true");
    }

    public void sendRequest(String destinationUrl, String method, HttpHeaders originalHeaders, String rawBody) {
        InetAddress resolvedIp = validateReplayDestination(destinationUrl);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            @NonNull
            protected HttpURLConnection openConnection(@NonNull URL url, @Nullable Proxy proxy)
                    throws IOException {
                URL pinnedUrl;
                try {
                    pinnedUrl = new URI(url.getProtocol(), url.getUserInfo(), resolvedIp.getHostAddress(),
                            url.getPort(), url.getPath(), url.getQuery(), url.getRef()).toURL();
                } catch (URISyntaxException e) {
                    throw new IOException("Failed to construct URI for IP pinning", e);
                }
                HttpURLConnection connection = super.openConnection(Objects.requireNonNull(pinnedUrl), proxy);
                connection.setInstanceFollowRedirects(false);
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
                                throws IOException {
                            Socket socket = defaultFactory.createSocket(s, host, port, autoClose);
                            if (socket instanceof SSLSocket sslSocket) {
                                SSLParameters params = sslSocket.getSSLParameters();
                                params.setServerNames(Collections.singletonList(new SNIHostName(originalHost)));
                                sslSocket.setSSLParameters(params);
                            }
                            return socket;
                        }

                        @Override
                        public Socket createSocket(String host, int port) throws IOException {
                            return defaultFactory.createSocket(host, port);
                        }

                        @Override
                        public Socket createSocket(String host, int port, InetAddress localHost, int localPort)
                                throws IOException {
                            return defaultFactory.createSocket(host, port, localHost, localPort);
                        }

                        @Override
                        public Socket createSocket(InetAddress host, int port) throws IOException {
                            return defaultFactory.createSocket(host, port);
                        }

                        @Override
                        public Socket createSocket(InetAddress address, int port, InetAddress localAddress,
                                int localPort) throws IOException {
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
        if (originalHeaders != null) {
            headers.putAll(originalHeaders);
        }
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
            throw new WebhookException(ErrorCode.INVALID_REQUEST);
        }

        HttpEntity<String> entity = new HttpEntity<>(rawBody, headers);

        try {
            var response = restTemplate.exchange(
                    Objects.requireNonNull(destinationUrl),
                    HttpMethod.valueOf(Objects.requireNonNull(method)),
                    entity,
                    String.class);

            if (response.getStatusCode().is3xxRedirection()) {
                log.warn("웹훅 재전송 리다이렉트 거부 (3xx): destinationUrl={}", sanitizeUrlForLog(destinationUrl));
                throw new WebhookException(ErrorCode.INVALID_REQUEST);
            }

            log.info("Webhook replayed successfully via ReplayHttpClient: destinationUrl={}",
                    sanitizeUrlForLog(destinationUrl));

        } catch (RestClientException e) {
            log.warn("웹훅 재전송 실패 via ReplayHttpClient: destinationUrl={}", sanitizeUrlForLog(destinationUrl), e);
            throw e;
        }
    }

    private InetAddress validateReplayDestination(String destinationUrl) {
        try {
            URI uri = new URI(destinationUrl);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                throw new WebhookException(ErrorCode.INVALID_REQUEST);
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
                throw new WebhookException(ErrorCode.FORBIDDEN);
            }
            return inetAddress;
        } catch (URISyntaxException | UnknownHostException | NullPointerException e) {
            log.error("Replay destination URL validation failed: {}", sanitizeUrlForLog(destinationUrl), e);
            throw new WebhookException(ErrorCode.INVALID_REQUEST);
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
        } catch (URISyntaxException e) {
            return "invalid-url";
        }
    }
}
