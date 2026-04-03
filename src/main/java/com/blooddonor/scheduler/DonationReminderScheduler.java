package com.blooddonor.scheduler;

import com.blooddonor.entity.DonorProfile;
import com.blooddonor.repository.DonorProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@EnableScheduling
public class DonationReminderScheduler {

    @Autowired
    private DonorProfileRepository donorRepository;

    // Run every day at midnight (cron format: second, minute, hour, day of month, month, day of week)
    @Scheduled(cron = "0 0 0 * * ?")
    public void sendDonationReminders() {
        System.out.println("Scheduler Triggered: Checking for donors who are eligible to donate again...");

        List<DonorProfile> allDonors = donorRepository.findAll();
        LocalDate today = LocalDate.now();

        for (DonorProfile donor : allDonors) {
            if (donor.getLastDonationDate() != null) {
                // Determine eligibility (90 days since last donation)
                LocalDate eligibilityDate = donor.getLastDonationDate().plusDays(90);
                
                if (today.isEqual(eligibilityDate) || today.isAfter(eligibilityDate)) {
                    // Logic to send Email or SMS to donor.getContactNumber()
                    System.out.println("REMINDER: Donor " + donor.getName() + " (Blood Group: " + donor.getBloodGroup() + 
                                       ") is eligible to donate again. Sending notification to: " + donor.getContactNumber());
                    
                    // Optional: automatically set them back to 'Available' if they aren't
                    if (!donor.isAvailable()) {
                        donor.setAvailable(true);
                        donorRepository.save(donor);
                    }
                }
            }
        }
    }
}
