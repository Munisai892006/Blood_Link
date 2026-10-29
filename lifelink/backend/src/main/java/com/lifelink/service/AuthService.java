package com.lifelink.service;

import com.lifelink.dto.*;
import com.lifelink.entity.Hospital;
import com.lifelink.entity.User;
import com.lifelink.exception.BadRequestException;
import com.lifelink.exception.ResourceNotFoundException;
import com.lifelink.repository.HospitalRepository;
import com.lifelink.repository.UserRepository;
import com.lifelink.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository,
                       HospitalRepository hospitalRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        java.util.Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                throw new BadRequestException("Invalid email or password");
            }

            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            String token = tokenProvider.generateTokenFromUser(user);
            return new AuthResponse(token, mapToSummary(user));
        }

        // Seamless fallback: Authenticate with BloodLink Express backend
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .version(java.net.http.HttpClient.Version.HTTP_1_1)
                    .connectTimeout(java.time.Duration.ofSeconds(5))
                    .build();
            String payload = String.format("{\"email\":\"%s\",\"password\":\"%s\"}",
                    email.replace("\"", "\\\""),
                    request.getPassword().replace("\"", "\\\""));
            java.net.http.HttpRequest httpReq = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("http://localhost:5000/api/auth/login"))
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            java.net.http.HttpResponse<String> resp = client.send(httpReq, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(resp.body());
                String token = root.path("token").asText();
                com.fasterxml.jackson.databind.JsonNode userNode = root.path("user");
                UserSummaryDto summary = new UserSummaryDto();
                summary.setId(userNode.path("id").asText());
                summary.setEmail(userNode.path("email").asText());
                summary.setFullName(userNode.has("full_name") ? userNode.path("full_name").asText() : userNode.path("fullName").asText());
                summary.setPhone(userNode.path("phone").asText());
                summary.setRole(userNode.path("role").asText());
                if (userNode.has("organization_name") && !userNode.path("organization_name").isNull()) {
                    summary.setOrganizationName(userNode.path("organization_name").asText());
                    summary.setHospitalName(userNode.path("organization_name").asText());
                }
                if (userNode.has("organization_id") && !userNode.path("organization_id").isNull()) {
                    summary.setOrganizationId(userNode.path("organization_id").asText());
                }
                if (userNode.has("avatar_url") && !userNode.path("avatar_url").isNull()) {
                    summary.setAvatarUrl(userNode.path("avatar_url").asText());
                }
                if (userNode.has("address_locality") && !userNode.path("address_locality").isNull()) {
                    summary.setAddressLocality(userNode.path("address_locality").asText());
                }
                if (userNode.has("donor_profile") && !userNode.path("donor_profile").isNull()) {
                    com.fasterxml.jackson.databind.JsonNode dp = userNode.path("donor_profile");
                    if (dp.has("blood_group")) summary.setBloodGroup(dp.path("blood_group").asText());
                }
                summary.setIsVerified(userNode.path("is_verified").asBoolean(true));
                return new AuthResponse(token, summary);
            }
        } catch (Exception ignored) {}

        throw new BadRequestException("Invalid email or password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered: " + email);
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone().trim());
        user.setRole(request.getRole());
        user.setHospitalId(request.getHospitalId());
        user.setDesignation(request.getDesignation());
        user.setMedicalLicenseNumber(request.getMedicalLicenseNumber());
        user.setIsVerified(true);
        user.setIsActive(true);

        User saved = userRepository.save(user);
        String token = tokenProvider.generateTokenFromUser(saved);
        return new AuthResponse(token, mapToSummary(saved));
    }

    public UserSummaryDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return mapToSummary(user);
    }

    public UserSummaryDto mapToSummary(User user) {
        UserSummaryDto dto = new UserSummaryDto();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setPhone(user.getPhone());
        dto.setRole(user.getRole());
        dto.setHospitalId(user.getHospitalId());
        dto.setDesignation(user.getDesignation());
        dto.setIsVerified(user.getIsVerified());

        if (user.getHospitalId() != null) {
            hospitalRepository.findById(user.getHospitalId())
                    .ifPresent(h -> {
                        dto.setHospitalName(h.getName());
                        dto.setOrganizationName(h.getName());
                    });
        }
        return dto;
    }
}
