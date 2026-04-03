package com.blooddonor.repository;

import com.blooddonor.entity.EmergencyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmergencyRequestRepository extends JpaRepository<EmergencyRequest, Long> {
    List<EmergencyRequest> findByRequesterId(Long accountId);
    List<EmergencyRequest> findByStatus(String status);
}
