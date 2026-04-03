package com.blooddonor.service;

import com.blooddonor.entity.Account;
import com.blooddonor.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private AccountRepository accountRepository;

    public Account register(Account account) {
        if (accountRepository.findByUsername(account.getUsername()) != null) {
            throw new RuntimeException("Username already exists");
        }
        return accountRepository.save(account);
    }

    public Account login(String username, String password) {
        Account acc = accountRepository.findByUsername(username);
        if (acc != null && acc.getPassword().equals(password)) {
            return acc;
        }
        throw new RuntimeException("Invalid credentials");
    }
}
