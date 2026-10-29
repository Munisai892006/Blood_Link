package com.lifelink;

import com.lifelink.dto.AuthResponse;
import com.lifelink.dto.LoginRequest;
import com.lifelink.dto.RegisterRequest;
import com.lifelink.enums.Role;
import com.lifelink.exception.BadRequestException;
import com.lifelink.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Test
    void testLoginSuccessWithSeededCoordinator() {
        LoginRequest req = new LoginRequest();
        req.setEmail("coordinator@lifelink.org");
        req.setPassword("Password@123");

        AuthResponse res = authService.login(req);
        assertNotNull(res);
        assertNotNull(res.getToken());
        assertEquals("coordinator@lifelink.org", res.getUser().getEmail());
        assertEquals(Role.TRANSPLANT_COORDINATOR, res.getUser().getRole());
    }

    @Test
    void testLoginFailureWithInvalidPassword() {
        LoginRequest req = new LoginRequest();
        req.setEmail("coordinator@lifelink.org");
        req.setPassword("WrongPassword!");

        assertThrows(BadRequestException.class, () -> authService.login(req));
    }

    @Test
    void testRegisterNewUserSuccess() {
        String testEmail = "new.doctor." + System.currentTimeMillis() + "@lifelink.org";
        RegisterRequest req = new RegisterRequest();
        req.setEmail(testEmail);
        req.setPassword("DoctorPass@123");
        req.setFullName("Dr. Anita Roy");
        req.setPhone("+91 99887 76655");
        req.setRole(Role.HOSPITAL_ICU_DOCTOR);
        req.setDesignation("Assistant Professor, Critical Care");
        req.setMedicalLicenseNumber("TSMC-2026-9912");

        AuthResponse res = authService.register(req);
        assertNotNull(res);
        assertNotNull(res.getToken());
        assertEquals(testEmail, res.getUser().getEmail());
        assertEquals(Role.HOSPITAL_ICU_DOCTOR, res.getUser().getRole());
    }
}
