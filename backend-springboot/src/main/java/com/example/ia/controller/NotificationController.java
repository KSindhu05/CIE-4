package com.example.ia.controller;

import com.example.ia.entity.Notification;
import com.example.ia.entity.User;
import com.example.ia.repository.NotificationRepository;
import com.example.ia.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    UserRepository userRepository;

    @GetMapping("")
    @PreAuthorize("hasRole('STUDENT') or hasRole('FACULTY') or hasRole('HOD') or hasRole('PRINCIPAL')")
    public List<Notification> getMyNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null)
            return List.of();

        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @PostMapping("/broadcast")
    // @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')") // Bypass for now
    public ResponseEntity<?> broadcastNotification(@RequestBody Map<String, String> data) {
        String username = data.get("senderId");

        System.out.println("DEBUG: Broadcast request from user (via body): " + username);

        if (username == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sender ID missing"));
        }

        User sender = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (sender == null) {
            System.out.println("DEBUG: Sender not found in DB for username: " + username);
            return ResponseEntity.badRequest().body(Map.of("message", "Sender not found"));
        }

        String message = data.getOrDefault("message", "");
        String targetRole = data.getOrDefault("targetRole", "FACULTY");
        String targetDepartment = data.getOrDefault("department", null);
        boolean isPrincipal = "PRINCIPAL".equalsIgnoreCase(sender.getRole());

        List<User> targets;

        if (isPrincipal) {
            // Principal can target a specific department or ALL departments
            if (targetDepartment != null && !targetDepartment.isEmpty() && !"ALL".equalsIgnoreCase(targetDepartment)) {
                targets = userRepository.findByRoleAndDepartment(targetRole, targetDepartment);
                System.out.println("DEBUG: Principal broadcasting to " + targetRole + " in dept: " + targetDepartment);
            } else {
                targets = userRepository.findByRole(targetRole);
                System.out.println("DEBUG: Principal broadcasting to ALL " + targetRole + "s");
            }
        } else {
            // HOD broadcasts within their own department
            String department = sender.getDepartment();
            targets = userRepository.findByRoleAndDepartment(targetRole, department);
            System.out.println("DEBUG: HOD broadcasting to " + targetRole + " in dept: " + department);
        }

        String senderLabel = isPrincipal ? "Principal" : ("HOD - " + sender.getDepartment());

        for (User target : targets) {
            Notification notif = new Notification();
            notif.setUser(target);
            notif.setMessage(message);
            notif.setType("INFO");
            notif.setCategory(senderLabel);
            notificationRepository.save(notif);
        }

        // ✅ Save a "Sent" copy for the sender themselves
        Notification sentCopy = new Notification();
        sentCopy.setUser(sender);
        sentCopy.setMessage(message);
        sentCopy.setType("SENT");
        String scopeLabel = (targetDepartment != null && !targetDepartment.isEmpty()
                && !"ALL".equalsIgnoreCase(targetDepartment))
                        ? targetDepartment + " " + targetRole + "s"
                        : "All " + targetRole + "s";
        sentCopy.setCategory("📤 Sent to " + targets.size() + " " + scopeLabel);
        notificationRepository.save(sentCopy);

        System.out.println("DEBUG: Broadcast sent to " + targets.size() + " recipients.");
        return ResponseEntity.ok(Map.of("message", "Notification broadcast to " + targets.size() + " recipients"));
    }

    @DeleteMapping("/clear")
    @PreAuthorize("hasRole('STUDENT') or hasRole('FACULTY') or hasRole('HOD') or hasRole('PRINCIPAL')")
    public ResponseEntity<?> clearNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        notificationRepository.deleteByUserId(user.getId());

        return ResponseEntity.ok(Map.of("message", "Notifications cleared successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('FACULTY') or hasRole('HOD') or hasRole('PRINCIPAL')")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) {
            return ResponseEntity.notFound().build();
        }

        // Security check: Ensure user owns the notification
        if (!notification.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You can only delete your own notifications"));
        }

        notificationRepository.delete(notification);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("hasRole('STUDENT') or hasRole('FACULTY') or hasRole('HOD') or hasRole('PRINCIPAL')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) {
            return ResponseEntity.notFound().build();
        }

        if (!notification.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PostMapping("/student")
    @PreAuthorize("hasRole('FACULTY')")
    public ResponseEntity<?> sendStudentNotification(@RequestBody Map<String, String> data) {
        String studentRegNo = data.get("studentRegNo");
        String message = data.get("message");
        String facultyUsername = SecurityContextHolder.getContext().getAuthentication().getName();

        if (studentRegNo == null || message == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student regNo and message are required"));
        }

        User faculty = userRepository.findByUsernameIgnoreCase(facultyUsername).orElse(null);
        User student = userRepository.findByUsernameIgnoreCase(studentRegNo).orElse(null);

        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student user not found"));
        }

        Notification notif = new Notification();
        notif.setUser(student);
        notif.setMessage(message);
        notif.setType("ALERT");
        notif.setCategory("Faculty Feedback: " + (faculty != null ? faculty.getFullName() : "Faculty"));
        notificationRepository.save(notif);

        // ✅ Save a "Sent" copy for the faculty sender
        if (faculty != null) {
            Notification sentCopy = new Notification();
            sentCopy.setUser(faculty);
            sentCopy.setMessage(message);
            sentCopy.setType("SENT");
            sentCopy.setCategory("📤 Sent to Student: " + studentRegNo);
            notificationRepository.save(sentCopy);
        }

        return ResponseEntity.ok(Map.of("message", "Notification sent to student " + studentRegNo));
    }
}
