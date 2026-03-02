import React, { memo, useState, useMemo } from 'react';

import { Calendar, Download, Bell, FileText, Search, UserMinus, Briefcase, Clock, Mail, Phone, MapPin, Building, UserCheck, AlertTriangle, X, Trash2, Send, ShieldCheck, RefreshCw, Edit2, Edit3, Eye, EyeOff } from 'lucide-react';
import { SimpleModal } from './Shared';
import styles from '../../../pages/PrincipalDashboard.module.css';

export const FacultyDirectorySection = memo(({ facultyMembers = [], onRemove }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [viewProfile, setViewProfile] = useState(null);

    const filteredFaculty = useMemo(() => {
        return facultyMembers.filter(f => {
            const matchesSearch = (f.fullName || f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (f.id || f.EmployeeID || '').toString().includes(searchTerm);
            const matchesDept = selectedDept === 'All Departments' ||
                (f.department || f.dept || f.Department) === selectedDept;
            return matchesSearch && matchesDept;
        });
    }, [facultyMembers, searchTerm, selectedDept]);

    const departments = useMemo(() => ['All Departments', ...new Set(facultyMembers.map(f => f.department || f.dept || f.Department).filter(Boolean))], [facultyMembers]);

    return (
        <div className={styles.sectionVisible}>
            {/* --- FACULTY BANNER --- */}
            <div style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                borderRadius: '24px',
                padding: '2rem',
                color: 'white',
                marginBottom: '2rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.5)'
            }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '180px', height: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                                <Briefcase size={24} color="white" />
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.9 }}>Academic Staff</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800 }}>Staff Directory</h1>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Manage faculty profiles, workload, and performance.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>Total Faculty</p>
                            <p style={{ margin: '0', fontSize: '1.8rem', fontWeight: '700' }}>{facultyMembers.length}</p>
                        </div>
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.3)' }}></div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>Avg Workload</p>
                            <p style={{ margin: '0', fontSize: '1.8rem', fontWeight: '700' }}>18h/wk</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TOOLBAR --- */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem',
                background: 'white', padding: '1rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
            }}>
                <div className={styles.searchWrapper}>
                    <input
                        placeholder="Search Faculty..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className={styles.searchIcon}>
                        <Search size={18} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                        className={styles.filterSelect}
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                    >
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <button
                        className={styles.primaryBtn}
                        onClick={onRemove}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', background: '#ef4444' }}
                    >
                        <UserMinus size={18} /> Remove Faculty
                    </button>
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>Sl. No</th>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Designation</th>

                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFaculty.map((f, index) => (
                            <tr key={f.id} style={{ transition: 'background 0.2s', cursor: 'default' }}>
                                <td style={{ color: '#64748b', fontWeight: 500 }}>{index + 1}</td>
                                <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{f.id || f.EmployeeID}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            {(f.fullName || f.name || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{f.fullName || f.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{f.qualifications || f.Qualification}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem' }}>{f.department || f.dept || f.Department}</span>
                                </td>
                                <td>{f.designation || f.Designation}</td>

                                <td>
                                    <button
                                        className={styles.secondaryBtn}
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                        onClick={() => setViewProfile(f)}
                                    >
                                        View Profile
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredFaculty.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    No faculty found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- PROFILE MODAL --- */}
            <SimpleModal isOpen={!!viewProfile} onClose={() => setViewProfile(null)} title="Faculty Profile">
                {viewProfile && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%', background: '#f8fafc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
                            fontWeight: 800, color: '#334155', border: '4px solid #e2e8f0'
                        }}>
                            {(viewProfile.fullName || viewProfile.name || '?').charAt(0)}
                        </div>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>{viewProfile.fullName || viewProfile.name}</h2>
                            <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>{viewProfile.designation || viewProfile.Designation} - {viewProfile.department || viewProfile.dept || viewProfile.Department}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', textAlign: 'left' }}>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Employee ID</p>
                                <p style={{ margin: 0, fontWeight: 600 }}>{viewProfile.id || viewProfile.EmployeeID}</p>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', textAlign: 'left' }}>
                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Qualification</p>
                                <p style={{ margin: 0, fontWeight: 600 }}>{viewProfile.qualifications || viewProfile.Qualification}</p>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', textAlign: 'left', gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                    <Mail size={16} color="#64748b" />
                                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>{viewProfile.email || 'Email not provided'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={16} color="#64748b" />
                                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>{viewProfile.phone || 'Phone not provided'}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem', textAlign: 'left' }}>Assigned Subjects</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {(viewProfile.subjects || 'No subjects assigned').split(',').map((sub, idx) => (
                                    <span key={idx} style={{ padding: '4px 10px', background: '#dbeafe', color: '#1e40af', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                        {sub.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </SimpleModal>
        </div>
    );
});

export const CIEScheduleSection = memo(({ schedules = [], onDownload }) => {
    const [selectedDept, setSelectedDept] = useState(null);
    const departments = ['CSE', 'MECH', 'EEE', 'CV', 'MT'];

    const filteredSchedules = useMemo(() => {
        if (!selectedDept) return [];
        return schedules.filter(s => s.subject?.department === selectedDept);
    }, [schedules, selectedDept]);

    if (!selectedDept) {
        return (
            <div className={styles.sectionVisible}>
                <h2 className={styles.chartTitle} style={{ marginBottom: '1.5rem' }}>Select Department for CIE Schedule</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
                    {departments.map(dept => (
                        <div
                            key={dept}
                            className={styles.glassCard}
                            onClick={() => setSelectedDept(dept)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '3rem', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid #e2e8f0',
                                minHeight: '220px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ padding: '1rem', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', marginBottom: '1rem' }}>
                                <Building size={32} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{dept}</h3>
                            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>View Schedules</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.sectionVisible}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setSelectedDept(null)}
                    style={{
                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 500
                    }}
                >
                    &larr; Back
                </button>
                <h2 className={styles.chartTitle} style={{ margin: 0 }}>{selectedDept} - CIE Examination Schedules</h2>
            </div>

            {/* DEBUG INFO - Remove after fixing */}
            <div style={{ padding: '10px', background: '#fff0f0', color: '#dc2626', marginBottom: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                <strong>Debug Info:</strong> Total Schedules Fetched: {schedules.length} <br />
                Available Departments in Data: {[...new Set(schedules.map(s => s.subject ? s.subject.department : 'No Subject'))].join(', ')}
            </div>

            {/* Empty State */}
            {filteredSchedules.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No exams scheduled for {selectedDept}.</p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredSchedules.map(t => (
                    <div key={t.id} className={styles.glassCard} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', position: 'relative', borderLeft: '4px solid #0ea5e9' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                                    {t.subject ? t.subject.name : 'Unknown Subject'}
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                                    {t.cieNumber} | {t.subject?.code}
                                </p>
                            </div>
                            <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                background: t.status === 'COMPLETED' ? '#dcfce7' : '#e0f2fe',
                                color: t.status === 'COMPLETED' ? '#166534' : '#0369a1'
                            }}>
                                {t.status || 'SCHEDULED'}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem', fontSize: '0.9rem', color: '#334155' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="#64748b" />
                                <span style={{ fontWeight: 500 }}>{t.scheduledDate || 'Date TBD'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} color="#64748b" />
                                <span>{t.startTime || 'Time TBD'} ({t.durationMinutes || 60} min)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={16} color="#64748b" />
                                <span>Room: {t.examRoom || 'TBD'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building size={16} color="#64748b" />
                                <span>{t.subject?.department} - Sem {t.subject?.semester}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                            <UserCheck size={14} />
                            <span>
                                Scheduled by: <span style={{ fontWeight: 600, color: '#475569' }}>
                                    {t.faculty ? t.faculty.username : 'Unknown'}
                                </span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export const NotificationsSection = memo(({
    notifications = [],
    recipientType = 'HOD',
    setRecipientType,
    targetDept = 'ALL',
    setTargetDept,
    messageText = '',
    setMessageText,
    onSend,
    onClear,
    onDelete
}) => (
    <div className={styles.sectionVisible}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className={styles.chartTitle}>Notifications</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Send Message Form */}
            <div className={styles.glassCard} style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Send Message</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Recipient Group</label>
                        <select
                            className={styles.filterSelect}
                            style={{ width: '100%' }}
                            value={recipientType}
                            onChange={(e) => setRecipientType && setRecipientType(e.target.value)}
                        >
                            <option value="HOD">All HODs</option>
                            <option value="FACULTY">All Faculty</option>
                            <option value="STUDENT">All Students</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Target Department</label>
                        <select
                            className={styles.filterSelect}
                            style={{ width: '100%' }}
                            value={targetDept}
                            onChange={(e) => setTargetDept && setTargetDept(e.target.value)}
                        >
                            <option value="ALL">All Departments</option>
                            <option value="CSE">CSE</option>
                            <option value="ECE">ECE</option>
                            <option value="ME">ME</option>
                            <option value="CV">CV</option>
                            <option value="ISE">ISE</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>Message</label>
                        <textarea
                            rows="5"
                            placeholder="Type your message here..."
                            value={messageText}
                            onChange={(e) => setMessageText && setMessageText(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button
                        onClick={onSend}
                        disabled={!messageText.trim()}
                        style={{
                            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.65rem 1.5rem', borderRadius: '0.5rem', border: 'none',
                            background: messageText.trim() ? '#2563eb' : '#94a3b8', color: 'white',
                            fontWeight: 600, fontSize: '0.9rem', cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                            transition: 'background 0.2s'
                        }}
                    >
                        <Send size={16} /> Send Message
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className={styles.glassCard} style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Inbox &amp; Sent</h3>
                    {notifications.length > 0 && onClear && (
                        <button
                            onClick={onClear}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                        >
                            <Trash2 size={14} /> Clear All
                        </button>
                    )}
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map(notif => (
                        <div key={notif.id} style={{
                            position: 'relative', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                            padding: '0.85rem',
                            borderBottom: '1px solid #f1f5f9',
                            background: notif.type === 'SENT'
                                ? 'linear-gradient(90deg, #f0fdf4, #dcfce7)'
                                : notif.isRead ? 'transparent' : '#f0f9ff',
                            borderLeft: notif.type === 'SENT' ? '3px solid #16a34a' : 'none',
                            borderRadius: '6px', marginBottom: '4px'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                background: notif.type === 'SENT' ? '#dcfce7'
                                    : notif.type === 'WARNING' ? '#fef3c7' : '#e0f2fe',
                                borderRadius: '8px',
                                color: notif.type === 'SENT' ? '#16a34a'
                                    : notif.type === 'WARNING' ? '#d97706' : '#0369a1',
                                flexShrink: 0
                            }}>
                                {notif.type === 'SENT' ? <Send size={18} /> : notif.type === 'WARNING' ? <AlertTriangle size={18} /> : <Bell size={18} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                {notif.type === 'SENT' && (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Sent</span>
                                )}
                                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>{notif.message}</p>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(notif.createdAt).toLocaleString()}</span>
                                {notif.category && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: notif.type === 'SENT' ? '#bbf7d0' : '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: notif.type === 'SENT' ? '#15803d' : '#475569' }}>{notif.category}</span>}
                            </div>
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(notif.id)}
                                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                    title="Delete"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <Bell size={48} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>No notifications yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
));

export const ReportsSection = memo(({ reports = [], onDownload }) => (
    <div className={styles.sectionVisible}>
        <h2 className={styles.chartTitle} style={{ marginBottom: '1.5rem' }}>Reports Center</h2>
        <div className={styles.glassCard}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Report Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Generated Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map(r => (
                        <tr key={r.id}>
                            <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                <FileText size={16} color="#64748b" /> {r.name}
                            </td>
                            <td>{r.type}</td>
                            <td>{r.size}</td>
                            <td>{r.date}</td>
                            <td>
                                <button className={styles.actionBtn} onClick={() => onDownload(r)}>Download</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
));

export const ManageHODsSection = memo(({ hods = [], onCreate, user, departments = [], onRefresh, onUpdate, onDelete }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingHod, setEditingHod] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Fixed 5 departments + ability to add more
    const FIXED_DEPTS = [
        { id: 'CSE', name: 'Computer Science & Engineering' },
        { id: 'EEE', name: 'Electrical Electronics & Engineering' },
        { id: 'MECH', name: 'Mechanical Engineering' },
        { id: 'CIVIL', name: 'Civil Engineering' },
        { id: 'MT', name: 'Metallurgy' },
    ];
    const [customDepts, setCustomDepts] = useState([]);
    const [showAddDeptInput, setShowAddDeptInput] = useState(false);
    const [newDeptId, setNewDeptId] = useState('');
    const [newDeptName, setNewDeptName] = useState('');

    const allDepts = [...FIXED_DEPTS, ...customDepts];

    const handleAddDept = () => {
        const id = newDeptId.trim().toUpperCase();
        const nm = newDeptName.trim();
        if (!id || !nm) { alert('Please enter both department code and name.'); return; }
        if (allDepts.some(d => d.id === id)) { alert('Department code already exists.'); return; }
        setCustomDepts(prev => [...prev, { id, name: nm }]);
        setNewDeptId('');
        setNewDeptName('');
        setShowAddDeptInput(false);
        setDepartment(id);
    };

    const handleRefresh = async () => {
        if (!onRefresh) return;
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
    };

    const handleEdit = (hod) => {
        setEditingHod(hod);
        setName(hod.fullName);
        setUsername(hod.username);
        setEmail(hod.email || '');
        setDepartment(hod.department);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingHod(null);
        setName('');
        setUsername('');
        setEmail('');
        setPassword('');
        setDepartment('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || (!editingHod && !username) || !department) {
            alert('Name and Department are required.');
            return;
        }
        if (!editingHod && !password) {
            alert('Password is required.');
            return;
        }

        if (editingHod) {
            await onUpdate(editingHod.id, { fullName: name, username, email, password, department });
            setEditingHod(null);
        } else {
            await onCreate({ fullName: name, username, email, password, department });
        }

        // Reset form
        setName('');
        setUsername('');
        setEmail('');
        setPassword('');
        setDepartment('');
    };

    return (
        <div className={styles.sectionVisible}>
            {/* --- HOD BANNER --- */}
            <div className={styles.hodBanner}>
                <div className={styles.hodBannerDecorator}></div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                            <div style={{ padding: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', backdropFilter: 'blur(4px)' }}>
                                <ShieldCheck size={20} color="white" />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.9 }}>Administrative Control</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Department Leadership</h1>
                        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', opacity: 0.9, maxWidth: '600px' }}>
                            Manage and register Head of Departments. Assigned HODs will have full administrative access to their respective department rosters and CIE management.
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className={styles.secondaryBtn}
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        {isRefreshing ? 'Fetching...' : 'Refresh List'}
                    </button>
                </div>
            </div>

            <div className={styles.glassCard} style={{ padding: '2.5rem', marginBottom: '2.5rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '24px', background: editingHod ? '#f59e0b' : '#8b5cf6', borderRadius: '2px' }}></div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                            {editingHod ? 'Update HOD Details' : 'HOD Registration'}
                        </h3>
                    </div>
                    {editingHod && (
                        <button
                            onClick={handleCancelEdit}
                            className={styles.secondaryBtn}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.6rem', color: '#475569', fontSize: '0.9rem' }}>Full Name *</label>
                            <input
                                className={styles.inputField}
                                placeholder="e.g. Dr. John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.6rem', color: '#475569', fontSize: '0.9rem' }}>Employee ID (Username) *</label>
                            <input
                                className={styles.inputField}
                                placeholder="e.g. HODCS01"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.6rem', color: '#475569', fontSize: '0.9rem' }}>Institutional Email</label>
                            <input
                                className={styles.inputField}
                                type="email"
                                placeholder="e.g. john.doe@sgp.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.6rem', color: '#475569', fontSize: '0.9rem' }}>{editingHod ? 'Reset Password (Leave blank to keep current)' : 'Password *'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className={styles.inputField}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={editingHod ? "New password (optional)" : "Set a strong password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required={!editingHod}
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px'
                                    }}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.6rem', color: '#475569', fontSize: '0.9rem' }}>Assigned Department *</label>
                            <select
                                className={styles.filterSelect}
                                style={{ width: '100%' }}
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                required
                            >
                                <option value="">Select Department</option>
                                {allDepts.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                                ))}
                            </select>
                            {/* + Add New Department */}
                            {!showAddDeptInput ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAddDeptInput(true)}
                                    style={{ marginTop: '0.6rem', background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                                >
                                    + Add New Department
                                </button>
                            ) : (
                                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input
                                        placeholder="Code (e.g. EEE)"
                                        value={newDeptId}
                                        onChange={e => setNewDeptId(e.target.value)}
                                        style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '110px' }}
                                        maxLength={8}
                                    />
                                    <input
                                        placeholder="Full name (e.g. Electrical Engg.)"
                                        value={newDeptName}
                                        onChange={e => setNewDeptName(e.target.value)}
                                        style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', flex: 1, minWidth: '160px' }}
                                    />
                                    <button type="button" onClick={handleAddDept} style={{ padding: '0.4rem 0.9rem', borderRadius: '6px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Add</button>
                                    <button type="button" onClick={() => { setShowAddDeptInput(false); setNewDeptId(''); setNewDeptName(''); }} style={{ padding: '0.4rem 0.9rem', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                            <AlertTriangle size={16} />
                            <span>{editingHod ? 'Username & password cannot be changed here.' : 'HOD will log in with the password you set above.'}</span>
                        </div>
                        <button type="submit" className={editingHod ? styles.primaryBtn : styles.submitBtn} style={editingHod ? { background: '#f59e0b' } : {}}>
                            {editingHod ? <><RefreshCw size={20} /> Update Information</> : <><UserCheck size={20} /> Register & Grant Access</>}
                        </button>
                    </div>
                </form>
            </div>

            <div className={styles.tableCard} style={{ borderRadius: '24px', padding: '0' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Institutional HOD Directory</h3>
                    <span style={{ padding: '4px 12px', background: '#f1f5f9', color: '#64748b', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {hods.length} Active HODs
                    </span>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ paddingLeft: '2rem' }}>Sl. No</th>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Email</th>
                            <th style={{ paddingRight: '2rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hods.map((h, index) => (
                            <tr key={h.id}>
                                <td style={{ paddingLeft: '2rem', color: '#64748b', fontWeight: 500 }}>{index + 1}</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{h.username}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                            {h.fullName.charAt(0)}
                                        </div>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{h.fullName}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>
                                        {h.department}
                                    </span>
                                </td>
                                <td style={{ color: '#64748b' }}>{h.email || <span style={{ opacity: 0.5 }}>—</span>}</td>
                                <td style={{ paddingRight: '2rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => handleEdit(h)}
                                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                                            title="Edit HOD"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => { if (window.confirm(`Are you sure you want to remove ${h.fullName}?`)) onDelete(h.id); }}
                                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                                            title="Delete HOD"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {hods.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                    <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.1 }} />
                                    <p style={{ margin: 0, fontSize: '1rem' }}>No HODs have been registered yet.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
