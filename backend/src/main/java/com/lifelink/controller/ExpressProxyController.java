package com.lifelink.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Enumeration;
import java.util.Set;

/**
 * High-performance reverse proxy controller routing BloodLink Express requests
 * to the Node.js Express backend (port 5000) when the clinical desktop is accessed
 * directly via Spring Boot (http://localhost:8080/index.html).
 */
@RestController
public class ExpressProxyController {

    private final HttpClient httpClient;
    private final String expressBaseUrl;

    private static final Set<String> HOP_BY_HOP_HEADERS = Set.of(
            "host", "connection", "keep-alive", "transfer-encoding", "te", "upgrade", "content-length", "http2-settings"
    );

    public ExpressProxyController(@Value("${express.backend.url:http://localhost:5000}") String expressBaseUrl) {
        this.expressBaseUrl = expressBaseUrl;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @RequestMapping(value = {
            "/api/map",
            "/api/map/**",
            "/api/gis",
            "/api/gis/**",
            "/api/analytics",
            "/api/analytics/**",
            "/api/requests",
            "/api/requests/**",
            "/api/donors",
            "/api/donors/**",
            "/api/inventory",
            "/api/inventory/**",
            "/api/incidents",
            "/api/incidents/**",
            "/api/simulations",
            "/api/simulations/**",
            "/api/assistant",
            "/api/assistant/**",
            "/api/organizations",
            "/api/organizations/**",
            "/api/transfers",
            "/api/transfers/**",
            "/api/payments",
            "/api/payments/**",
            "/api/privacy",
            "/api/privacy/**",
            "/api/notifications",
            "/api/notifications/**",
            "/api/chat",
            "/api/chat/**",
            "/api/platform-services",
            "/api/platform-services/**",
            "/api/auth/profile",
            "/api/auth/profile/**",
            "/api/auth/profile-photo",
            "/api/auth/donor-profile",
            "/api/auth/verify-donor/**",
            "/api/auth/pending-donors",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/change-password",
            "/api/auth/mfa",
            "/api/auth/mfa/**",
            "/api/auth/verify-credential",
            "/api/auth/verify-credential/**"
    })
    public void proxyToExpress(HttpServletRequest request, HttpServletResponse response) {
        try {
            String uri = request.getRequestURI();
            String queryString = request.getQueryString();
            String targetUrl = expressBaseUrl + uri + (queryString != null && !queryString.isBlank() ? "?" + queryString : "");

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofSeconds(15));

            // Forward incoming headers (Authorization, Content-Type, Accept, etc.)
            Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames != null && headerNames.hasMoreElements()) {
                String headerName = headerNames.nextElement();
                if (!HOP_BY_HOP_HEADERS.contains(headerName.toLowerCase())) {
                    String headerVal = request.getHeader(headerName);
                    if (headerVal != null) {
                        try {
                            reqBuilder.header(headerName, headerVal);
                        } catch (Exception ignored) {}
                    }
                }
            }

            // Ensure Accept: application/json is present
            if (request.getHeader("Accept") == null) {
                reqBuilder.header("Accept", "application/json");
            }

            // Forward HTTP Method and Body
            String method = request.getMethod().toUpperCase();
            if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
                byte[] bodyBytes = request.getInputStream().readAllBytes();
                reqBuilder.method(method, HttpRequest.BodyPublishers.ofByteArray(bodyBytes));
            } else if ("DELETE".equals(method)) {
                reqBuilder.DELETE();
            } else {
                reqBuilder.GET();
            }

            HttpResponse<InputStream> resp = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofInputStream());

            response.setStatus(resp.statusCode());

            String contentType = resp.headers().firstValue("content-type").orElse("");
            if (contentType.toLowerCase().contains("text/html")) {
                byte[] htmlBytes = resp.body().readAllBytes();
                String htmlSnippet = new String(htmlBytes, java.nio.charset.StandardCharsets.UTF_8);
                String cleanMsg = htmlSnippet.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
                if (cleanMsg.length() > 200) cleanMsg = cleanMsg.substring(0, 200) + "...";
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                String safeJson = String.format("{\"success\":false,\"error\":\"UPSTREAM_NON_JSON\",\"status\":%d,\"message\":\"%s\"}",
                        resp.statusCode(),
                        cleanMsg.replace("\"", "\\\"").replace("\n", " ").replace("\r", ""));
                response.getOutputStream().write(safeJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                response.getOutputStream().flush();
                return;
            }

            // Copy response headers
            resp.headers().map().forEach((key, values) -> {
                if (key != null && !HOP_BY_HOP_HEADERS.contains(key.toLowerCase()) && !key.equalsIgnoreCase("content-length")) {
                    for (String val : values) {
                        response.addHeader(key, val);
                    }
                }
            });

            // Stream response body to client
            try (InputStream in = resp.body(); OutputStream out = response.getOutputStream()) {
                in.transferTo(out);
                out.flush();
            }
        } catch (Exception e) {
            try {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"EXPRESS_BACKEND_UNAVAILABLE\",\"message\":\"" + e.getMessage() + "\"}");
            } catch (Exception ignored) {}
        }
    }
}
