package com.flashhook.global.util;

import java.net.InetAddress;
import java.util.regex.Pattern;

public final class IpUtil {

    private static final String IPV4_REGEX = "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
    private static final String IPV6_REGEX = "^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|" +
            "^((?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4})*)?)::((?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4})*)?)$";

    private static final Pattern IPV4_PATTERN = Pattern.compile(IPV4_REGEX);
    private static final Pattern IPV6_PATTERN = Pattern.compile(IPV6_REGEX);

    private IpUtil() {
    }

    /**
     * IP 주소를 정규화합니다.
     * IPv6의 경우 동치 표기(canonical form)로 변환합니다.
     */
    public static String normalize(String ip) {
        if (ip == null || ip.isBlank()) {
            return "";
        }
        String trimmed = ip.trim();

        if (IPV6_PATTERN.matcher(trimmed).matches()) {
            try {
                return InetAddress.getByName(trimmed).getHostAddress();
            } catch (Exception e) {
                return trimmed;
            }
        }

        if (IPV4_PATTERN.matcher(trimmed).matches()) {
            try {
                return InetAddress.getByName(trimmed).getHostAddress();
            } catch (Exception e) {
                return trimmed;
            }
        }

        // 유효하지 않은 IP 형식일 경우 예외 발생
        throw new IllegalArgumentException("Invalid IP format: " + trimmed);
    }
}
