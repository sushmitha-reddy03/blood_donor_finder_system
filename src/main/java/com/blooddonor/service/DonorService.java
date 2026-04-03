package com.blooddonor.service;

import com.blooddonor.entity.DonorProfile;
import com.blooddonor.repository.DonorProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DonorService {

    @Autowired
    private DonorProfileRepository donorRepository;

    // ✅ Save Profile
    public DonorProfile saveProfile(DonorProfile donor) {
        return donorRepository.save(donor);
    }

    // ✅ Get Profile by Account ID
    public DonorProfile getProfileByAccountId(Long accountId) {
        return donorRepository.findByAccountId(accountId);
    }

    // ✅ Get Profile by Username
    public DonorProfile getProfileByUsername(String username) {
        return donorRepository.findByAccountUsername(username);
    }

    // ✅ Get ALL donors
    public List<DonorProfile> getAllDonors() {
        return donorRepository.findAll();
    }

    // ✅ Search AVAILABLE donors by blood group
    public List<DonorProfile> searchAvailableDonors(String bloodGroup) {
        return donorRepository.findByBloodGroupAndAvailableTrue(bloodGroup);
    }

    // ✅ 🔥 Search by LOCATION + BLOOD GROUP
    public List<DonorProfile> searchDonorsByLocation(String bloodGroup, String location) {
        return donorRepository
                .findByBloodGroupAndLocationContainingIgnoreCaseAndAvailableTrue(bloodGroup, location);
    }

    // ✅ Get ALL available donors
    public List<DonorProfile> getAvailableDonors() {
        return donorRepository.findByAvailableTrue();
    }

    // ✅ Update availability
    public DonorProfile updateAvailability(Long id, boolean available) {
        DonorProfile donor = donorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donor not found"));

        donor.setAvailable(available);
        return donorRepository.save(donor);
    }

    // ✅ Delete donor
    public void deleteDonor(Long id) {
        donorRepository.deleteById(id);
    }
}