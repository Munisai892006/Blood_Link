package com.lifelink.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Robust ErrorController ensuring:
 * 1. All /api/** and JSON requests ALWAYS return structured application/json (never HTML).
 * 2. Browser navigations to client-side SPA routes fallback to index.html.
 */
@RestController
public class CustomApiErrorController implements ErrorController {

    private String cachedIndexHtml = null;

    @RequestMapping("/error")
    public ResponseEntity<?> handleError(HttpServletRequest request) {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int statusCode = (statusObj != null) ? Integer.parseInt(statusObj.toString()) : HttpStatus.NOT_FOUND.value();

        Object messageObj = request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
        Object uriObj = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        String targetUri = (uriObj != null) ? uriObj.toString() : request.getRequestURI();

        String acceptHeader = request.getHeader("Accept");
        boolean isHtmlRequest = acceptHeader != null && acceptHeader.contains("text/html");
        boolean isApiRequest = targetUri != null && targetUri.startsWith("/api");

        // 1. Any API request MUST return application/json
        if (isApiRequest || !isHtmlRequest) {
            String errorMsg = (messageObj != null && !messageObj.toString().isBlank())
                    ? messageObj.toString()
                    : (statusCode == 404 ? "Endpoint not found: " + targetUri : "An error occurred");

            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("error", getErrorName(statusCode));
            body.put("message", errorMsg);
            body.put("status", statusCode);
            body.put("path", targetUri);

            return ResponseEntity.status(statusCode)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body);
        }

        // 2. SPA client-side route fallback for browser HTML navigation
        String indexContent = getIndexHtml();
        if (indexContent != null) {
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(indexContent);
        }

        // Fallback plain JSON if index.html cannot be read
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("success", false);
        fallback.put("status", statusCode);
        fallback.put("message", "Page not found");
        return ResponseEntity.status(statusCode).contentType(MediaType.APPLICATION_JSON).body(fallback);
    }

    private String getErrorName(int statusCode) {
        try {
            return HttpStatus.valueOf(statusCode).getReasonPhrase();
        } catch (Exception e) {
            return "ERROR_" + statusCode;
        }
    }

    private synchronized String getIndexHtml() {
        if (cachedIndexHtml != null) return cachedIndexHtml;
        try {
            ClassPathResource res = new ClassPathResource("static/index.html");
            if (res.exists()) {
                try (InputStream in = res.getInputStream()) {
                    cachedIndexHtml = StreamUtils.copyToString(in, StandardCharsets.UTF_8);
                    return cachedIndexHtml;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }
}
