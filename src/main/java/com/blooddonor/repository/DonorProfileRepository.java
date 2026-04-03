package com.blooddonor.repository;

import com.blooddonor.entity.DonorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DonorProfileRepository extends JpaRepository<DonorProfile, Long> {

    DonorProfile findByAccountId(Long accountId);

    List<DonorProfile> findByBloodGroupAndAvailableTrue(String bloodGroup);

    List<DonorProfile> findByBloodGroup(String bloodGroup);

    DonorProfile findByAccountUsername(String username);

    List<DonorProfile> findByAvailableTrue();

    // ✅ ADD THIS (for location search)
    List<DonorProfile> findByBloodGroupAndLocationContainingIgnoreCaseAndAvailableTrue(String bloodGroup, String location);
}