package com.blooddonor.service;

import com.blooddonor.repository.AccountRepository;
import com.blooddonor.repository.DonorProfileRepository;
import com.blooddonor.repository.EmergencyRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AdminService {

    @Autowired
    private AccountRepository accountRepo;

    @Autowired
    private DonorProfileRepository donorRepo;  // ✅ FIXED NAME

    @Autowired
    private EmergencyRequestRepository emergencyRepo;

    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", accountRepo.count());

        // ✅ FIXED LINE
        stats.put("totalDonors", donorRepo.findByAvailableTrue().size());

        stats.put("totalEmergencies", emergencyRepo.count());

        // Count by blood group
        Map<String, Integer> bloodGroupStats = new HashMap<>();

        donorRepo.findAll().forEach(donor -> {
            String bg = donor.getBloodGroup();
            bloodGroupStats.put(bg, bloodGroupStats.getOrDefault(bg, 0) + 1);
        });

        stats.put("bloodGroupStats", bloodGroupStats);

        return stats;
    }
}