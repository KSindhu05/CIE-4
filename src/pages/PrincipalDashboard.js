import React, { useState, useMemo, useCallback, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import styles from './PrincipalDashboard.module.css';
import {
    LayoutDashboard, Users, ShieldCheck, Calendar, BarChart2,
    Briefcase, Bell, AlertTriangle, FileText, Building, LogOut,
    RotateCw, Settings, Trash2, GraduationCap
} from 'lucide-react';
import headerLogo from '../assets/header_logo.png';

// Import Extracted Components
import { ToastNotification, SimpleModal } from '../components/dashboard/principal/Shared';
import { StudentSentinel } from '../components/dashboard/principal/Widgets';
import OverviewSection from '../components/dashboard/principal/OverviewSection';
import ComplianceSection from '../components/dashboard/principal/ComplianceSection';
import DepartmentSection from '../components/dashboard/principal/DepartmentSection';
// import FacultySection from '../components/dashboard/principal/FacultySection'; // Replaced by FacultyDirectorySection
import { DirectorySection } from '../components/dashboard/principal/DirectorySection';
import {
    FacultyDirectorySection, CIEScheduleSection,
    ReportsSection, NotificationsSection, ManageHODsSection
} from '../components/dashboard/principal/SectionComponents';

import {
    fetchPrincipalDashboard, fetchAllFaculty, fetchTimetables,
    fetchNotifications, fetchReports, fetchHods, createHod, updateHod, deleteHod,
    fetchSemesterStatus, updateSemesterStatus, resetMarks, resetFaculty, cleanupData, shiftSemesters
} from '../services/api';

const API_BASE_URL = 'http://127.0.0.1:8084/api';

const PrincipalDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [dashboardData, setDashboardData] = useState(null);
    const [facultyList, setFacultyList] = useState([]);
    const [hodList, setHodList] = useState([]);
    const [timetables, setTimetables] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [reports, setReports] = useState([]);

    const [loading, setLoading] = useState(true);
    const [semesterStatus, setSemesterStatus] = useState('ACTIVE');
    const [resetLoading, setResetLoading] = useState(false);

    // Directory State
    const [selectedDept, setSelectedDept] = useState(null);
    const [deptStudents, setDeptStudents] = useState([]);

    // Interaction State
    const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });
    const [activeModal, setActiveModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    // Notification Sending State
    const [msgRecipientType, setMsgRecipientType] = useState('HOD');
    const [msgTargetDept, setMsgTargetDept] = useState('ALL');
    const [msgText, setMsgText] = useState('');

    // Fetch All Data
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const token = user?.token;
                console.log("DEBUG: Fetching Principal Dashboard with token:", token ? "Present" : "Missing");
                setLoading(true);

                // Parallel fetching of all required data
                const [
                    dashData,
                    faculty,
                    hods,
                    times,
                    notifs,
                    reps,
                    semStatus
                ] = await Promise.all([
                    fetchPrincipalDashboard(token),
                    fetchAllFaculty(token),
                    fetchHods(token),
                    fetchTimetables(token),
                    fetchNotifications(token),
                    fetchReports(token),
                    fetchSemesterStatus()
                ]);

                if (dashData) setDashboardData(dashData);
                if (faculty) setFacultyList(faculty);
                if (hods) {
                    console.log("DEBUG: HODs fetched:", hods);
                    setHodList(hods);
                } else {
                    console.warn("DEBUG: HODs fetch returned null/undefined");
                }
                if (times) setTimetables(times);
                if (notifs) setNotifications(notifs);
                if (reps) setReports(reps);
                if (semStatus) setSemesterStatus(semStatus.status);

            } catch (error) {
                console.error("Failed to load dashboard data details:", error);
                if (error.response) {
                    console.error("Response status:", error.response.status);
                    console.error("Response data:", await error.response.json());
                }
                showToast("Failed to load live data: " + error.message, "error");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'info' }), 3000);
    }, []);

    const handleDownload = useCallback(async (item) => {
        showToast(`Generating ${item.name || 'report'}...`, 'info');
        try {
            const token = user?.token;
            const apiType = item.apiType || item.name.toLowerCase().replace(/ /g, '_');
            const response = await fetch(`${API_BASE_URL}/principal/reports/download/${apiType}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to generate report');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${apiType}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Report downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            showToast('Failed to download report', 'error');
        }
    }, [user, showToast, API_BASE_URL]);
    const handleNewBroadcast = useCallback(() => setActiveModal('broadcast'), []);
    const handleSaveFaculty = useCallback((e) => { e.preventDefault(); setActiveModal(null); showToast('Faculty Saved', 'success'); }, [showToast]);

    // MENU ITEMS - format compatible with Sidebar component
    const menuItems = [
        { label: 'Overview', path: '#overview', icon: <LayoutDashboard size={20} />, isActive: activeTab === 'overview', onClick: () => setActiveTab('overview') },
        { label: 'Departments', path: '#departments', icon: <Building size={20} />, isActive: activeTab === 'departments', onClick: () => setActiveTab('departments') },
        { label: 'Manage HODs', path: '#hods', icon: <ShieldCheck size={20} />, isActive: activeTab === 'hod-management', onClick: () => setActiveTab('hod-management') },
        { label: 'Faculty Directory', path: '#faculty', icon: <Briefcase size={20} />, isActive: activeTab === 'faculty', onClick: () => setActiveTab('faculty') },
        { label: 'Student Search', path: '#directory', icon: <Users size={20} />, isActive: activeTab === 'directory', onClick: () => { setActiveTab('directory'); setSelectedDept(null); } },
        { label: 'CIE Schedule', path: '#timetables', icon: <Calendar size={20} />, isActive: activeTab === 'timetables', onClick: () => setActiveTab('timetables') },
        { label: 'CIE Compliance', path: '#compliance', icon: <ShieldCheck size={20} />, isActive: activeTab === 'compliance', onClick: () => setActiveTab('compliance') },
        { label: 'Reports & Analytics', path: '#reports', icon: <FileText size={20} />, isActive: activeTab === 'reports', onClick: () => setActiveTab('reports') },
        { label: 'Notifications', path: '#notifications', icon: <Bell size={20} />, isActive: activeTab === 'notifications', onClick: () => setActiveTab('notifications') },
        { label: 'Semester Reset', path: '#semester', icon: <Settings size={20} />, isActive: activeTab === 'semester-management', onClick: () => setActiveTab('semester-management') }
    ];

    /* Chart Configs and Helper Logic */
    const barData = useMemo(() => {
        if (!dashboardData) return null;
        return {
            labels: dashboardData.branches || ['CS', 'EC', 'ME', 'CV'],
            datasets: [{
                label: 'Avg CIE Performance (%)',
                data: dashboardData.branchPerformance || [0, 0, 0, 0],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                borderRadius: 6
            }]
        };
    }, [dashboardData]);

    const departments = useMemo(() => {
        if (!dashboardData?.branches) return [];

        // Color palette for departments
        const colorPalette = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];

        // Known department code -> full name mappings
        const deptNames = {
            'CS': 'Computer Science', 'CSE': 'Computer Science',
            'EC': 'Electronics', 'ECE': 'Electronics & Communication',
            'ME': 'Mechanical', 'MECH': 'Mechanical',
            'CV': 'Civil', 'CIVIL': 'Civil',
            'EE': 'Electrical', 'EEE': 'Electrical & Electronics',
            'IS': 'Information Science', 'ISE': 'Information Science',
            'AI': 'Artificial Intelligence', 'AIML': 'AI & Machine Learning',
        };

        return dashboardData.branches.map((branch, index) => {
            const hodInfo = dashboardData.hodSubmissionStatus?.find(h => h.dept === branch);
            return {
                id: branch,
                name: deptNames[branch.toUpperCase()] || branch,
                hod: hodInfo ? hodInfo.hod : 'Not Assigned',
                color: colorPalette[index % colorPalette.length],
                studentCount: dashboardData.deptStudentCounts?.[branch] || 0
            };
        });
    }, [dashboardData]);

    const handleDeptClick = useCallback((dept) => {
        setSelectedDept(dept);
        // Students are fetched by DirectorySection internally based on selectedDept
        setDeptStudents([]);
    }, []);

    const handleRemoveFaculty = useCallback(() => setActiveModal('removeFaculty'), []);

    // const handleViewGrievance = useCallback((g) => {
    //     setSelectedItem(g);
    //     setActiveModal('grievance');
    // }, []);

    // --- Notification Handlers ---

    const handleSendNotification = useCallback(async () => {
        if (!msgText.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: user?.username || 'principal',
                    message: msgText,
                    targetRole: msgRecipientType,
                    department: msgTargetDept
                })
            });
            const data = await res.json();
            showToast(data.message || 'Message sent!', 'success');

            // Immediately show the sent message in the notifications list
            const scopeLabel = msgTargetDept && msgTargetDept !== 'ALL'
                ? `${msgTargetDept} ${msgRecipientType}s`
                : `All ${msgRecipientType}s`;
            const sentNotif = {
                id: `local-${Date.now()}`,
                message: msgText,
                type: 'SENT',
                category: `📤 Sent to ${scopeLabel}`,
                createdAt: new Date().toISOString(),
                isRead: true
            };
            setNotifications(prev => [sentNotif, ...prev]);
            setMsgText('');
        } catch (err) {
            console.error('Send notification error:', err);
            showToast('Failed to send notification', 'error');
        }
    }, [msgText, msgRecipientType, msgTargetDept, user, showToast]);


    const handleClearNotifications = useCallback(async () => {
        try {
            const token = user?.token;
            await fetch(`${API_BASE_URL}/notifications/clear`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications([]);
            showToast('Notifications cleared', 'info');
        } catch (err) {
            console.error('Clear notifications error:', err);
            showToast('Failed to clear notifications', 'error');
        }
    }, [user, showToast]);

    const handleDeleteNotification = useCallback(async (id) => {
        try {
            const token = user?.token;
            await fetch(`${API_BASE_URL}/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Delete notification error:', err);
            showToast('Failed to delete notification', 'error');
        }
    }, [user, showToast]);

    const handleCreateHod = useCallback(async (hodData) => {
        try {
            const token = user?.token;
            const newHod = await createHod(token, hodData);
            setHodList(prev => [...prev, newHod]);
            showToast('HOD Registered Successfully', 'success');
            // Re-fetch dashboard data so the new department appears immediately
            try {
                const dashData = await fetchPrincipalDashboard(token);
                if (dashData) setDashboardData(dashData);
            } catch (e) { /* silent — department will appear on next reload */ }
        } catch (error) {
            showToast('Failed to register HOD: ' + error.message, 'error');
        }
    }, [user, showToast]);

    const handleRefreshHods = useCallback(async () => {
        try {
            const token = user?.token;
            const hods = await fetchHods(token);
            if (hods) {
                setHodList(hods);
                showToast('HOD List Updated', 'success');
            }
        } catch (error) {
            showToast('Failed to refresh HODs', 'error');
        }
    }, [user, showToast]);

    const handleUpdateHod = useCallback(async (id, hodData) => {
        try {
            const token = user?.token;
            const updated = await updateHod(token, id, hodData);
            setHodList(prev => prev.map(h => h.id === id ? updated : h));
            showToast('HOD Updated Successfully', 'success');
        } catch (error) {
            showToast('Failed to update HOD: ' + error.message, 'error');
        }
    }, [user, showToast]);

    const handleDeleteHod = useCallback(async (id) => {
        try {
            const token = user?.token;
            await deleteHod(token, id);
            setHodList(prev => prev.filter(h => h.id !== id));
            showToast('HOD Removed Successfully', 'success');
        } catch (error) {
            showToast('Failed to remove HOD: ' + error.message, 'error');
        }
    }, [user, showToast]);

    const handleLogout = () => {
        logout();
    };

    return (
        <DashboardLayout menuItems={menuItems}>
            {/* --- HEADER (Faculty-style) --- */}
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className={styles.welcomeText}>Hello, Dr. Gowri Shankar</h1>
                        <p className={styles.subtitle}>Principal | Sanjay Gandhi Polytechnic</p>
                    </div>
                    <div className={styles.headerActions}>
                        <StudentSentinel students={deptStudents} />
                        <select className={styles.yearSelector}>
                            <option>Academic Year 2025-26</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* Dynamic Content */}
            <div className={styles.sectionVisible}>
                {activeTab === 'overview' && (
                    loading ? <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading Dashboard...</div> :
                        <OverviewSection
                            stats={dashboardData?.stats}
                            chartData={barData}
                            branches={dashboardData?.branches}
                            branchPerformance={dashboardData?.branchPerformance}
                            lowPerformers={dashboardData?.lowPerformers}
                            facultyAnalytics={dashboardData?.facultyAnalytics}
                            schedule={dashboardData?.dates}
                            approvals={dashboardData?.approvals}
                            cieStats={dashboardData?.cieStats}
                            trends={dashboardData?.trends}
                            hodSubmissionStatus={dashboardData?.hodSubmissionStatus}
                            onNavigate={setActiveTab}
                        />
                )}

                {activeTab === 'compliance' && <ComplianceSection hodSubmissionStatus={dashboardData?.hodSubmissionStatus} />}

                {activeTab === 'departments' && <DepartmentSection departments={departments} facultyList={facultyList} />}

                {activeTab === 'directory' && <DirectorySection
                    departments={departments}
                    selectedDept={selectedDept}
                    deptStudents={deptStudents}
                    handleDeptClick={handleDeptClick}
                    setSelectedDept={setSelectedDept}
                />}

                {activeTab === 'hod-management' && (
                    <ManageHODsSection
                        hods={hodList}
                        onCreate={handleCreateHod}
                        onUpdate={handleUpdateHod}
                        onDelete={handleDeleteHod}
                        user={user}
                        departments={departments}
                        onRefresh={handleRefreshHods}
                    />
                )}

                {activeTab === 'faculty' && <FacultyDirectorySection facultyMembers={facultyList} onRemove={handleRemoveFaculty} />}

                {activeTab === 'timetables' && <CIEScheduleSection schedules={timetables} onDownload={handleDownload} />}
                {activeTab === 'notifications' && <NotificationsSection
                    notifications={notifications}
                    recipientType={msgRecipientType}
                    setRecipientType={setMsgRecipientType}
                    targetDept={msgTargetDept}
                    setTargetDept={setMsgTargetDept}
                    messageText={msgText}
                    setMessageText={setMsgText}
                    onSend={handleSendNotification}
                    onClear={handleClearNotifications}
                    onDelete={handleDeleteNotification}
                />}
                {activeTab === 'reports' && <ReportsSection reports={reports} onDownload={handleDownload} />}

                {activeTab === 'semester-management' && (
                    <div style={{ animation: 'fadeIn 0.6s ease' }}>
                        {/* 🔥 Danger Banner */}
                        <div style={{
                            background: 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)',
                            borderRadius: '16px', padding: '2rem 2.5rem', marginBottom: '2rem',
                            border: '1px solid #fca5a5',
                            boxShadow: '0 4px 24px rgba(239,68,68,0.08)',
                            position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', top: '-50%', right: '-10%',
                                width: '300px', height: '300px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
                                pointerEvents: 'none'
                            }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                                <div style={{
                                    background: '#fee2e2', border: '1px solid #fca5a5',
                                    borderRadius: '12px', padding: '0.75rem',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.15)'
                                }}>
                                    <AlertTriangle size={28} color="#dc2626" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>
                                        Semester-End Management
                                    </h2>
                                    <p style={{ margin: '0.25rem 0 0', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                                        ⚠️ All actions below are permanent and institution-wide. Proceed with caution.
                                    </p>
                                </div>
                                <div style={{ marginLeft: 'auto' }}>
                                    <span style={{
                                        background: semesterStatus === 'ACTIVE'
                                            ? 'linear-gradient(135deg, #065f46, #059669)'
                                            : 'linear-gradient(135deg, #7c2d12, #ea580c)',
                                        color: 'white', padding: '0.4rem 1.2rem',
                                        borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                                        letterSpacing: '1px', textTransform: 'uppercase',
                                        boxShadow: semesterStatus === 'ACTIVE'
                                            ? '0 0 15px rgba(5,150,105,0.5)'
                                            : '0 0 15px rgba(234,88,12,0.5)',
                                        display: 'inline-block'
                                    }}>
                                        ● {semesterStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Cards Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                            {/* Card 1: Semester Status */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px', padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                animation: 'fadeIn 0.5s ease 0.1s both',
                                cursor: 'default'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        background: '#eff6ff',
                                        borderRadius: '12px', padding: '0.75rem',
                                        boxShadow: '0 2px 8px rgba(99,102,241,0.1)'
                                    }}>
                                        <GraduationCap size={22} color="#4f46e5" />
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px',
                                        color: '#64748b', padding: '0.25rem 0.6rem',
                                        border: '1px solid #e2e8f0', borderRadius: '6px'
                                    }}>CONTROL</div>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Semester Status</h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Toggle between <strong style={{ color: '#4f46e5' }}>ACTIVE</strong> and <strong style={{ color: '#f97316' }}>COMPLETED</strong> to control what students can see.
                                </p>
                                <button
                                    onClick={async () => {
                                        const newStatus = semesterStatus === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
                                        try {
                                            await updateSemesterStatus(user?.token, newStatus);
                                            setSemesterStatus(newStatus);
                                            showToast(`Semester marked as ${newStatus}`, 'success');
                                        } catch (e) { showToast('Failed to update status', 'error'); }
                                    }}
                                    style={{
                                        width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px',
                                        background: '#ffffff',
                                        color: '#1e293b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', letterSpacing: '0.5px'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    Mark as {semesterStatus === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE'}
                                </button>
                            </div>

                            {/* Card 2: Clear Marks */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px', padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                animation: 'fadeIn 0.5s ease 0.2s both'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        background: '#fef2f2',
                                        borderRadius: '12px', padding: '0.75rem',
                                        boxShadow: '0 2px 8px rgba(239,68,68,0.1)'
                                    }}>
                                        <Trash2 size={22} color="#dc2626" />
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px',
                                        color: '#dc2626', padding: '0.25rem 0.6rem',
                                        border: '1px solid #fca5a5', borderRadius: '6px'
                                    }}>DANGER</div>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Clear Academic Marks</h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Permanently wipe all CIE marks for every student across all departments. <strong style={{ color: '#dc2626' }}>Irreversible.</strong>
                                </p>
                                <button
                                    onClick={() => {
                                        if (window.confirm("CRITICAL: Are you sure you want to WIPE ALL MARKS? This cannot be undone.")) {
                                            setResetLoading(true);
                                            resetMarks(user?.token)
                                                .then(() => showToast('All Marks Cleared', 'success'))
                                                .catch(() => showToast('Failed to clear marks', 'error'))
                                                .finally(() => setResetLoading(false));
                                        }
                                    }}
                                    disabled={resetLoading}
                                    style={{
                                        width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px',
                                        background: '#ffffff',
                                        color: '#1e293b', fontWeight: 600, fontSize: '0.9rem', cursor: resetLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: resetLoading ? 0.7 : 1
                                    }}
                                    onMouseEnter={e => {
                                        if (!resetLoading) {
                                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    {resetLoading ? '⏳ Clearing...' : '🗑️ Clear All Marks'}
                                </button>
                            </div>

                            {/* Card 3: Shift Semester */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px', padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                animation: 'fadeIn 0.5s ease 0.3s both'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        background: '#f0fdf4',
                                        borderRadius: '12px', padding: '0.75rem',
                                        boxShadow: '0 2px 8px rgba(34,197,94,0.1)'
                                    }}>
                                        <RotateCw size={22} color="#16a34a" />
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px',
                                        color: '#16a34a', padding: '0.25rem 0.6rem',
                                        border: '1px solid #bbf7d0', borderRadius: '6px'
                                    }}>PROGRESSION</div>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Shift to Next Semester</h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Advance all students forward by one semester (e.g., <strong style={{ color: '#16a34a' }}>Sem 2 → 3</strong>). Students in 6th sem remain unchanged.
                                </p>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Shift all students to the next academic semester?")) {
                                            setResetLoading(true);
                                            shiftSemesters(user?.token)
                                                .then(() => showToast('Students Shifted Successfully', 'success'))
                                                .catch(() => showToast('Failed to shift semesters', 'error'))
                                                .finally(() => setResetLoading(false));
                                        }
                                    }}
                                    disabled={resetLoading}
                                    style={{
                                        width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px',
                                        background: '#ffffff',
                                        color: '#1e293b', fontWeight: 600, fontSize: '0.9rem', cursor: resetLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: resetLoading ? 0.7 : 1
                                    }}
                                    onMouseEnter={e => {
                                        if (!resetLoading) {
                                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    {resetLoading ? '⏳ Shifting...' : '🚀 Run Semester Shift'}
                                </button>
                            </div>

                            {/* Card 4: Faculty & Data Cleanup */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px', padding: '1.75rem',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                animation: 'fadeIn 0.5s ease 0.4s both'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        background: '#faf5ff',
                                        borderRadius: '12px', padding: '0.75rem',
                                        boxShadow: '0 2px 8px rgba(168,85,247,0.1)'
                                    }}>
                                        <Settings size={22} color="#7c3aed" />
                                    </div>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px',
                                        color: '#7c3aed', padding: '0.25rem 0.6rem',
                                        border: '1px solid #e9d5ff', borderRadius: '6px'
                                    }}>CLEANUP</div>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>Faculty & Data Cleanup</h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Reset faculty workloads and wipe all notifications &amp; CIE schedules to prep for the next academic session.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Reset all faculty assignments?")) {
                                                resetFaculty(user?.token)
                                                    .then(() => showToast('Faculty Workloads Reset', 'success'))
                                                    .catch(() => showToast('Failed to reset faculty', 'error'));
                                            }
                                        }}
                                        style={{
                                            flex: 1, padding: '0.7rem', border: '1px solid #e2e8f0',
                                            borderRadius: '10px', background: '#ffffff',
                                            color: '#1e293b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                    >
                                        👤 Reset Faculty
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Cleanup all notifications and schedules?")) {
                                                cleanupData(user?.token)
                                                    .then(() => showToast('System Cleanup Done', 'success'))
                                                    .catch(() => showToast('Cleanup failed', 'error'));
                                            }
                                        }}
                                        style={{
                                            flex: 1, padding: '0.7rem', border: '1px solid #e2e8f0',
                                            borderRadius: '10px', background: '#ffffff',
                                            color: '#1e293b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}
                                    >
                                        🧹 Wipe Schedules
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Interaction Modals */}
            <ToastNotification show={toast.show} msg={toast.msg} type={toast.type} />

            <SimpleModal isOpen={activeModal === 'removeFaculty'} onClose={() => setActiveModal(null)} title="Remove Faculty">
                <form onSubmit={(e) => { e.preventDefault(); setActiveModal(null); showToast('Faculty Removed', 'success'); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        Are you sure you want to remove a faculty member? This action cannot be undone.
                    </p>
                    <input className={styles.searchBarInput} placeholder="Enter Faculty ID to Remove" required style={{ border: '1px solid #e2e8f0' }} />
                    <button type="submit" className={styles.primaryBtn} style={{ marginTop: '0.5rem', justifyContent: 'center', background: '#ef4444' }}>Confirm Removal</button>
                </form>
            </SimpleModal>
        </DashboardLayout>
    );
};

export default PrincipalDashboard;
