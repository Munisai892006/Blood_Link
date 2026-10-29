package com.lifelink;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class LifeLinkApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring ApplicationContext starts successfully with dev H2 in MySQL mode
    }
}
