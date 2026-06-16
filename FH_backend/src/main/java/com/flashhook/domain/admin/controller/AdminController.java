package com.flashhook.domain.admin.controller;

import com.flashhook.domain.admin.dto.AdminMetricsResponse;
import com.flashhook.domain.admin.dto.BlacklistRequest;
import com.flashhook.domain.admin.dto.SuspiciousEndpointDto;
import com.flashhook.domain.admin.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<Void> blacklistIp(@RequestBody BlacklistRequest request) {
        adminService.blacklistIp(request.getIp());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/blacklist/{ip}")
    public ResponseEntity<Void> removeBlacklistIp(@PathVariable String ip) {
        adminService.removeBlacklistIp(ip);
        return ResponseEntity.noContent().build();
    }
}
