package com.lifelink.controller;

import com.lifelink.dto.ApiResponse;
import com.lifelink.entity.Notification;
import com.lifelink.security.UserPrincipal;
import com.lifelink.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/lifelink/notifications", "/api/organ-notifications"})
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications(@AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        return ResponseEntity.ok(ApiResponse.ok(notificationService.getNotificationsForUser(userId)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<java.util.Map<String, Object>> getUnreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.ok(java.util.Map.of("unread_count", 0));
        }
        List<Notification> list = notificationService.getNotificationsForUser(principal.getId());
        long count = list.stream().filter(n -> n.getIsRead() == null || !n.getIsRead()).count();
        return ResponseEntity.ok(java.util.Map.of("unread_count", count));
    }

    @PostMapping("/mark-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@AuthenticationPrincipal UserPrincipal principal) {
        Long userId = (principal != null) ? principal.getId() : 1L;
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.ok("All marked as read", null));
    }
}
