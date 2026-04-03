package com.blooddonor.controller;

import com.blooddonor.entity.DonorProfile;
import com.blooddonor.service.DonorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donors")
public class DonorController {

    @Autowired
    private DonorService donorService;

    @GetMapping
    public List<DonorProfile> getAllDonors() {
        return donorService.getAllDonors();
    }

    @GetMapping("/search")
    public List<DonorProfile> searchDonors(@RequestParam String bloodGroup) {
        return donorService.searchAvailableDonors(bloodGroup);
    }

    @PostMapping("/profile")
    public ResponseEntity<?> createOrUpdateProfile(@RequestBody DonorProfile profile) {
        try {
            DonorProfile saved = donorService.saveProfile(profile);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<?> getProfileByAccountId(@PathVariable Long accountId) {
        DonorProfile profile = donorService.getProfileByAccountId(accountId);
        if (profile != null) {
            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/account/current")
    public ResponseEntity<?> getCurrentProfile() {
        org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        DonorProfile profile = donorService.getProfileByUsername(username); 
        if (profile != null) {
            return ResponseEntity.ok(profile);
        }
        return ResponseEntity.notFound().build();
    }
    @GetMapping("/search/location")
    public List<DonorProfile> searchByLocation(@RequestParam String bloodGroup,@RequestParam String location)
    {
    return donorService.searchDonorsByLocation(bloodGroup, location);
}
}
