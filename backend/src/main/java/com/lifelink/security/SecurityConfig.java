package com.lifelink.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/*.html",
                                "/css/**",
                                "/js/**",
                                "/assets/**",
                                "/favicon.ico",
                                "/error",
                                "/h2-console/**",
                                "/api/health",
                                "/api/auth/**",
                                "/api/reports/**",
                                "/api/lifelink/reports/**",
                                "/api/hospitals/public/**",
                                "/api/lifelink/hospitals/public/**",
                                "/api/funding/public/**",
                                "/api/lifelink/funding/public/**",
                                "/api/funding/receipts/verify/**",
                                "/api/lifelink/funding/receipts/verify/**",
                                "/api/transports/public/**",
                                "/api/lifelink/transports/public/**"
                        ).permitAll()
                        // Public Spatial Map Data
                        .requestMatchers(HttpMethod.GET, "/api/map", "/api/map/**").permitAll()
                        // Public Mission Control Analytics
                        .requestMatchers(HttpMethod.GET, "/api/analytics/mission-control").permitAll()
                        // Public Blood Emergency Requests Query & Submission
                        .requestMatchers(HttpMethod.GET, "/api/requests").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/requests/public-submit").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/requests/track-public").permitAll()
                        // Public Donor Certificate & Contribution Receipt Verification
                        .requestMatchers(HttpMethod.GET, "/api/donors/certificates/verify/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/payments/verify/**", "/api/payments/receipts/verify/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/payments/create-order", "/api/payments/verify-payment").permitAll()
                        // LifeLink CRUD Endpoints (Both canonical and /api/lifelink aliases)
                        .requestMatchers(HttpMethod.GET, "/api/hospitals/**", "/api/lifelink/hospitals/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/hospitals/**", "/api/lifelink/hospitals/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/hospitals/**", "/api/lifelink/hospitals/**").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/hospitals/**", "/api/lifelink/hospitals/**").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/hospitals/**", "/api/lifelink/hospitals/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/funding/**", "/api/lifelink/funding/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/funding/**", "/api/lifelink/funding/**").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/funding/**", "/api/lifelink/funding/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/transports/**", "/api/lifelink/transports/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/transports/**", "/api/lifelink/transports/**").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/transports/**", "/api/lifelink/transports/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/cases/**", "/api/lifelink/cases/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/cases/**", "/api/lifelink/cases/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/cases/**", "/api/lifelink/cases/**").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/cases/**", "/api/lifelink/cases/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/funding/contribute", "/api/lifelink/funding/contribute").permitAll()
                        // Express-Proxied Operations (Express enforces authoritative JWT and RBAC checks)
                        .requestMatchers(
                                "/api/requests/**",
                                "/api/analytics/**",
                                "/api/donors", "/api/donors/**",
                                "/api/inventory", "/api/inventory/**",
                                "/api/transfers", "/api/transfers/**",
                                "/api/payments", "/api/payments/**",
                                "/api/notifications", "/api/notifications/**",
                                "/api/chat", "/api/chat/**",
                                "/api/platform-services", "/api/platform-services/**",
                                "/api/incidents", "/api/incidents/**",
                                "/api/simulations", "/api/simulations/**",
                                "/api/assistant", "/api/assistant/**",
                                "/api/organizations", "/api/organizations/**",
                                "/api/privacy", "/api/privacy/**",
                                "/api/gis", "/api/gis/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
