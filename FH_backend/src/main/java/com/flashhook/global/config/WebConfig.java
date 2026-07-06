package com.flashhook.global.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import lombok.RequiredArgsConstructor;

/**
 * 웹 MVC 설정
 * CORS 허용 오리진: 로컬 개발환경 + 프로덕션 도메인
 */
@RequiredArgsConstructor
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class WebConfig {

    private final Environment environment;

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistrationBean() {
        List<String> origins = new ArrayList<>(List.of("https://flashhook.site", "https://www.flashhook.site"));

        if (environment.acceptsProfiles(Profiles.of("local", "default"))) {
            origins.add("http://localhost:5173");
            origins.add("http://127.0.0.1:5173");
        }

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Content-Type", "X-Admin-Token", "Accept", "Origin"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        CorsFilter corsFilter = new CorsFilter(source);
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(corsFilter);
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }
}
