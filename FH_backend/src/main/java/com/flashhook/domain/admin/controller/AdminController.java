package com.flashhook.domain.admin.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.flashhook.domain.admin.dto.AdminMetricsResponse;
import com.flashhook.domain.admin.dto.BlacklistRequest;
import com.flashhook.domain.admin.dto.SuspiciousEndpointDto;
import com.flashhook.domain.admin.service.AdminService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/metrics")
    public ResponseEntity<AdminMetricsResponse> getMetrics() {
        return ResponseEntity.ok(adminService.getMetrics());
    }

    @GetMapping("/endpoints/suspicious")
    public ResponseEntity<List<SuspiciousEndpointDto>> getSuspiciousEndpoints() {
        return ResponseEntity.ok(adminService.getSuspiciousEndpoints());
    }

    @DeleteMapping("/endpoints/{endpointId}")
    public ResponseEntity<Void> deleteEndpoint(@PathVariable String endpointId) {
        adminService.deleteEndpoint(endpointId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/blacklist")
    public ResponseEntity<List<String>> getBlacklistedIps() {
        return ResponseEntity.ok(adminService.getBlacklistedIps());
    }

    @PostMapping("/blacklist")
    public ResponseEntity<Void> blacklistIp(@Valid @RequestBody BlacklistRequest request) {
        adminService.blacklistIp(request.ip());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/blacklist/{ip}")
    public ResponseEntity<Void> removeBlacklistIp(
            @PathVariable @Pattern(regexp = "^(?:\\d{1,3}\\.){3}\\d{1,3}$|^[0-9a-fA-F:]+$", message = "Invalid IP format") String ip) {
        adminService.removeBlacklistIp(ip);
        return ResponseEntity.noContent().build();
    }
}
