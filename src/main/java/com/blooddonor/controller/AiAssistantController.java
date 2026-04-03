package com.blooddonor.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/chat")
public class AiAssistantController {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";

    private static final String SYSTEM_CONTEXT =
        "You are LifeDrop AI Assistant, an expert in blood donation. " +
        "You help users understand eligibility (must be 18+, 50kg+, 90-day gap between donations), " +
        "how to use the LifeDrop platform (register, find donors, request blood urgently). " +
        "Keep answers concise, friendly, and medically accurate. " +
        "Always encourage blood donation as a life-saving act.";

    @PostMapping("/ask")
    public ResponseEntity<?> askAssistant(@RequestBody Map<String, String> request) {
        String userQuery = request.get("message");

        if (userQuery == null || userQuery.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Please enter a message."));
        }

        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return ResponseEntity.ok(Map.of("reply", buildFallbackResponse(userQuery)));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Gemini API request body
            Map<String, Object> body = new HashMap<>();
            body.put("contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", SYSTEM_CONTEXT + "\n\nUser: " + userQuery)
                ))
            ));
            body.put("generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 300
            ));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                GEMINI_URL + geminiApiKey, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) response.getBody().get("candidates");

                if (candidates != null && !candidates.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    
                    if (parts != null && !parts.isEmpty()) {
                        String reply = (String) parts.get(0).get("text");
                        return ResponseEntity.ok(Map.of("reply", reply.trim()));
                    }
                }
            }
            throw new Exception("Incomplete response from Gemini API");

        } catch (Exception e) {
            System.err.println("Gemini AI API Error: " + e.getMessage());
            // Log 429 specifically if we can detect it
            if (e.getMessage().contains("429")) {
                System.err.println("AI Rate limited. Using enhanced local fallback.");
            }
            return ResponseEntity.ok(Map.of("reply", buildFallbackResponse(userQuery)));
        }
    }

    private String buildFallbackResponse(String query) {
        String q = query.toLowerCase();
        if (q.contains("eligib") || q.contains("donate") || q.contains("can i")) {
            return "To donate blood you must be: 18+ years old, weigh at least 50kg, and have a 90-day gap since your last donation. You should be in good health with no recent infections.";
        } else if (q.contains("blood group") || q.contains("type") || q.contains("compatible")) {
            return "Blood type compatibility: O- is the universal donor. AB+ is the universal recipient. Always use the same blood type when possible. Contact a medical professional for transfusion decisions.";
        } else if (q.contains("register") || q.contains("sign up") || q.contains("account")) {
            return "To register: click Register on the homepage, choose your role (Donor or User), and fill in your details. Once registered, login and complete your donor profile.";
        } else if (q.contains("find") || q.contains("search") || q.contains("donor")) {
            return "To find donors: login as a User, go to your dashboard, and use the 'Find Donors' section. Select a blood group to search for available donors near you.";
        } else if (q.contains("emergency") || q.contains("urgent") || q.contains("request")) {
            return "To request blood urgently: login and go to your dashboard. Fill out the 'Request Blood' form with patient details, blood group, and hospital name. Donors will be notified.";
        }
        return "I'm the LifeDrop AI Assistant powered by Google Gemini. I can help with: blood donation eligibility, finding donors, requesting blood in emergencies, and using the LifeDrop platform. What would you like to know?";
    }
}
