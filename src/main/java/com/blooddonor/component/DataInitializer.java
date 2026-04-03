package com.blooddonor.component;

import com.blooddonor.entity.Account;
import com.blooddonor.entity.BloodStock;
import com.blooddonor.repository.AccountRepository;
import com.blooddonor.repository.BloodStockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private BloodStockRepository bloodStockRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Initialize Default Admin
        if (accountRepository.findByUsername("admin") == null) {
            Account admin = new Account();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            accountRepository.save(admin);
            System.out.println("Default Admin created: admin / admin123");
        }

        // 2. Initialize Blood Stock if empty
        if (bloodStockRepository.count() == 0) {
            List<String> groups = Arrays.asList("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-");
            for (String bg : groups) {
                bloodStockRepository.save(new BloodStock(bg, 0));
            }
            System.out.println("Initialized Blood Stock levels for all groups.");
        }
    }
}
