package com.blooddonor.controller;

import com.blooddonor.entity.EmergencyRequest;
import com.blooddonor.service.EmergencyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergencies")
public class EmergencyController {

    @Autowired
    private EmergencyService emergencyService;

    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody EmergencyRequest request) {
        try {
            EmergencyRequest created = emergencyService.createRequest(request);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public List<EmergencyRequest> getAllRequests() {
        return emergencyService.getAllRequests();
    }

    @GetMapping("/pending")
    public List<EmergencyRequest> getPendingRequests() {
        return emergencyService.getPendingRequests();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            EmergencyRequest updated = emergencyService.updateStatus(id, status);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
