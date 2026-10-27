package com.lifelink.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifelink.dto.*;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Login successful");
        res.put("token", response.getToken());
        res.put("tokenType", response.getTokenType());
        res.put("user", response.getUser());
        res.put("data", response); // Dual compatibility
        return ResponseEntity.ok(res);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody String rawBody) {
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String roleStr = root.path("role").asText("");

            // If BloodLink role or contains blood-specific fields, forward to Express
            boolean isBloodLinkRole = roleStr.equals("DONOR") ||
                    roleStr.equals("HOSPITAL_REQUESTER") ||
                    roleStr.equals("HOSPITAL_ADMIN") ||
                    roleStr.equals("BLOOD_BANK_OPERATOR") ||
                    roleStr.equals("VERIFICATION_REVIEWER") ||
                    roleStr.equals("EMERGENCY_COORDINATOR") ||
                    roleStr.equals("VOLUNTEER") ||
                    roleStr.equals("FRAUD_REVIEWER") ||
                    roleStr.equals("SYSTEM_ADMIN") ||
                    roleStr.equals("INVENTORY_MANAGER") ||
                    roleStr.equals("DISPATCHER") ||
                    roleStr.equals("AUDITOR") ||
                    roleStr.equals("SUPER_ADMIN") ||
                    root.has("blood_group") ||
                    root.has("address_locality");

            if (isBloodLinkRole) {
                HttpRequest httpReq = HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:5000/api/auth/register"))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(10))
                        .POST(HttpRequest.BodyPublishers.ofString(rawBody))
                        .build();

                HttpResponse<String> resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
                JsonNode expNode = objectMapper.readTree(resp.body());
                if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("message", "Registration successful");
                    res.put("token", expNode.path("token").asText());
                    res.put("tokenType", "Bearer");
                    res.put("user", expNode.path("user"));
                    res.put("data", expNode);
                    return ResponseEntity.status(HttpStatus.CREATED).body(res);
                } else {
                    Map<String, Object> err = new HashMap<>();
                    err.put("success", false);
                    err.put("message", expNode.has("message") ? expNode.path("message").asText() : "Registration failed");
                    return ResponseEntity.status(resp.statusCode()).body(err);
                }
            }

            // Otherwise, process as LifeLink register
            RegisterRequest req = objectMapper.treeToValue(root, RegisterRequest.class);
            AuthResponse response = authService.register(req);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Registration successful");
            res.put("token", response.getToken());
            res.put("tokenType", response.getTokenType());
            res.put("user", response.getUser());
            res.put("data", response);
            return ResponseEntity.status(HttpStatus.CREATED).body(res);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Unauthorized");
            return ResponseEntity.status(401).body(err);
        }
        UserSummaryDto user = authService.getCurrentUser(principal.getUsername());
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", user);
        res.put("user", user);
        return ResponseEntity.ok(res);
    }
}
