package com.example.ia.controller;

import com.example.ia.entity.FacultyAssignmentRequest;
import com.example.ia.entity.User;
import com.example.ia.repository.FacultyAssignmentRequestRepository;
import com.example.ia.repository.StudentRepository;
import com.example.ia.repository.SubjectRepository;
import com.example.ia.repository.UserRepository;
import com.example.ia.repository.AttendanceRepository;
import com.example.ia.repository.NotificationRepository;
import com.example.ia.repository.CieMarkRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/hod")
public class HodController {
    @Autowired
    UserRepository userRepository;

    @Autowired
    StudentRepository studentRepository;

    @Autowired
    SubjectRepository subjectRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    CieMarkRepository cieMarkRepository;

    @Autowired
    AttendanceRepository attendanceRepository;

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    FacultyAssignmentRequestRepository assignmentRequestRepository;

    @GetMapping("/overview")
    @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')")
    public ResponseEntity<?> getOverview(@RequestParam String department) {
        List<com.example.ia.entity.Student> students = studentRepository.findByDepartment(department);
        List<com.example.ia.entity.Subject> subjects = subjectRepository.findByDepartment(department);
        long facultyCount = userRepository.countByRoleAndDepartment("FACULTY", department);

        // Collect all marks for all subjects in the department
        java.util.List<com.example.ia.entity.CieMark> allMarks = new java.util.ArrayList<>();
        for (com.example.ia.entity.Subject sub : subjects) {
            allMarks.addAll(cieMarkRepository.findBySubject_Id(sub.getId()));
        }

        // Filter out PENDING zero marks
        java.util.List<com.example.ia.entity.CieMark> validMarks = allMarks.stream()
                .filter(m -> m.getMarks() != null && !(m.getMarks() == 0 && "PENDING".equals(m.getStatus())))
                .collect(java.util.stream.Collectors.toList());

        // === 1. CIE Trend (average per CIE round across all subjects) ===
        Map<String, double[]> cieSums = new HashMap<>(); // {total, count}
        for (String cie : new String[] { "CIE1", "CIE2", "CIE3", "CIE4", "CIE5" }) {
            cieSums.put(cie, new double[] { 0, 0 });
        }
        for (com.example.ia.entity.CieMark m : validMarks) {
            String type = m.getCieType() != null ? m.getCieType().toUpperCase() : "";
            String target = null;
            if (cieSums.containsKey(type))
                target = type;
            else if (type.contains("1"))
                target = "CIE1";
            else if (type.contains("2"))
                target = "CIE2";
            else if (type.contains("3"))
                target = "CIE3";
            else if (type.contains("4"))
                target = "CIE4";
            else if (type.contains("5"))
                target = "CIE5";
            if (target != null) {
                cieSums.get(target)[0] += m.getMarks();
                cieSums.get(target)[1]++;
            }
        }
        Map<String, Object> cieTrend = new HashMap<>();
        for (String cie : new String[] { "CIE1", "CIE2", "CIE3", "CIE4", "CIE5" }) {
            double[] arr = cieSums.get(cie);
            cieTrend.put(cie, arr[1] > 0 ? Math.round((arr[0] / arr[1]) * 10.0) / 10.0 : 0);
        }

        // === 2. Grade Distribution ===
        int gradeA = 0, gradeB = 0, gradeC = 0, gradeD = 0, gradeF = 0;
        for (com.example.ia.entity.CieMark m : validMarks) {
            double percent = (m.getMarks() / 50.0) * 100;
            if (percent >= 80)
                gradeA++;
            else if (percent >= 60)
                gradeB++;
            else if (percent >= 40)
                gradeC++;
            else if (percent >= 20)
                gradeD++;
            else
                gradeF++;
        }
        Map<String, Object> gradeDistribution = new HashMap<>();
        gradeDistribution.put("labels",
                new String[] { "A (80%+)", "B (60-79%)", "C (40-59%)", "D (20-39%)", "F (<20%)" });
        gradeDistribution.put("data", new int[] { gradeA, gradeB, gradeC, gradeD, gradeF });

        // === 3. Subject-wise Performance with CIE breakdown ===
        java.util.List<Map<String, Object>> subjectPerfList = new java.util.ArrayList<>();
        for (com.example.ia.entity.Subject sub : subjects) {
            java.util.List<com.example.ia.entity.CieMark> sMarks = validMarks.stream()
                    .filter(m -> m.getSubject() != null && m.getSubject().getId().equals(sub.getId()))
                    .collect(java.util.stream.Collectors.toList());

            // Per-CIE averages
            Map<String, Object> averages = new HashMap<>();
            double grandTotal = 0;
            int grandCount = 0;
            int passCount = 0;
            int totalCount = 0;

            for (String cie : new String[] { "CIE1", "CIE2", "CIE3", "CIE4", "CIE5" }) {
                final String cieKey = cie;
                java.util.List<com.example.ia.entity.CieMark> cieMarks = sMarks.stream()
                        .filter(m -> {
                            String t = m.getCieType() != null ? m.getCieType().toUpperCase() : "";
                            return t.equals(cieKey) || (t.contains(cieKey.substring(3)));
                        })
                        .collect(java.util.stream.Collectors.toList());
                double cieTotal = cieMarks.stream().mapToDouble(m -> m.getMarks()).sum();
                int cieCount = cieMarks.size();
                double cieAvg = cieCount > 0 ? Math.round((cieTotal / cieCount) * 10.0) / 10.0 : 0;
                averages.put(cie, cieAvg);
                if (cieAvg > 0) {
                    grandTotal += cieAvg;
                    grandCount++;
                }

                for (com.example.ia.entity.CieMark cm : cieMarks) {
                    totalCount++;
                    if (cm.getMarks() >= 20)
                        passCount++;
                }
            }

            double overall = grandCount > 0 ? Math.round((grandTotal / grandCount) * 10.0) / 10.0 : 0;
            double passRate = totalCount > 0 ? Math.round((passCount * 100.0 / totalCount) * 10.0) / 10.0 : 0;

            Map<String, Object> item = new HashMap<>();
            item.put("id", sub.getId());
            item.put("name", sub.getName());
            item.put("averages", averages);
            item.put("overall", overall);
            item.put("passRate", Math.min(100, passRate));
            subjectPerfList.add(item);
        }

        // === 4. At-risk students (avg marks < 20) ===
        Map<Long, java.util.List<Double>> studentMarksMap = new HashMap<>();
        Map<Long, com.example.ia.entity.Student> studentObjMap = new HashMap<>();
        for (com.example.ia.entity.CieMark m : validMarks) {
            if (m.getStudent() != null) {
                Long sid = m.getStudent().getId();
                studentMarksMap.computeIfAbsent(sid, k -> new java.util.ArrayList<>()).add(m.getMarks());
                studentObjMap.putIfAbsent(sid, m.getStudent());
            }
        }
        java.util.List<Map<String, Object>> atRiskStudentsList = new java.util.ArrayList<>();
        for (Map.Entry<Long, java.util.List<Double>> entry : studentMarksMap.entrySet()) {
            double avg = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0);
            if (avg < 20) {
                com.example.ia.entity.Student s = studentObjMap.get(entry.getKey());
                if (s != null) {
                    Map<String, Object> risk = new HashMap<>();
                    risk.put("id", s.getId());
                    risk.put("rollNo", s.getRegNo());
                    risk.put("name", s.getName());
                    risk.put("avgMarks", Math.round(avg * 10.0) / 10.0);
                    risk.put("issue", avg < 10 ? "Critical - Very Low Marks" : "Below Pass Threshold");
                    atRiskStudentsList.add(risk);
                }
            }
        }

        // === 5. Alerts ===
        java.util.List<Map<String, Object>> alerts = new java.util.ArrayList<>();
        int alertId = 1;
        if (atRiskStudentsList.size() > 0) {
            Map<String, Object> alert = new HashMap<>();
            alert.put("id", alertId++);
            alert.put("type", "critical");
            alert.put("message", atRiskStudentsList.size() + " students are at risk with below-threshold marks");
            alert.put("date", java.time.LocalDate.now().toString());
            alerts.add(alert);
        }
        // Check for subjects with poor overall performance
        for (Map<String, Object> sp : subjectPerfList) {
            double overall = ((Number) sp.get("overall")).doubleValue();
            if (overall > 0 && overall < 25) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", alertId++);
                alert.put("type", "warning");
                alert.put("message", sp.get("name") + " has low class average (" + overall + "/50)");
                alert.put("date", java.time.LocalDate.now().toString());
                alerts.add(alert);
            }
        }
        // Pending submissions
        long pendingCount = allMarks.stream().filter(m -> "PENDING".equals(m.getStatus())).count();
        if (pendingCount > 0) {
            Map<String, Object> alert = new HashMap<>();
            alert.put("id", alertId++);
            alert.put("type", "info");
            alert.put("message", pendingCount + " mark entries are still pending review");
            alert.put("date", java.time.LocalDate.now().toString());
            alerts.add(alert);
        }
        if (alerts.isEmpty()) {
            Map<String, Object> alert = new HashMap<>();
            alert.put("id", 1);
            alert.put("type", "info");
            alert.put("message", "All department metrics are within acceptable range");
            alert.put("date", java.time.LocalDate.now().toString());
            alerts.add(alert);
        }

        // === Compute aggregate stats ===
        double deptAvg = 0;
        double deptPassRate = 0;
        int subjectsWithData = 0;
        for (Map<String, Object> sp : subjectPerfList) {
            double overall = ((Number) sp.get("overall")).doubleValue();
            double passRate = ((Number) sp.get("passRate")).doubleValue();
            if (overall > 0) {
                deptAvg += overall;
                deptPassRate += passRate;
                subjectsWithData++;
            }
        }
        if (subjectsWithData > 0) {
            deptAvg = Math.round((deptAvg / subjectsWithData) * 10.0) / 10.0;
            deptPassRate = Math.round((deptPassRate / subjectsWithData) * 10.0) / 10.0;
        }

        // === Build response ===
        Map<String, Object> data = new HashMap<>();
        data.put("totalStudents", students.size());
        data.put("facultyCount", facultyCount);
        data.put("cieTrend", cieTrend);
        data.put("subjectPerfList", subjectPerfList);
        data.put("gradeDistribution", gradeDistribution);
        data.put("alerts", alerts);
        data.put("atRiskStudents", atRiskStudentsList);
        data.put("deptAverage", deptAvg);
        data.put("passPercentage", Math.min(100, deptPassRate));
        data.put("atRiskCount", atRiskStudentsList.size());
        return ResponseEntity.ok(data);
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasRole('HOD') or hasRole('PRINCIPAL')")
    public List<Map<String, Object>> getFaculty(@RequestParam String department) {
        // Get all subject names belonging to this department
        List<com.example.ia.entity.Subject> deptSubjects = subjectRepository.findByDepartment(department);
        Set<String> deptSubjectNames = deptSubjects.stream()
                .map(com.example.ia.entity.Subject::getName)
                .collect(Collectors.toSet());

        // Get home-department faculty
        List<User> homeFaculty = userRepository.findByRoleAndDepartment("FACULTY", department);

        // Get cross-department faculty with APPROVED assignments
        List<FacultyAssignmentRequest> approved = assignmentRequestRepository
                .findByTargetDepartmentAndStatus(department, "APPROVED");

        // Merge unique faculty (avoid duplicates)
        Set<Long> existingIds = homeFaculty.stream().map(User::getId).collect(Collectors.toSet());
        List<User> merged = new ArrayList<>(homeFaculty);

        for (FacultyAssignmentRequest req : approved) {
            if (!existingIds.contains(req.getFacultyId())) {
                userRepository.findById(req.getFacultyId()).ifPresent(crossFaculty -> {
                    merged.add(crossFaculty);
                    existingIds.add(crossFaculty.getId());
                });
            }
        }

        // Filter each faculty's subjects to only include this department's subjects
        List<Map<String, Object>> result = new ArrayList<>();
        for (User fac : merged) {
            Map<String, Object> facMap = new HashMap<>();
            facMap.put("id", fac.getId());
            facMap.put("username", fac.getUsername());
            facMap.put("fullName", fac.getFullName());
            facMap.put("email", fac.getEmail());
            facMap.put("department", fac.getDepartment());
            facMap.put("designation", fac.getDesignation());
            facMap.put("semester", fac.getSemester());
            facMap.put("role", fac.getRole());
            facMap.put("cieRole", fac.getCieRole()); // THEORY, LAB, or null

            Set<String> thisDeptSections = new HashSet<>();
            if (department.equals(fac.getDepartment()) && fac.getSection() != null && !fac.getSection().isBlank()) {
                Arrays.stream(fac.getSection().split(",")).map(String::trim).filter(s -> !s.isEmpty())
                        .forEach(thisDeptSections::add);
            }

            Set<String> thisDeptSubjects = new HashSet<>();
            if (department.equals(fac.getDepartment()) && fac.getSubjects() != null && !fac.getSubjects().isBlank()) {
                Arrays.stream(fac.getSubjects().split(",")).map(String::trim)
                        .filter(s -> !s.isEmpty() && deptSubjectNames.contains(s)).forEach(thisDeptSubjects::add);
            }

            List<FacultyAssignmentRequest> facRequests = assignmentRequestRepository
                    .findByFacultyIdAndTargetDepartmentAndStatus(fac.getId(), department, "APPROVED");
            for (FacultyAssignmentRequest req : facRequests) {
                if (req.getSections() != null && !req.getSections().isBlank()) {
                    Arrays.stream(req.getSections().split(",")).map(String::trim).filter(s -> !s.isEmpty())
                            .forEach(thisDeptSections::add);
                }
                if (req.getSubjects() != null && !req.getSubjects().isBlank()) {
                    Arrays.stream(req.getSubjects().split(",")).map(String::trim)
                            .filter(s -> !s.isEmpty() && deptSubjectNames.contains(s)).forEach(thisDeptSubjects::add);
                }
            }

            String filteredSections = String.join(", ", thisDeptSections);
            facMap.put("section", filteredSections.isEmpty() ? null : filteredSections);

            String filteredSubjects = String.join(", ", thisDeptSubjects);
            facMap.put("subjects", filteredSubjects.isEmpty() ? null : filteredSubjects);

            result.add(facMap);
        }

        return result;
    }

    // ========== CROSS-DEPARTMENT ASSIGNMENT REQUEST MANAGEMENT ==========

    /**
     * HOD views pending assignment requests for their department.
     */
    @GetMapping("/assignment-requests")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<List<FacultyAssignmentRequest>> getAssignmentRequests(
            @RequestParam String department,
            @RequestParam(required = false, defaultValue = "PENDING") String status) {
        List<FacultyAssignmentRequest> requests;
        if ("ALL".equalsIgnoreCase(status)) {
            requests = assignmentRequestRepository.findByTargetDepartment(department);
        } else {
            requests = assignmentRequestRepository.findByTargetDepartmentAndStatus(department, status);
        }
        return ResponseEntity.ok(requests);
    }

    /**
     * HOD approves a cross-department assignment request.
     * This adds the requested subjects to the faculty user's subjects field
     * and updates instructorName in the Subject records.
     */
    @PutMapping("/assignment-requests/{id}/approve")
    @PreAuthorize("hasRole('HOD')")
    @Transactional
    public ResponseEntity<?> approveAssignmentRequest(@PathVariable Long id) {
        try {
            return assignmentRequestRepository.findById(id).map(request -> {
                if (!"PENDING".equals(request.getStatus())) {
                    return ResponseEntity.badRequest()
                            .<Object>body(Map.of("message", "Request is already " + request.getStatus()));
                }

                // Update request status
                request.setStatus("APPROVED");
                request.setResponseDate(LocalDateTime.now());
                assignmentRequestRepository.save(request);

                // Do NOT modify cross-department details in the User entity to prevent data
                // bleeding
                userRepository.findById(request.getFacultyId()).ifPresent(faculty -> {
                    String[] newSubjects = request.getSubjects().split(",");

                    // Update instructorName in Subject records for the TARGET department only
                    for (String subName : newSubjects) {
                        subjectRepository.findFirstByNameAndDepartment(subName.trim(), request.getTargetDepartment())
                                .ifPresent(subject -> {
                                    subject.setInstructorName(faculty.getFullName());
                                    subjectRepository.save(subject);
                                });
                    }
                });

                return ResponseEntity.ok(Map.of("message", "Assignment request approved successfully"));
            }).orElse(ResponseEntity.status(404).<Object>body(Map.of("message", "Assignment request not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error approving request: " + e.getMessage()));
        }
    }

    /**
     * HOD rejects a cross-department assignment request.
     */
    @PutMapping("/assignment-requests/{id}/reject")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> rejectAssignmentRequest(@PathVariable Long id) {
        try {
            return assignmentRequestRepository.findById(id).map(request -> {
                if (!"PENDING".equals(request.getStatus())) {
                    return ResponseEntity.badRequest()
                            .<Object>body(Map.of("message", "Request is already " + request.getStatus()));
                }

                request.setStatus("REJECTED");
                request.setResponseDate(LocalDateTime.now());
                assignmentRequestRepository.save(request);

                return ResponseEntity.ok(Map.of("message", "Assignment request rejected"));
            }).orElse(ResponseEntity.status(404).<Object>body(Map.of("message", "Assignment request not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error rejecting request: " + e.getMessage()));
        }
    }

    @PostMapping("/faculty")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> createFaculty(@RequestBody User facultyData) {
        if (userRepository.existsByUsername(facultyData.getUsername())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
        }
        User faculty = new User();
        faculty.setUsername(facultyData.getUsername());
        faculty.setFullName(facultyData.getFullName());
        faculty.setEmail(facultyData.getEmail());
        faculty.setDepartment(facultyData.getDepartment());
        faculty.setDesignation(facultyData.getDesignation());
        faculty.setSemester(facultyData.getSemester());
        faculty.setSection(facultyData.getSection());
        faculty.setSubjects(facultyData.getSubjects());
        faculty.setRole("FACULTY");
        faculty.setPassword(passwordEncoder.encode("password"));
        if (facultyData.getCieRole() != null)
            faculty.setCieRole(facultyData.getCieRole());
        userRepository.save(faculty);
        return ResponseEntity.ok(faculty);
    }

    @PutMapping("/faculty/{id}")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> updateFaculty(@PathVariable Long id, @RequestBody User facultyData) {
        return userRepository.findById(id).map(faculty -> {
            // Username change — only if provided and not taken by someone else
            if (facultyData.getUsername() != null && !facultyData.getUsername().isBlank()) {
                String newUsername = facultyData.getUsername().trim();
                if (!newUsername.equals(faculty.getUsername())) {
                    if (userRepository.existsByUsername(newUsername)) {
                        return ResponseEntity.badRequest()
                                .<Object>body(Map.of("message", "Username '" + newUsername + "' is already taken."));
                    }
                    faculty.setUsername(newUsername);
                }
            }
            if (facultyData.getFullName() != null)
                faculty.setFullName(facultyData.getFullName());
            if (facultyData.getEmail() != null)
                faculty.setEmail(facultyData.getEmail());
            if (facultyData.getDesignation() != null)
                faculty.setDesignation(facultyData.getDesignation());
            if (facultyData.getSemester() != null)
                faculty.setSemester(facultyData.getSemester());
            if (facultyData.getSection() != null)
                faculty.setSection(facultyData.getSection());
            if (facultyData.getSubjects() != null)
                faculty.setSubjects(facultyData.getSubjects());
            if (facultyData.getDepartment() != null)
                faculty.setDepartment(facultyData.getDepartment());
            // cieRole can be set to null (ALL) or THEORY/LAB — always update if field is
            // present
            // Use empty string to mean "clear" (set to null = ALL)
            if (facultyData.getCieRole() != null) {
                String role = facultyData.getCieRole().isBlank() ? null : facultyData.getCieRole();
                faculty.setCieRole(role);
            }
            userRepository.save(faculty);
            return ResponseEntity.ok(faculty);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/faculty/{id}")
    @PreAuthorize("hasRole('HOD')")
    @Transactional
    public ResponseEntity<?> deleteFaculty(@PathVariable Long id, @RequestParam String department) {
        return userRepository.findById(id).map(faculty -> {
            boolean isHomeDept = department.equals(faculty.getDepartment());

            // 1. Find subjects belonging to THIS department that the faculty teaches
            List<com.example.ia.entity.Subject> deptSubjects = subjectRepository.findByDepartment(department);
            Set<String> deptSubjectNames = deptSubjects.stream()
                    .map(com.example.ia.entity.Subject::getName)
                    .collect(Collectors.toSet());

            // 2. Remove only this dept's subjects from faculty.subjects
            if (faculty.getSubjects() != null && !faculty.getSubjects().isBlank()) {
                List<String> currentSubjects = Arrays.stream(faculty.getSubjects().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());

                List<String> remaining = currentSubjects.stream()
                        .filter(s -> !deptSubjectNames.contains(s))
                        .collect(Collectors.toList());

                faculty.setSubjects(remaining.isEmpty() ? null : String.join(", ", remaining));
            }

            // 3. Clear instructorName only on this dept's subjects taught by this faculty
            if (faculty.getFullName() != null) {
                for (com.example.ia.entity.Subject sub : deptSubjects) {
                    if (faculty.getFullName().equals(sub.getInstructorName())) {
                        sub.setInstructorName(null);
                    }
                }
                subjectRepository.saveAll(deptSubjects);
            }

            if (isHomeDept) {
                // Home dept removal: clear section, keep user alive
                faculty.setSection(null);
                faculty.setDepartment(null); // Unassign from home dept
            } else {
                // Cross-dept removal: delete the approved assignment request
                List<FacultyAssignmentRequest> requests = assignmentRequestRepository
                        .findByFacultyIdAndTargetDepartment(faculty.getId(), department);
                assignmentRequestRepository.deleteAll(requests);
            }

            userRepository.save(faculty);

            return ResponseEntity.ok(Map.of("message",
                    "Faculty removed from " + department + " department successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ========== STUDENT MANAGEMENT ==========

    @PostMapping("/students")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> createStudent(@RequestBody Map<String, String> data) {
        String regNo = data.get("regNo");
        String name = data.get("name");
        String department = data.get("department");
        String semester = data.getOrDefault("semester", "1");
        String section = data.getOrDefault("section", "A");
        String email = data.getOrDefault("email", "");
        String phone = data.getOrDefault("phone", "");
        String parentPhone = data.getOrDefault("parentPhone", "");
        String password = data.getOrDefault("password", "password123");

        if (regNo == null || regNo.isBlank() || name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reg No and Name are required"));
        }

        // Check for duplicate regNo in students table
        if (studentRepository.findByRegNo(regNo).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student with this Reg No already exists"));
        }

        // Check for duplicate username in users table
        if (userRepository.existsByUsername(regNo)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username (Reg No) already exists in users"));
        }

        try {
            // 1. Create User entity (for login)
            User studentUser = new User();
            studentUser.setUsername(regNo);
            studentUser.setFullName(name);
            studentUser.setEmail(email);
            studentUser.setDepartment(department);
            studentUser.setRole("STUDENT");
            studentUser.setSemester(semester);
            studentUser.setSection(section);
            studentUser.setPassword(passwordEncoder.encode(password));
            userRepository.save(studentUser);

            // 2. Create Student entity (for academic data)
            com.example.ia.entity.Student student = new com.example.ia.entity.Student();
            student.setRegNo(regNo);
            student.setName(name);
            student.setDepartment(department);
            student.setSemester(Integer.parseInt(semester));
            student.setSection(section);
            student.setEmail(email);
            student.setPhone(phone);
            student.setParentPhone(parentPhone);
            studentRepository.save(student);

            java.util.HashMap<String, Object> response = new java.util.HashMap<>();
            response.put("message", "Student created successfully");
            response.put("studentId", student.getId());
            response.put("userId", studentUser.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error creating student: " + e.getMessage()));
        }
    }

    @PutMapping("/students/{regNo}")
    @PreAuthorize("hasRole('HOD')")
    @Transactional
    public ResponseEntity<?> updateStudent(@PathVariable String regNo, @RequestBody Map<String, String> data) {
        return studentRepository.findByRegNo(regNo).map(student -> {
            // Find corresponding User
            User user = userRepository.findByUsernameIgnoreCase(regNo).orElse(null);

            if (data.containsKey("name")) {
                student.setName(data.get("name"));
                if (user != null)
                    user.setFullName(data.get("name"));
            }
            if (data.containsKey("email")) {
                student.setEmail(data.get("email"));
                if (user != null)
                    user.setEmail(data.get("email"));
            }
            if (data.containsKey("semester")) {
                student.setSemester(Integer.parseInt(data.get("semester")));
                if (user != null)
                    user.setSemester(data.get("semester"));
            }
            if (data.containsKey("section")) {
                student.setSection(data.get("section"));
                if (user != null)
                    user.setSection(data.get("section"));
            }
            if (data.containsKey("phone")) {
                student.setPhone(data.get("phone"));
            }
            if (data.containsKey("parentPhone")) {
                student.setParentPhone(data.get("parentPhone"));
            }

            studentRepository.save(student);
            if (user != null)
                userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Student updated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/students/{regNo}")
    @PreAuthorize("hasRole('HOD')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteStudent(@PathVariable String regNo) {
        // 1. Find Student Entity
        var studentOpt = studentRepository.findByRegNo(regNo);
        if (studentOpt.isPresent()) {
            com.example.ia.entity.Student student = studentOpt.get();
            // Delete dependent data for Student
            java.util.List<com.example.ia.entity.CieMark> marks = cieMarkRepository.findByStudent_Id(student.getId());
            if (!marks.isEmpty())
                cieMarkRepository.deleteAll(marks);

            java.util.List<com.example.ia.entity.Attendance> attendance = attendanceRepository
                    .findByStudentId(student.getId());
            if (!attendance.isEmpty())
                attendanceRepository.deleteAll(attendance);

            studentRepository.delete(student);
        }

        // 2. Find User Login
        var userOpt = userRepository.findByUsernameIgnoreCase(regNo);
        if (userOpt.isPresent()) {
            com.example.ia.entity.User user = userOpt.get();
            // Delete dependent data for User (Notifications)
            notificationRepository.deleteByUserId(user.getId());
            userRepository.delete(user);
        }

        if (studentOpt.isEmpty() && userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of("message", "Student deleted successfully"));
    }

    // ========== CREDENTIAL MANAGEMENT ==========

    @PutMapping("/credentials/reset")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> data) {
        String username = data.get("username");
        String newPassword = data.get("newPassword");

        if (username == null || newPassword == null || newPassword.length() < 4) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Username and a password (min 4 chars) are required"));
        }

        User targetUser = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.notFound().build();
        }

        // Only allow resetting for STUDENT or FACULTY roles
        if (!"STUDENT".equals(targetUser.getRole()) && !"FACULTY".equals(targetUser.getRole())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Can only reset credentials for students or faculty"));
        }

        targetUser.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(targetUser);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully for " + username));
    }

    @PostMapping("/students/upload")
    @PreAuthorize("hasRole('HOD')")
    public ResponseEntity<?> uploadStudents(@RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("department") String department) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please select a CSV file to upload."));
        }

        int successCount = 0;
        int skipCount = 0;
        List<String> errors = new java.util.ArrayList<>();

        try (java.io.Reader reader = new java.io.InputStreamReader(file.getInputStream());
                com.opencsv.CSVReader csvReader = new com.opencsv.CSVReader(reader)) {

            List<String[]> records = csvReader.readAll();

            // Expected Header: RegNo, Name, Semester, Section, Email, Phone, ParentPhone
            // We skip header if present (simple check: if first row contains "RegNo")
            int startIndex = 0;
            if (!records.isEmpty() && records.get(0).length > 0 &&
                    (records.get(0)[0].equalsIgnoreCase("RegNo") || records.get(0)[0].equalsIgnoreCase("RollNo"))) {
                startIndex = 1;
            }

            for (int i = startIndex; i < records.size(); i++) {
                String[] record = records.get(i);
                // Ensure record has enough columns (at least RegNo and Name)
                if (record.length < 2)
                    continue;

                String regNo = record[0].trim();
                String name = record[1].trim();

                if (regNo.isEmpty() || name.isEmpty()) {
                    errors.add("Row " + (i + 1) + ": Missing RegNo or Name");
                    continue;
                }

                // Optional fields
                String semester = "1";
                String section = "A";
                String email = "";
                String phone = "";
                String parentPhone = "";
                String password = regNo; // Default

                // Check for "Sem / Sec" format (Reg No, Student Name, Sem / Sec, Parent Phone,
                // [Password])
                // 4-5 columns: RegNo[0], Name[1], Sem/Sec[2], ParentPhone[3], [Password[4]]
                if (record.length <= 5 && record[0].matches(".*\\d.*")
                        && (record.length > 2 && (record[2].contains("/") || record[2].contains("-")))) {
                    // Heuristic: If 4-5 columns and col 2 contains "/" or "-", assume it's the
                    // specific format
                    if (record.length > 2) {
                        String semSec = record[2].trim(); // e.g., "2 / B" or "2 - B"
                        if (semSec.contains("/")) {
                            String[] parts = semSec.split("/");
                            if (parts.length > 0)
                                semester = parts[0].trim();
                            if (parts.length > 1)
                                section = parts[1].trim();
                        } else if (semSec.contains("-")) {
                            String[] parts = semSec.split("-");
                            if (parts.length > 0)
                                semester = parts[0].trim();
                            if (parts.length > 1)
                                section = parts[1].trim();
                        }
                    }
                    if (record.length > 3)
                        parentPhone = record[3].trim();
                    if (record.length > 4 && !record[4].trim().isEmpty())
                        password = record[4].trim();

                    // Generate missing fields
                    email = regNo.toLowerCase() + "@student.college.edu";
                } else {
                    // Standard Format: RegNo, Name, Semester, Section, Email, Phone, ParentPhone,
                    // [Password]
                    semester = record.length > 2 ? record[2].trim() : "1";
                    section = record.length > 3 ? record[3].trim() : "A";
                    email = record.length > 4 ? record[4].trim() : "";
                    phone = record.length > 5 ? record[5].trim() : "";
                    parentPhone = record.length > 6 ? record[6].trim() : "";
                    if (record.length > 7 && !record[7].trim().isEmpty())
                        password = record[7].trim();
                }

                // Check if already exists
                if (studentRepository.findByRegNo(regNo).isPresent() || userRepository.existsByUsername(regNo)) {
                    skipCount++;
                    continue;
                }

                try {
                    // 1. Create User
                    User studentUser = new User();
                    studentUser.setUsername(regNo);
                    studentUser.setFullName(name);
                    studentUser.setEmail(email.isEmpty() ? regNo + "@student.college.edu" : email);
                    studentUser.setDepartment(department);
                    studentUser.setRole("STUDENT");
                    studentUser.setSemester(semester);
                    studentUser.setSection(section);
                    studentUser.setPassword(passwordEncoder.encode(password));
                    userRepository.save(studentUser);

                    // 2. Create Student
                    com.example.ia.entity.Student student = new com.example.ia.entity.Student();
                    student.setRegNo(regNo);
                    student.setName(name);
                    student.setDepartment(department);
                    try {
                        student.setSemester(Integer.parseInt(semester));
                    } catch (NumberFormatException e) {
                        student.setSemester(1);
                    }
                    student.setSection(section);
                    student.setEmail(email);
                    student.setPhone(phone);
                    student.setParentPhone(parentPhone);
                    studentRepository.save(student);

                    successCount++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 1) + " (" + regNo + "): " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "File processed successfully");
            response.put("added", successCount);
            response.put("skipped", skipCount);
            response.put("errors", errors);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to parse CSV file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/students/bulk")
    @PreAuthorize("hasRole('HOD')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteStudentsBulk(@RequestBody List<String> regNos) {
        if (regNos == null || regNos.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No students selected"));
        }

        int deletedCount = 0;
        for (String regNo : regNos) {
            // 1. Find Student Entity
            var studentOpt = studentRepository.findByRegNo(regNo);
            if (studentOpt.isPresent()) {
                com.example.ia.entity.Student student = studentOpt.get();
                // Delete dependent data
                java.util.List<com.example.ia.entity.CieMark> marks = cieMarkRepository
                        .findByStudent_Id(student.getId());
                if (!marks.isEmpty())
                    cieMarkRepository.deleteAll(marks);

                java.util.List<com.example.ia.entity.Attendance> attendance = attendanceRepository
                        .findByStudentId(student.getId());
                if (!attendance.isEmpty())
                    attendanceRepository.deleteAll(attendance);

                studentRepository.delete(student);
            }

            // 2. Find User Login
            var userOpt = userRepository.findByUsernameIgnoreCase(regNo);
            if (userOpt.isPresent()) {
                com.example.ia.entity.User user = userOpt.get();
                notificationRepository.deleteByUserId(user.getId());
                userRepository.delete(user);
            }

            deletedCount++;
        }

        return ResponseEntity.ok(Map.of("message", "Deleted " + deletedCount + " students successfully"));
    }
}
