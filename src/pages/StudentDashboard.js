import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import RightSidebar from '../components/RightSidebar'; // Import RightSidebar
import API_BASE_URL from '../config/api';
import { LayoutDashboard, FileText, Calendar, Book, User, Download, Bell, TrendingUp, Award, Clock, CheckCircle, Mail, MapPin, ChevronDown, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSemesterStatus } from '../services/api';
import styles from './StudentDashboard.module.css';
import AcademicSummary from '../components/dashboard/student/AcademicSummary';
import AcademicInsights from '../components/dashboard/student/AcademicInsights';

const StudentDashboard = () => {
    const [activeSection, setActiveSection] = useState('Overview');
    const [toast, setToast] = useState({ show: false, message: '' });

    const { user } = useAuth(); // Get auth context

    // API State
    const [realMarks, setRealMarks] = useState([]);
    const [realSubjects, setRealSubjects] = useState([]);
    const [cieStatus, setCieStatus] = useState("0/3");

    // CIE & Notification State
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [facultyList, setFacultyList] = useState([]); // Added facultyList state
    const [semesterStatus, setSemesterStatus] = useState('ACTIVE');

    // Student Profile State
    const [studentInfo, setStudentInfo] = useState({
        name: 'Loading...',
        rollNo: user?.username || '...',
        branch: '...',
        semester: '...',
        cgpa: 0
    });

    React.useEffect(() => {
        const fetchMarks = async () => {
            try {
                if (!user || !user.token) return;
                const response = await fetch(`${API_BASE_URL}/marks/my-marks`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setRealMarks(data);

                    // Only count records that have actual marks (non-null, non-zero)
                    const recordsWithMarks = data.filter(m => m.totalScore != null && m.totalScore > 0);
                    const totalMarks = recordsWithMarks.reduce((sum, m) => sum + (m.totalScore || 0), 0);
                    const totalMaxMarks = recordsWithMarks.reduce((sum, m) => sum + (m.subject?.maxMarks || 50), 0);
                    let avgScore25 = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 25) : 0;

                    // Dynamic Calculation of Aggregate Percentage
                    const aggregatePercentage = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100).toFixed(1) : 0;


                    if (data.length > 0) {
                        const s = data[0].student;

                        // --- GLOBAL SYNC: Check for updates ---
                        const globalUpdates = JSON.parse(localStorage.getItem('global_student_updates') || '{}');
                        const updatedS = globalUpdates[s.id] || {};

                        setStudentInfo({
                            name: updatedS.name || s.name,
                            rollNo: updatedS.regNo || s.regNo, // regNo mapped to rollNo in state
                            branch: s.department,
                            semester: s.semester,
                            cgpa: aggregatePercentage,
                            avgCieScore: `${avgScore25}/25`,
                            parentPhone: updatedS.parentPhone || s.parentPhone
                        });
                        // Automatically set the filter to current semester
                        setSelectedSemester(s.semester.toString());
                    } else {
                        // No marks yet — fetch profile directly
                        try {
                            const profileRes = await fetch(`${API_BASE_URL}/student/profile`, {
                                headers: { 'Authorization': `Bearer ${user.token}` }
                            });
                            if (profileRes.ok) {
                                const s = await profileRes.json();
                                setStudentInfo({
                                    name: s.name || 'Student',
                                    rollNo: s.regNo || user?.username || '...',
                                    branch: s.department || '...',
                                    semester: s.semester || '...',
                                    cgpa: 0,
                                    avgCieScore: '0/25',
                                    parentPhone: s.parentPhone || ''
                                });
                                if (s.semester) setSelectedSemester(s.semester.toString());
                            }
                        } catch (profileErr) {
                            console.error("Failed to fetch student profile", profileErr);
                        }
                    }
                    // Only count CIE types that have actual marks (not null/zero)
                    const uniqueCIEs = new Set(data.filter(m => m.totalScore != null && m.totalScore > 0).map(m => m.cieType));
                    setCieStatus(`${uniqueCIEs.size}/5`);

                    const groupedMarks = {};
                    data.forEach(mark => {
                        if (!mark.subject) return;
                        const subId = mark.subject.id;
                        if (!groupedMarks[subId]) {
                            groupedMarks[subId] = { subject: mark.subject, cie1Score: null, cie2Score: null, cie3Score: null, cie4Score: null, cie5Score: null, cie1Att: null, cie2Att: null, cie3Att: null, cie4Att: null, cie5Att: null, attendancePercentage: null, archivedTotal: null, totalScore: 0, count: 0 };
                        }
                        if (mark.cieType === 'CIE1') groupedMarks[subId].cie1Score = mark.totalScore;
                        else if (mark.cieType === 'CIE2') groupedMarks[subId].cie2Score = mark.totalScore;
                        else if (mark.cieType === 'CIE3') groupedMarks[subId].cie3Score = mark.totalScore;
                        else if (mark.cieType === 'CIE4') groupedMarks[subId].cie4Score = mark.totalScore;
                        else if (mark.cieType === 'CIE5') groupedMarks[subId].cie5Score = mark.totalScore;
                        else if (mark.cieType === 'TOTAL') groupedMarks[subId].archivedTotal = mark.totalScore;

                        // Capture attendance from each CIE record
                        if (mark.cieType === 'CIE1' && mark.attendancePercentage != null) {
                            groupedMarks[subId].cie1Att = mark.attendancePercentage;
                            groupedMarks[subId].attendancePercentage = mark.attendancePercentage; // backward compat
                        }
                        if (mark.cieType === 'CIE2' && mark.attendancePercentage != null) groupedMarks[subId].cie2Att = mark.attendancePercentage;
                        if (mark.cieType === 'CIE3' && mark.attendancePercentage != null) groupedMarks[subId].cie3Att = mark.attendancePercentage;
                        if (mark.cieType === 'CIE4' && mark.attendancePercentage != null) groupedMarks[subId].cie4Att = mark.attendancePercentage;
                        if (mark.cieType === 'CIE5' && mark.attendancePercentage != null) groupedMarks[subId].cie5Att = mark.attendancePercentage;


                        groupedMarks[subId].count++;
                    });

                    Object.values(groupedMarks).forEach(item => {
                        let sum = item.archivedTotal || 0;
                        if (item.cie1Score != null) sum += item.cie1Score;
                        if (item.cie2Score != null) sum += item.cie2Score;
                        if (item.cie3Score != null) sum += item.cie3Score;
                        if (item.cie4Score != null) sum += item.cie4Score;
                        if (item.cie5Score != null) sum += item.cie5Score;
                        item.totalScore = sum;
                    });
                    setRealMarks(Object.values(groupedMarks));

                    const subjects = Object.values(groupedMarks).map(g => ({
                        id: g.subject.id,
                        name: g.subject.name,
                        code: g.subject.code,
                        cie1MaxMarks: g.subject.maxMarks,
                        cie2MaxMarks: g.subject.maxMarks,
                        cie3MaxMarks: g.subject.maxMarks,
                        cie4MaxMarks: g.subject.maxMarks,
                        cie5MaxMarks: g.subject.maxMarks,
                        totalMaxMarks: g.subject.maxMarks,
                        department: g.subject.department,
                        semester: g.subject.semester
                    }));
                    setRealSubjects(subjects);
                }
            } catch (error) {
                console.error("Failed to fetch marks", error);
            }
        };

        const loadSemesterStatus = async () => {
            const status = await fetchSemesterStatus();
            if (status) setSemesterStatus(status.status);
        };

        fetchMarks();
        loadSemesterStatus();

        const fetchUpdates = async () => {
            if (!user || !user.token) return;
            try {
                const annRes = await fetch(`${API_BASE_URL}/cie/student/announcements`, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (annRes.ok) {
                    const anns = await annRes.json();
                    setUpcomingExams(anns.map(a => ({
                        id: a.id, exam: `CIE-${a.cieNumber}`, subject: a.subject?.name || 'Subject', date: a.scheduledDate, time: a.startTime ? a.startTime.substring(0, 5) : 'TBD', duration: a.durationMinutes + ' mins', room: a.examRoom || 'TBD', instructions: a.instructions, syllabus: a.syllabusCoverage
                    })));
                }
                const notifRes = await fetch(`${API_BASE_URL}/cie/student/notifications`, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (notifRes.ok) {
                    const notifs = await notifRes.json();
                    const filteredNotifs = notifs.filter(n => !n.message.includes("Welcome to the IA Management System") && n.type !== 'EXAM_SCHEDULE');
                    setNotifications(filteredNotifs.map(n => ({
                        id: n.id,
                        message: n.message,
                        time: new Date(n.createdAt).toLocaleDateString(),
                        type: (n.type === 'CIE_ANNOUNCEMENT' || n.type === 'EXAM_SCHEDULE') ? 'info' : 'alert',
                        isRead: n.isRead
                    })));
                    setUnreadCount(filteredNotifs.filter(n => !n.isRead).length);
                } else { setNotifications([]); }
            } catch (e) { console.error("Error fetching updates:", e); setLoadingAnnouncements(false); } finally { setLoadingAnnouncements(false); }
            try {
                const facRes = await fetch(`${API_BASE_URL}/student/faculty`, { headers: { 'Authorization': `Bearer ${user.token}` } });
                if (facRes.ok) { const facData = await facRes.json(); setFacultyList(facData); }
            } catch (e) { console.error("Error fetching faculty:", e); }
        };
        fetchUpdates();
    }, [user]);

    const [selectedSemester, setSelectedSemester] = useState('5');
    const [selectedCIE, setSelectedCIE] = useState('All');

    const menuItems = [
        { label: 'Overview', path: '/dashboard/student', icon: <LayoutDashboard size={20} />, isActive: activeSection === 'Overview', onClick: () => setActiveSection('Overview') },
        { label: 'CIE Marks', path: '/dashboard/student', icon: <FileText size={20} />, isActive: activeSection === 'CIE Marks', onClick: () => setActiveSection('CIE Marks') },

        { label: 'Subjects', path: '/dashboard/student', icon: <Book size={20} />, isActive: activeSection === 'Subjects', onClick: () => setActiveSection('Subjects') },
        { label: 'Faculty', path: '/dashboard/student', icon: <User size={20} />, isActive: activeSection === 'Faculty', onClick: () => setActiveSection('Faculty') },
        { label: 'Syllabus Topics', path: '/dashboard/student', icon: <BookOpen size={20} />, isActive: activeSection === 'Syllabus Topics', onClick: () => setActiveSection('Syllabus Topics') },
        { label: 'Notifications', path: '/dashboard/student', icon: <Bell size={20} />, isActive: activeSection === 'Notifications', onClick: () => setActiveSection('Notifications') },
    ];

    const showToast = (message) => { setToast({ show: true, message }); setTimeout(() => setToast({ show: false, message: '' }), 3000); };
    const handleDownload = () => window.print();
    const getStatus = (marks, max) => {
        const percentage = (marks / max) * 100; // Fixed percentage calc
        if (percentage >= 90) return { label: 'Distinction', color: 'var(--success)', bg: 'rgba(22, 163, 74, 0.1)' };
        if (percentage >= 75) return { label: 'First Class', color: 'var(--secondary)', bg: 'rgba(59, 130, 246, 0.1)' };
        if (percentage >= 60) return { label: 'Second Class', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)' };
        return { label: 'At Risk', color: 'var(--danger)', bg: 'rgba(220, 38, 38, 0.1)' };
    };
    const getRemarks = (marks, max) => {
        const percentage = (marks / max) * 100;
        if (percentage >= 85) return "Excellent performance! Keep it up.";
        if (percentage >= 70) return "Good understanding. Focus on weak areas.";
        if (percentage >= 50) return "Average. Needs more consistent effort.";
        return "Critical: Please meet the faculty.";
    };

    // Typewriter Effect Logic
    const [typedText, setTypedText] = useState('');
    const welcomeMessage = `Welcome, ${studentInfo.name !== 'Loading...' ? studentInfo.name : 'Student'} 👋`;

    React.useEffect(() => {
        if (studentInfo.name === 'Loading...') return;
        let i = 0;
        setTypedText('');
        const typingInterval = setInterval(() => {
            if (i < welcomeMessage.length) {
                setTypedText(welcomeMessage.substring(0, i + 1));
                i++;
            } else {
                clearInterval(typingInterval);
            }
        }, 50); // Speed of typing
        return () => clearInterval(typingInterval);
    }, [studentInfo.name]);

    const renderOverview = () => (
        <div className={styles.detailsContainer}>
            <div className={styles.contentGrid}>
                {/* Current Semester Performance Table (replaces Performance Trend graph) */}
                <div className={styles.card} style={{ animationDelay: '0.2s' }}>
                    <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className={styles.cardTitle} style={{ margin: 0 }}>📑 Current Semester CIE Performance</h2>
                    </div>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead><tr><th>Subject</th><th>CIE-1</th><th>Att %</th><th>Total Progress</th><th style={{ background: '#fefce8', color: '#a16207' }}>Remarks</th></tr></thead>
                            <tbody>
                                {realSubjects.length > 0 ? realSubjects.map((sub, idx) => {
                                    const mark = realMarks.find(m => m.subject.id === sub.id) || {};
                                    const total = mark.cie1Score || 0;
                                    const maxMarks = 50;
                                    const status = getStatus(total, maxMarks);
                                    const progressWidth = Math.min((total / maxMarks) * 100, 100);

                                    return (
                                        <tr key={sub.id} style={{ animation: `fadeIn 0.4s ease-out ${idx * 0.1}s backwards` }}>
                                            <td><div className={styles.subjectCell}><span style={{ fontWeight: 600 }}>{sub.name}</span><br /><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.code}</span></div></td>
                                            <td>{mark.cie1Score != null ? mark.cie1Score : '-'}</td>
                                            <td>{mark.attendancePercentage != null ? mark.attendancePercentage + '%' : '-'}</td>
                                            <td style={{ minWidth: '150px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                                                    <span>{total} / {maxMarks}</span>
                                                    <span style={{ fontWeight: 600 }}>{Math.round(progressWidth)}%</span>
                                                </div>
                                                <div className={styles.progressContainer}>
                                                    <div className={styles.progressBar} style={{ width: `${progressWidth}%`, background: status.color }}></div>
                                                </div>
                                            </td>
                                            {(() => {
                                                const score = mark.cie1Score != null ? parseFloat(mark.cie1Score) : null;
                                                const att = mark.attendancePercentage != null ? parseFloat(mark.attendancePercentage) : null;
                                                if (score == null) return <td style={{ width: '250px', minWidth: '250px', padding: 0 }}><div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px 4px' }}>-</div></td>;
                                                let remark = ''; let color = '#64748b'; let bg = 'transparent';
                                                if (score < 25 && att != null && att < 75) { remark = 'CIE-1: Marks & Att Low - Meet HOD'; color = '#dc2626'; bg = '#fef2f2'; }
                                                else if (score < 25) { remark = 'CIE-1: Marks Low - Meet HOD'; color = '#ea580c'; bg = '#fff7ed'; }
                                                else if (att != null && att < 75) { remark = 'CIE-1: Att Low - Meet HOD'; color = '#ea580c'; bg = '#fff7ed'; }
                                                else if (score >= 40 && (att == null || att >= 75)) { remark = 'Excellent'; color = '#15803d'; bg = '#f0fdf4'; }
                                                else { remark = 'Good'; color = '#2563eb'; bg = '#eff6ff'; }
                                                return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: bg }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{remark}</div>
                                                </td>;
                                            })()}
                                        </tr>
                                    );
                                }) : <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>Loading real-time data...</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <AcademicInsights realMarks={realMarks} />
            </div>
        </div>
    );

    // ... (rest of render functions remain mostly same but can benefit from global CSS updates)

    const downloadCIEMarks = (subjects, filter) => {
        let headers = ['Code', 'Subject'];
        if (filter === 'All') {
            headers.push('CIE-1', 'CIE-2', 'Skill Test 1', 'Skill Test 2', 'Activities');
        } else {
            headers.push(filter);
        }
        headers.push('Total', 'Max Marks');

        const rows = subjects.map(item => {
            const row = [item.code, `"${item.subject}"`];
            if (filter === 'All') {
                row.push(item.cie1, item.cie2, item.cie3, item.cie4, item.cie5);
            } else if (filter === 'CIE-1') row.push(item.cie1);
            else if (filter === 'CIE-2') row.push(item.cie2);
            else if (filter === 'CIE-3') row.push(item.cie3);
            else if (filter === 'CIE-4') row.push(item.cie4);
            else if (filter === 'CIE-5') row.push(item.cie5);
            row.push(item.total, filter === 'All' ? 250 : 50);
            return row.join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CIE_Marks_${studentInfo.rollNo}_${filter === 'All' ? 'All_CIEs' : filter}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderCIEMarks = () => {
        const theorySubjects = [];
        // Check if any marks exist for the selected CIE across all subjects
        let hasDataForSelectedCIE = false;

        realSubjects.forEach(sub => {
            if (sub.semester && !sub.semester.toString().includes(selectedSemester)) return;
            const mark = realMarks.find(m => m.subject.id === sub.id) || {};

            // Check existence based on selection
            if (selectedCIE === 'All') {
                if (mark.cie1Score != null || mark.cie2Score != null || mark.cie3Score != null || mark.cie4Score != null || mark.cie5Score != null) hasDataForSelectedCIE = true;
            } else if (selectedCIE === 'CIE-1' && mark.cie1Score != null) hasDataForSelectedCIE = true;
            else if (selectedCIE === 'CIE-2' && mark.cie2Score != null) hasDataForSelectedCIE = true;
            else if (selectedCIE === 'CIE-3' && mark.cie3Score != null) hasDataForSelectedCIE = true;
            else if (selectedCIE === 'CIE-4' && mark.cie4Score != null) hasDataForSelectedCIE = true;
            else if (selectedCIE === 'CIE-5' && mark.cie5Score != null) hasDataForSelectedCIE = true;

            let total = selectedCIE === 'All' ? mark.totalScore || 0 :
                selectedCIE === 'CIE-1' ? mark.cie1Score || 0 :
                    selectedCIE === 'CIE-2' ? mark.cie2Score || 0 :
                        selectedCIE === 'CIE-3' ? mark.cie3Score || 0 :
                            selectedCIE === 'CIE-4' ? mark.cie4Score || 0 : mark.cie5Score || 0;

            // Format marks: if null, show '-'
            const fmt = (val) => val != null ? val : '-';

            theorySubjects.push({
                code: sub.code,
                subject: sub.name,
                cie1: fmt(mark.cie1Score),
                cie2: fmt(mark.cie2Score),
                cie3: fmt(mark.cie3Score),
                cie4: fmt(mark.cie4Score),
                cie5: fmt(mark.cie5Score),
                attendance: mark.attendancePercentage != null ? mark.attendancePercentage : '-',
                cie1Att: mark.cie1Att != null ? mark.cie1Att : '-',
                cie2Att: mark.cie2Att != null ? mark.cie2Att : '-',
                cie3Att: mark.cie3Att != null ? mark.cie3Att : '-',
                cie4Att: mark.cie4Att != null ? mark.cie4Att : '-',
                cie5Att: mark.cie5Att != null ? mark.cie5Att : '-',
                total
            });
        });

        const isRestricted = (Number(selectedSemester) < Number(studentInfo.semester)) ||
            (semesterStatus === 'COMPLETED' && Number(selectedSemester) === Number(studentInfo.semester));

        return (
            <div className={styles.detailsContainer}>
                {isRestricted && (
                    <div className={styles.card} style={{ marginBottom: '1rem', background: '#fefce8', borderLeft: '4px solid #eab308' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                            <AlertCircle size={20} style={{ color: '#a16207' }} />
                            <span style={{ color: '#854d0e', fontSize: '0.9rem', fontWeight: 500 }}>
                                {Number(selectedSemester) < Number(studentInfo.semester)
                                    ? `Semester ${selectedSemester} is archived. Displaying Total Marks only.`
                                    : "The current semester is completed. Displaying Total Marks only."}
                            </span>
                        </div>
                    </div>
                )}
                <div className={styles.card} style={{ marginBottom: '1.5rem', animationDelay: '0.1s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div className={styles.selectionRow} style={{ flex: 1 }}>
                            <div className={styles.selectionGroup}><label className={styles.selectionLabel}>Select Semester:</label><select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className={styles.filterSelect}>{[1, 2, 3, 4, 5, 6].map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}</select></div>
                            <div className={styles.selectionGroup}><label className={styles.selectionLabel}>Select Internals:</label>
                                <select value={selectedCIE} onChange={(e) => setSelectedCIE(e.target.value)} className={styles.filterSelect}>
                                    <option value="All">All Internals</option>
                                    <option value="CIE-1">CIE-1</option>
                                    <option value="CIE-2">CIE-2</option>
                                    <option value="CIE-3">CIE-3 Skill Test 1</option>
                                    <option value="CIE-4">CIE-4 Skill Test 2</option>
                                    <option value="CIE-5">CIE-5 Activities</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={() => downloadCIEMarks(theorySubjects, selectedCIE)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                background: '#3b82f6', color: 'white', border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Download size={16} />
                            Download {selectedCIE === 'All' ? 'All Marks' : selectedCIE + ' Marks'}
                        </button>
                    </div>
                </div>

                {!hasDataForSelectedCIE && selectedCIE !== 'All' ? (
                    <div className={styles.card} style={{ animationDelay: '0.2s', textAlign: 'center', padding: '3rem' }}>
                        <div style={{ background: '#fef2f2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444' }}><AlertCircle size={32} /></div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>No Marks Uploaded Yet</h3>
                        <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto' }}>
                            The faculty has not uploaded marks for <span style={{ fontWeight: '600', color: '#374151' }}>{selectedCIE}</span>. Please check back later.
                        </p>
                    </div>
                ) : (
                    <div className={styles.card} style={{ animationDelay: '0.2s' }}>
                        <div className={styles.cardHeader}><h2 className={styles.cardTitle}>📘 Subjects</h2></div>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Subject</th>
                                        {selectedCIE === 'All' && (
                                            <>
                                                {(!isRestricted) && (
                                                    <>
                                                        <th>CIE-1</th>
                                                        <th>Att %</th>
                                                        <th>CIE-2</th>
                                                        <th>Skill Test 1</th>
                                                        <th>Skill Test 2</th>
                                                        <th>Activities</th>
                                                    </>
                                                )}
                                            </>
                                        )}
                                        {selectedCIE === 'CIE-1' && !isRestricted && <><th>CIE-1</th><th>Att %</th></>}
                                        {selectedCIE === 'CIE-2' && !isRestricted && <><th>CIE-2</th><th>Att %</th></>}
                                        {selectedCIE === 'CIE-3' && !isRestricted && <><th>Skill Test 1</th><th>Att %</th></>}
                                        {selectedCIE === 'CIE-4' && !isRestricted && <><th>Skill Test 2</th><th>Att %</th></>}
                                        {selectedCIE === 'CIE-5' && !isRestricted && <><th>Activities</th><th>Att %</th></>}

                                        <th>Total</th>
                                        <th style={{ background: '#fefce8', color: '#a16207' }}>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {theorySubjects.map((item, idx) => {
                                        const max = 50; // Max marks for any single CIE or Total in this context? 
                                        // If "Total" in "All Internals" view means sum of all, then max is 250. 
                                        // But usually "Total" in a CIE context might mean the total obtained so far.
                                        // Let's assume Total column displays the selected CIE's total or sum if All.
                                        // Wait, the user said "entered cie data have to there remaining all null values with max marks".

                                        // Correction: For specific CIE, Total is just that CIE's score.
                                        // For 'All', Total usually implies the sum of all CIEs? Or maybe just listing them is enough?
                                        // The current logic calculates `total` based on selection.
                                        // If 'All', total is sum of all. 

                                        // Let's keep logic for Total column as is (sum of displayed).
                                        const totalDisplay = selectedCIE === 'All' ? item.total : item.total + ' / 50';

                                        // Status calculation might need adjustment if 'All' is selected and max marks differ.
                                        // For now, let's keep status based on the calculated 'total'.
                                        // If 'All', max marks = 250? Or 50 * number of CIEs?
                                        // The previous code had `const max = 50;` which is likely wrong for 'All'.
                                        // But for single CIE it's fine.
                                        // Let's adjust max for status.
                                        const statusMax = selectedCIE === 'All' ? 250 : 50;
                                        const status = getStatus(item.total, statusMax);

                                        return (
                                            <tr key={idx} style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards` }}>
                                                <td>{item.code}</td>
                                                <td>{item.subject}</td>

                                                {selectedCIE === 'All' && !isRestricted && (
                                                    <>
                                                        <td>{item.cie1 !== '-' ? `${item.cie1} / 50` : '-'}</td>
                                                        <td>{item.attendance !== '-' ? `${item.attendance}%` : '-'}</td>
                                                        <td>{item.cie2 !== '-' ? `${item.cie2} / 50` : '-'}</td>
                                                        <td>{item.cie3 !== '-' ? `${item.cie3} / 50` : '-'}</td>
                                                        <td>{item.cie4 !== '-' ? `${item.cie4} / 50` : '-'}</td>
                                                        <td>{item.cie5 !== '-' ? `${item.cie5} / 50` : '-'}</td>
                                                    </>
                                                )}

                                                {selectedCIE === 'CIE-1' && !isRestricted && <><td>{item.cie1 !== '-' ? `${item.cie1} / 50` : '-'}</td><td>{item.cie1Att !== '-' ? `${item.cie1Att}%` : '-'}</td></>}
                                                {selectedCIE === 'CIE-2' && !isRestricted && <><td>{item.cie2 !== '-' ? `${item.cie2} / 50` : '-'}</td><td>{item.cie2Att !== '-' ? `${item.cie2Att}%` : '-'}</td></>}
                                                {selectedCIE === 'CIE-3' && !isRestricted && <><td>{item.cie3 !== '-' ? `${item.cie3} / 50` : '-'}</td><td>{item.cie3Att !== '-' ? `${item.cie3Att}%` : '-'}</td></>}
                                                {selectedCIE === 'CIE-4' && !isRestricted && <><td>{item.cie4 !== '-' ? `${item.cie4} / 50` : '-'}</td><td>{item.cie4Att !== '-' ? `${item.cie4Att}%` : '-'}</td></>}
                                                {selectedCIE === 'CIE-5' && !isRestricted && <><td>{item.cie5 !== '-' ? `${item.cie5} / 50` : '-'}</td><td>{item.cie5Att !== '-' ? `${item.cie5Att}%` : '-'}</td></>}

                                                <td style={{ fontWeight: 'bold' }}>{item.total} / {selectedCIE === 'All' ? 250 : 50}</td>
                                                {(() => {
                                                    const cies = [
                                                        { key: 'CIE-1', score: item.cie1, att: item.cie1Att },
                                                        { key: 'CIE-2', score: item.cie2, att: item.cie2Att },
                                                        { key: 'CIE-3', score: item.cie3, att: item.cie3Att },
                                                        { key: 'CIE-4', score: item.cie4, att: item.cie4Att },
                                                        { key: 'CIE-5', score: item.cie5, att: item.cie5Att }
                                                    ];
                                                    // Filter to relevant CIEs based on selection
                                                    const relevantCies = selectedCIE === 'All' ? cies : cies.filter(c => c.key === selectedCIE);
                                                    const parts = [];
                                                    let worstColor = '#94a3b8'; let worstBg = 'transparent';
                                                    let allGood = true;
                                                    relevantCies.forEach(c => {
                                                        const score = c.score !== '-' ? parseFloat(c.score) : null;
                                                        const att = c.att !== '-' ? parseFloat(c.att) : null;
                                                        if (score == null) return;
                                                        if (score < 25 && att != null && att < 75) {
                                                            parts.push(`${c.key}: Marks & Att Low - Meet HOD`);
                                                            worstColor = '#dc2626'; worstBg = '#fef2f2'; allGood = false;
                                                        } else if (score < 25) {
                                                            parts.push(`${c.key}: Marks Low - Meet HOD`);
                                                            if (worstColor !== '#dc2626') { worstColor = '#ea580c'; worstBg = '#fff7ed'; }
                                                            allGood = false;
                                                        } else if (att != null && att < 75) {
                                                            parts.push(`${c.key}: Att Low - Meet HOD`);
                                                            if (worstColor !== '#dc2626') { worstColor = '#ea580c'; worstBg = '#fff7ed'; }
                                                            allGood = false;
                                                        }
                                                    });
                                                    const filledCount = relevantCies.filter(c => c.score !== '-').length;
                                                    if (filledCount === 0) return <td style={{ width: '250px', minWidth: '250px', padding: 0 }}><div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '8px 4px' }}>-</div></td>;
                                                    if (parts.length > 0) {
                                                        const remarkText = parts.join(' | ');
                                                        return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: worstBg }}>
                                                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: worstColor, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{remarkText}</div>
                                                        </td>;
                                                    }
                                                    // All good
                                                    const avg = item.total / filledCount;
                                                    const remarkLabel = avg >= 40 ? 'Excellent' : 'Good';
                                                    const remarkCol = avg >= 40 ? '#15803d' : '#2563eb';
                                                    const remarkBg = avg >= 40 ? '#f0fdf4' : '#eff6ff';
                                                    return <td style={{ width: '250px', minWidth: '250px', padding: '8px 4px', background: remarkBg }}>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: remarkCol, whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>{remarkLabel}</div>
                                                    </td>;
                                                })()}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };



    // ... (rest of the file as is, just wrapped in render)

    const renderSubjects = () => (
        <div className={styles.detailsContainer}>
            <div className={styles.card} style={{ animationDelay: '0.1s' }}>
                <h2 className={styles.cardTitle}>📚 Registered Subjects</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead><tr><th>Code</th><th>Subject Name</th><th>Department</th></tr></thead>
                        <tbody>
                            {realSubjects.length > 0 ? realSubjects.map((sub, idx) => (
                                <tr key={sub.id} style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards` }}>
                                    <td><span className={styles.codeBadge} style={{ fontWeight: 'bold' }}>{sub.code}</span></td>
                                    <td>{sub.name}</td>
                                    <td>{sub.department || 'N/A'}</td>
                                </tr>
                            )) : <tr><td colSpan="3">No subjects found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderFaculty = () => (
        <div className={styles.detailsContainer}>
            <div className={styles.facultyGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', animation: 'fadeIn 0.8s ease-out' }}>
                {facultyList.length > 0 ? facultyList.map((fac, idx) => (
                    <div key={idx} className={styles.facultyCard} style={{ animation: `fadeIn 0.5s ease-out ${idx * 0.1}s backwards` }}>
                        <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#3b82f6', border: '1px solid #bfdbfe' }}><User size={32} /></div>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '700' }}>{fac.name}</h3>
                        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.8 }}>{fac.department} Department</p>
                        <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '0.75rem 0' }}></div>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.9 }}><span style={{ fontWeight: 600 }}>Teaches:</span> {fac.subjects}</p>
                        {fac.email && <a href={`mailto:${fac.email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '0.85rem', textDecoration: 'none', marginTop: 'auto', fontWeight: '500' }}><Mail size={14} /> Contact</a>}
                    </div>
                )) : <div style={{ textAlign: 'center', padding: '3rem', width: '100%', gridColumn: '1/-1' }}><p>No faculty details available.</p></div>}
            </div>
        </div>
    );

    const renderSyllabusTopics = () => {
        const updates = upcomingExams.filter(exam => exam.syllabus && exam.syllabus.trim() !== '');
        return (
            <div className={styles.detailsContainer}>
                <div className={styles.card} style={{ animationDelay: '0.1s' }}>
                    <h2 className={styles.cardTitle}>📖 Syllabus Notifications</h2>
                    {updates.length === 0 ? <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No syllabus updates.</p> :
                        <div className={styles.notificationsList}>
                            {updates.map((item, idx) => (
                                <div key={idx} className={styles.notifItem} style={{ borderLeft: '4px solid #3b82f6', background: '#eff6ff', padding: '1rem', marginBottom: '1rem', borderRadius: '8px', animation: `slideUp 0.4s ease-out ${idx * 0.1}s backwards` }}>
                                    <div className={styles.notifContent}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <div><span style={{ fontWeight: '600', color: '#1e40af', display: 'block' }}>{item.subject}</span><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.exam}</span></div>
                                        </div>
                                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid #dbeafe' }}><p style={{ color: '#334155', margin: 0 }}>{item.syllabus}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    }
                </div>
            </div>
        );
    };

    const renderNotifications = () => (
        <div className={styles.detailsContainer}>
            {/* Upcoming Exams Section in Notifications Tab */}
            <div className={styles.card} style={{ animationDelay: '0.05s', marginBottom: '1.5rem' }}>
                <h2 className={styles.cardTitle}>📅 Upcoming Exams</h2>
                <div className={styles.examsList}>
                    {loadingAnnouncements ? <p>Loading schedule...</p> : upcomingExams.length > 0 ? upcomingExams.map((exam, idx) => (
                        <div key={exam.id} className={styles.examItem} style={{ animationDelay: `${0.1 * idx}s` }}>
                            <div className={styles.examBadge}>{exam.exam}</div>
                            <div className={styles.examInfo}><span className={styles.examSubject}>{exam.subject}</span><span className={styles.examDate}><Calendar size={12} /> {exam.date} • {exam.time} • Room: {exam.room}</span></div>
                            <Clock size={16} className={styles.examIcon} />
                        </div>
                    )) : <p style={{ color: '#6b7280', padding: '1rem' }}>No upcoming exams scheduled.</p>}
                </div>
            </div>

            {/* General Notifications Section */}
            <div className={styles.card} style={{ animationDelay: '0.1s' }}>
                <h2 className={styles.cardTitle}>🔔 General Notifications</h2>
                <div className={styles.notificationsList} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {notifications.length > 0 ? notifications.map((notif, idx) => (
                        <div key={notif.id} className={styles.notifItem} style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: notif.type === 'alert' ? '#fef2f2' : '#f0f9ff',
                            border: `1px solid ${notif.type === 'alert' ? '#fecaca' : '#bae6fd'}`,
                            display: 'flex',
                            gap: '1rem',
                            animation: `slideUp 0.3s ease-out ${idx * 0.1}s backwards`
                        }}>
                            <div style={{ color: notif.type === 'alert' ? '#dc2626' : '#0284c7' }}>
                                {notif.type === 'alert' ? <AlertCircle size={24} /> : <Bell size={24} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 0.5rem 0', color: '#334155', lineHeight: '1.5' }}>{notif.message}</p>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{notif.time}</span>
                            </div>
                        </div>
                    )) : (
                        <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No new notifications.</p>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout menuItems={menuItems}>
            <div className={styles.dashboardContainer}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.welcomeText}>
                            {activeSection === 'Overview' ?
                                <span className={styles.typewriter}>{typedText}</span>
                                : activeSection}
                        </h1>
                        <p className={styles.subtitle}>{studentInfo.branch} | Semester: {studentInfo.semester} | Reg No: {studentInfo.rollNo}</p>
                    </div>
                </header>

                {activeSection === 'Overview' && (
                    <AcademicSummary
                        studentInfo={studentInfo}
                        cieStatus={cieStatus}
                        // Risk Logic: High if Aggregate < 40 OR Attendance < 75. Moderate if Aggregate < 60. Else Low.
                        riskLevel={
                            (parseFloat(studentInfo.cgpa) < 40) ? 'High' :
                                parseFloat(studentInfo.cgpa) < 60 ? 'Moderate' : 'Low'
                        }
                    />
                )}

                {activeSection === 'Overview' && renderOverview()}
                {activeSection === 'CIE Marks' && renderCIEMarks()}

                {activeSection === 'Subjects' && renderSubjects()}
                {activeSection === 'Faculty' && renderFaculty()}
                {activeSection === 'Syllabus Topics' && renderSyllabusTopics()}
                {activeSection === 'Notifications' && renderNotifications()}

                {toast.show && <div className={styles.toast}>{toast.message}</div>}
            </div>
        </DashboardLayout>
    );
};
export default StudentDashboard;
