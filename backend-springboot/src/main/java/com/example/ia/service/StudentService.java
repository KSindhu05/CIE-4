package com.example.ia.service;

import com.example.ia.entity.Student;
import com.example.ia.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {
    @Autowired
    StudentRepository studentRepository;

    @Autowired
    private com.example.ia.repository.SubjectRepository subjectRepository;

    @Autowired
    private com.example.ia.repository.UserRepository userRepository;

    @Autowired
    private com.example.ia.repository.FacultyAssignmentRequestRepository assignmentRequestRepository;

    public List<Student> getAllStudents(String department) {
        if (department != null && !department.equals("all")) {
            return studentRepository.findByDepartment(department);
        }
        return studentRepository.findAll();
    }

    public java.util.Optional<Student> getStudentByRegNo(String regNo) {
        return studentRepository.findByRegNoIgnoreCase(regNo);
    }

    public java.util.List<com.example.ia.payload.response.FacultyResponse> getFacultyForStudent(String username) {
        Student student = studentRepository.findByRegNoIgnoreCase(username).orElse(null);
        if (student == null)
            return java.util.List.of();

        String studentDept = student.getDepartment();
        String studentSection = (student.getSection() != null && !student.getSection().isEmpty())
                ? student.getSection().trim()
                : "";
        String studentSemester = student.getSemester() != null ? student.getSemester().toString() : "";

        // 1. Get all subjects for student's department and semester
        java.util.List<com.example.ia.entity.Subject> semesterSubjects = subjectRepository
                .findByDepartmentAndSemester(studentDept, student.getSemester());

        java.util.Set<String> semesterSubjectNames = semesterSubjects.stream()
                .map(s -> s.getName().replaceAll("(?i)\\s*[\\[\\(]?(Theory|Lab|T|L)[\\]\\)]?\\s*$", "").trim())
                .collect(java.util.stream.Collectors.toSet());

        // 2. Get home department faculty
        java.util.List<com.example.ia.entity.User> departmentFaculty = userRepository
                .findByRoleAndDepartment("FACULTY", studentDept);

        // 3. Also get cross-department faculty via approved assignment requests
        java.util.List<com.example.ia.entity.FacultyAssignmentRequest> approvedRequests = assignmentRequestRepository
                .findByTargetDepartmentAndStatus(studentDept, "APPROVED");

        java.util.Set<Long> existingIds = departmentFaculty.stream()
                .map(com.example.ia.entity.User::getId)
                .collect(java.util.stream.Collectors.toSet());
        java.util.List<com.example.ia.entity.User> allFaculty = new java.util.ArrayList<>(departmentFaculty);

        for (com.example.ia.entity.FacultyAssignmentRequest req : approvedRequests) {
            if (!existingIds.contains(req.getFacultyId())) {
                userRepository.findById(req.getFacultyId()).ifPresent(crossFaculty -> {
                    allFaculty.add(crossFaculty);
                    existingIds.add(crossFaculty.getId());
                });
            }
        }

        java.util.List<com.example.ia.payload.response.FacultyResponse> response = new java.util.ArrayList<>();

        for (com.example.ia.entity.User faculty : allFaculty) {
            boolean isHomeDept = studentDept.equals(faculty.getDepartment());

            // Collect all subjects this faculty teaches in the student's department
            java.util.Set<String> facultySubjectsInDept = new java.util.HashSet<>();
            java.util.Set<String> facultySectionsInDept = new java.util.HashSet<>();
            String facultySemester = null;

            if (isHomeDept) {
                // From User entity fields
                if (faculty.getSubjects() != null && !faculty.getSubjects().isBlank()) {
                    java.util.Arrays.stream(faculty.getSubjects().split(","))
                            .map(String::trim).filter(s -> !s.isEmpty())
                            .forEach(facultySubjectsInDept::add);
                }
                if (faculty.getSection() != null && !faculty.getSection().isBlank()) {
                    java.util.Arrays.stream(faculty.getSection().split(","))
                            .map(String::trim).filter(s -> !s.isEmpty())
                            .forEach(facultySectionsInDept::add);
                }
                facultySemester = faculty.getSemester();
            }

            // Also merge subjects/sections from approved assignment requests for this dept
            for (com.example.ia.entity.FacultyAssignmentRequest req : approvedRequests) {
                if (req.getFacultyId().equals(faculty.getId())) {
                    if (req.getSubjects() != null && !req.getSubjects().isBlank()) {
                        java.util.Arrays.stream(req.getSubjects().split(","))
                                .map(String::trim).filter(s -> !s.isEmpty())
                                .forEach(facultySubjectsInDept::add);
                    }
                    if (req.getSections() != null && !req.getSections().isBlank()) {
                        java.util.Arrays.stream(req.getSections().split(","))
                                .map(String::trim).filter(s -> !s.isEmpty())
                                .forEach(facultySectionsInDept::add);
                    }
                    if (req.getSemester() != null && !req.getSemester().isBlank()) {
                        facultySemester = req.getSemester();
                    }
                }
            }

            // Skip if no subjects at all
            if (facultySubjectsInDept.isEmpty())
                continue;

            // Check semester match
            if (facultySemester != null && !facultySemester.isBlank() && !studentSemester.isEmpty()) {
                java.util.List<String> semesters = java.util.Arrays.stream(facultySemester.split(","))
                        .map(String::trim).filter(s -> !s.isEmpty())
                        .collect(java.util.stream.Collectors.toList());
                if (!semesters.contains(studentSemester)) {
                    continue;
                }
            }

            // Check section match
            if (!facultySectionsInDept.isEmpty() && !studentSection.isEmpty()) {
                if (!facultySectionsInDept.contains(studentSection)) {
                    continue;
                }
            }

            // Match subjects against student's semester subjects
            java.util.List<String> matchedSubjects = facultySubjectsInDept.stream()
                    .filter(s -> {
                        String baseName = s.replaceAll("(?i)\\s*[\\[\\(]?(Theory|Lab|T|L)[\\]\\)]?\\s*$", "").trim();
                        return semesterSubjectNames.contains(baseName);
                    })
                    .map(s -> s.replaceAll("(?i)\\s*[\\[\\(]?(Theory|Lab|T|L)[\\]\\)]?\\s*$", "").trim())
                    .distinct()
                    .collect(java.util.stream.Collectors.toList());

            if (!matchedSubjects.isEmpty()) {
                String subjectsDisplay = String.join(", ", matchedSubjects);
                response.add(new com.example.ia.payload.response.FacultyResponse(
                        faculty.getFullName(),
                        faculty.getDepartment(),
                        subjectsDisplay,
                        faculty.getEmail()));
            }
        }

        return response;
    }

    public java.util.List<com.example.ia.entity.Subject> getSubjectsForStudent(String username) {
        return studentRepository.findByRegNoIgnoreCase(username)
                .map(student -> subjectRepository.findByDepartmentAndSemester(student.getDepartment(),
                        student.getSemester()))
                .orElse(java.util.List.of());
    }

    @Autowired
    private com.example.ia.repository.CieMarkRepository cieMarkRepository;

    public List<com.example.ia.payload.response.StudentResponse> getStudentsWithAnalytics(String department) {
        List<Student> students;
        if (department != null && !department.equals("all")) {
            students = studentRepository.findByDepartment(department);
        } else {
            students = studentRepository.findAll();
        }

        return students.stream().map(student -> {
            List<com.example.ia.entity.CieMark> marksList = cieMarkRepository.findByStudent_Id(student.getId());
            java.util.Map<String, Double> marksMap = new java.util.HashMap<>();

            for (com.example.ia.entity.CieMark mark : marksList) {
                // Determine key based on cieType (e.g., CIE1, CIE2)
                String key = mark.getCieType().toLowerCase().replace(" ", "");
                marksMap.put(key, mark.getMarks());
            }

            return new com.example.ia.payload.response.StudentResponse(student, marksMap);
        }).collect(java.util.stream.Collectors.toList());
    }
}
