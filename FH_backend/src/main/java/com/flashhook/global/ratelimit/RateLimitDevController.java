package com.flashhook.global.ratelimit;

import com.flashhook.global.util.IpExtractor;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개발 환경 전용 Rate Limit 제어 컨트롤러
 * 프로덕션에서는 활성화되지 않습니다.
 */
@RestController
@RequestMapping("/api/dev/rate-limit")
@RequiredArgsConstructor
@Profile({"local", "test"})
public class RateLimitDevController {

    private final RedisTemplate<String, String> redisTemplate;

    @DeleteMapping("/reset")
    public ResponseEntity<Void> resetRateLimit(HttpServletRequest request) {
        String clientIp = IpExtractor.extract(request);
        if (!"127.0.0.1".equals(clientIp) && !"0:0:0:0:0:0:0:1".equals(clientIp)) {
            return ResponseEntity.status(403).build();
        }
        // RateLimitFilter에서 사용하는 엔드포인트 생성 키 삭제
        redisTemplate.delete(RateLimitFilter.CREATE_LIMIT_PREFIX + clientIp);
        return ResponseEntity.ok().build();
    }
}
