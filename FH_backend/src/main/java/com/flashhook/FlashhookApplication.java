package com.flashhook;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@EnableCaching
@SpringBootApplication
@ConfigurationPropertiesScan
public class FlashhookApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlashhookApplication.class, args);
    }

}
