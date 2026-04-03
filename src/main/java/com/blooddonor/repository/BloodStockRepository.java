package com.blooddonor.repository;

import com.blooddonor.entity.BloodStock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BloodStockRepository extends JpaRepository<BloodStock, Long> {
    Optional<BloodStock> findByBloodGroup(String bloodGroup);
}
