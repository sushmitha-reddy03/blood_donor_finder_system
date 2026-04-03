package com.blooddonor.service;

import com.blooddonor.entity.EmergencyRequest;
import com.blooddonor.repository.EmergencyRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EmergencyService {

    @Autowired
    private EmergencyRequestRepository requestRepository;

    // 🔥 ADD THIS
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // ✅ Create request + SEND NOTIFICATION
    public EmergencyRequest createRequest(EmergencyRequest request) {
        request.setRequestTime(LocalDateTime.now());
        request.setStatus("PENDING");

        EmergencyRequest saved = requestRepository.save(request);

        // 🔔 SEND REAL-TIME NOTIFICATION
        messagingTemplate.convertAndSend("/topic/emergency", saved);

        return saved;
    }

    public List<EmergencyRequest> getAllRequests() {
        return requestRepository.findAll();
    }

    public List<EmergencyRequest> getPendingRequests() {
        return requestRepository.findByStatus("PENDING");
    }

    public EmergencyRequest updateStatus(Long id, String status) {
        EmergencyRequest req = requestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        req.setStatus(status);
        return requestRepository.save(req);
    }
}