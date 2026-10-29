package com.lifelink;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class ApiControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testPublicHospitalsEndpointAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/hospitals/public")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].hospitalCode").exists());
    }

    @Test
    void testPublicFundingCampaignsEndpointAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/funding/public/campaigns")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void testPublicReportsDashboardStatsEndpointAccessible() throws Exception {
        mockMvc.perform(get("/api/reports/dashboard-stats")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalCases").isNumber())
                .andExpect(jsonPath("$.data.registeredHospitals").isNumber());
    }

    @Test
    void testPublicLiveTransportTrackingAccessible() throws Exception {
        mockMvc.perform(get("/api/transports/public/track/TRP-2026-001")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.trackingNumber").value("TRP-2026-001"))
                .andExpect(jsonPath("$.data.status").value("GREEN_CORRIDOR_ACTIVE"));
    }

    @Test
    void testProtectedEndpointRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/notifications")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
