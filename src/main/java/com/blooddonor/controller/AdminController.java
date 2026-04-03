package com.blooddonor.controller;

import com.blooddonor.entity.Account;
import com.blooddonor.entity.BloodStock;
import com.blooddonor.repository.AccountRepository;
import com.blooddonor.repository.BloodStockRepository;
import com.blooddonor.repository.DonorProfileRepository;
import com.blooddonor.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AdminService adminService;
    
    @Autowired
    private AccountRepository accountRepo;
    
    @Autowired
    private BloodStockRepository bloodStockRepo;
    
    @Autowired
    private DonorProfileRepository donorRepo;

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return adminService.getSystemStats();
    }
    
    @GetMapping("/users")
    public List<Account> getAllUsers() {
        return accountRepo.findAll();
    }
    
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        accountRepo.deleteById(id);
        return ResponseEntity.ok("User deleted");
    }

    @DeleteMapping("/donors/{id}")
    public ResponseEntity<?> deleteDonor(@PathVariable Long id) {
        donorRepo.deleteById(id);
        return ResponseEntity.ok("Donor deleted");
    }

    @GetMapping("/inventory")
    public List<BloodStock> getInventory() {
        return bloodStockRepo.findAll();
    }
    
    @PostMapping("/inventory")
    public ResponseEntity<?> updateInventory(@RequestBody BloodStock requestInfo) {
        Optional<BloodStock> existingOpt = bloodStockRepo.findByBloodGroup(requestInfo.getBloodGroup());
        BloodStock stock;
        if (existingOpt.isPresent()) {
            stock = existingOpt.get();
            stock.setUnitsAvailable(requestInfo.getUnitsAvailable());
        } else {
            stock = new BloodStock(requestInfo.getBloodGroup(), requestInfo.getUnitsAvailable());
        }
        return ResponseEntity.ok(bloodStockRepo.save(stock));
    }
}
