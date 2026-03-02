import React, { useState, useMemo, memo } from 'react';
import { X, Search, Filter, Download, AlertTriangle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import styles from '../../../pages/PrincipalDashboard.module.css';
import { useAuth } from '../../../context/AuthContext';
import API_BASE_URL from '../../../config/api';

const StudentProfileModal = ({ selectedStudentProfile, setSelectedStudentProfile, selectedDept }) => {
    if (!selectedStudentProfile) return null;
    const s = selectedStudentProfile;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedStudentProfile(null)}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '600px',
                padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => setSelectedStudentProfile(null)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <X size={24} color="#64748b" />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px', height: '80px', background: '#e0f2fe', color: '#0369a1',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 1rem'
                    }}>
                        {s.name.charAt(0)}
                    </div>
                    <h2 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>{s.name}</h2>
                    <p style={{ margin: 0, color: '#64748b' }}>{s.regNo || s.rollNo} | {selectedDept?.name} | {s.semester || s.sem} Sem</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className={styles.glassCard} style={{ padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.9rem' }}>Academic Performance</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>CIE-1</span>
                            <span>{s.marks?.cie1 || 0}/20</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>CIE-2</span>
                            <span>{s.marks?.cie2 || 0}/20</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                            <span>Total</span>
                            <span>{(s.marks?.cie1 || 0) + (s.marks?.cie2 || 0)}/40</span>
                        </div>
                    </div>
                    <div className={styles.glassCard} style={{ padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.9rem' }}>Behavior</h4>
                        <div>
                            <span style={{ padding: '4px 8px', background: '#f0f9ff', color: '#0284c7', borderRadius: '4px', fontSize: '0.8rem' }}>Good Conduct</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={styles.primaryBtn} onClick={() => alert('Report Generated')}>Download Report Card</button>
                    <button className={styles.secondaryBtn} onClick={() => alert('Contacting Parents...')}>Contact Parent</button>
                </div>
            </div>
        </div>
    );
};

export const DirectorySection = memo(({ departments = [], selectedDept, deptStudents, handleDeptClick, setSelectedDept, setSelectedStudentProfile: propSetSelectedStudentProfile }) => {
    const { user } = useAuth();
    const [semester, setSemester] = useState('2nd');
    const [section, setSection] = useState('A');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAtRisk, setShowAtRisk] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const itemsPerPage = 10000; // Show all students

    const [internalSelectedStudent, setInternalSelectedStudent] = useState(null);

    const handleViewProfile = (student) => {
        if (propSetSelectedStudentProfile) {
            propSetSelectedStudentProfile(student);
        }
        setInternalSelectedStudent(student);
    };

    const handleSelectStudent = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedStudents(paginatedStudents.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    // State for students fetched from API
    const [apiStudents, setApiStudents] = useState([]);
    const [localLoading, setLocalLoading] = useState(false);

    // Fetch students when department changes (or on mount if all)
    React.useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedDept || !selectedDept.id) return;

            setLocalLoading(true);
            try {
                // Determine API endpoint
                const token = user?.token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const endpoint = `${API_BASE_URL}/student/all?department=${selectedDept.id}`;
                const response = await fetch(endpoint, { headers });

                if (response.ok) {
                    const data = await response.json();
                    setApiStudents(data);
                } else {
                    console.error("Failed to fetch students");
                    setApiStudents([]);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLocalLoading(false);
            }
        };

        if (user) {
            fetchStudents();
        }
    }, [selectedDept, user]);


    // Derived State: Filtered Students
    const filteredStudents = useMemo(() => {
        setCurrentPage(1);

        // Use API data
        let baseList = apiStudents;

        return baseList.filter(s => {
            const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.regNo || '').includes(searchQuery);
            // Optional: Filter by sem/sec if selected (omitted for strictly search-based for now or add back if needed)
            const matchesSem = semester === 'All' || s.semester == semester.replace(/\D/g, ''); // Extract number
            const matchesSec = section === 'All' || s.section === section;

            // Risk calculation: student is at risk if total CIE marks < 40% (16/40)
            const totalMarks = (s.marks?.cie1 || 0) + (s.marks?.cie2 || 0);
            const isAtRisk = totalMarks < 16;

            // If filter is active, only show at-risk students; otherwise show all
            const matchesRisk = showAtRisk ? isAtRisk : true;

            return matchesSearch && matchesSem && matchesSec && matchesRisk;
        });
    }, [apiStudents, searchQuery, showAtRisk, semester, section]);

    // Pagination Logic
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(start, start + itemsPerPage);
    }, [currentPage, filteredStudents]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    if (!selectedDept) {
        return (
            <div className={styles.sectionVisible}>
                <h3 className={styles.chartTitle} style={{ marginBottom: '1.5rem' }}>Select Department</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {departments.map(dept => (
                        <div
                            key={dept.id}
                            className={styles.glassCard}
                            onClick={() => handleDeptClick(dept)}
                            style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                borderLeft: `4px solid ${dept.id === 'CS' ? '#3b82f6' : dept.id === 'ME' ? '#f59e0b' : '#10b981'}`
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1.2rem', color: '#1e293b', margin: 0 }}>{dept.name}</h4>
                                <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{dept.id}</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                <p>HOD: {dept.hod}</p>
                                <p>Total Students: {dept.studentCount}</p>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '0.9rem' }}>View Students →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.sectionVisible}>
            {/* --- NEW COLORFUL HEADER BANNER --- */}
            <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                borderRadius: '24px',
                padding: '2rem',
                color: 'white',
                marginBottom: '2rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
            }}>
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-20px', left: '100px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>

                <button
                    onClick={() => setSelectedDept(null)}
                    style={{
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '12px', padding: '0.5rem 1rem', color: 'white', fontSize: '0.9rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem',
                        fontWeight: 500, transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                    <ArrowLeft size={16} /> Back to Departments
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1px' }}>{selectedDept.name}</h1>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem' }}>Student Directory & Performance</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Total Students</p>
                            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{filteredStudents.length}</p>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- ACTION TOOLBAR --- */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem',
                background: 'white', padding: '1rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem'
            }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div className={styles.searchWrapper}>
                        <input
                            placeholder="Search by Name or Reg No..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className={styles.searchIcon}>
                            <Search size={18} />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAtRisk(!showAtRisk)}
                        style={{
                            padding: '0.7rem 1rem', borderRadius: '10px',
                            border: showAtRisk ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                            background: showAtRisk ? '#eff6ff' : 'white', color: showAtRisk ? '#2563eb' : '#0f172a',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Filter size={16} /> {showAtRisk ? 'At Risk' : 'Filter'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                        <select
                            className={styles.filterSelect}
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                        >
                            {['1st', '2nd', '3rd', '4th', '5th'].map(sem => (
                                <option key={sem} value={sem}>{sem} Sem</option>
                            ))}
                        </select>

                        <select
                            className={styles.filterSelect}
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                        >
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                            <option value="C">Section C</option>
                            <option value="D">Section D</option>
                        </select>
                    </div>

                    <button
                        style={{
                            padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0',
                            background: 'white', color: '#0f172a',
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600
                        }}
                        onClick={() => {
                            if (filteredStudents.length === 0) return;
                            // Build CSV content
                            const headers = ['Sl No', 'Reg No', 'Name', 'Semester', 'Section', 'Department', 'Email', 'Phone', 'Parent Phone'];
                            const rows = filteredStudents.map((s, i) => [
                                i + 1,
                                s.regNo || '',
                                (s.name || '').replace(/,/g, ' '),
                                s.semester || '',
                                s.section || '',
                                s.department || selectedDept?.id || '',
                                s.email || '',
                                s.phone || '',
                                s.parentPhone || ''
                            ]);
                            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${selectedDept?.id || 'students'}_Sem${semester}_Sec${section}_students.csv`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        }}
                    >
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* --- BULK ACTIONS BAR --- */}
            {selectedStudents.length > 0 && (
                <div style={{
                    background: '#0f172a', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px',
                    marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.2s',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CheckCircle size={20} color="#4ade80" />
                        <span style={{ fontWeight: 600 }}>{selectedStudents.length} students selected</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }} onClick={() => alert("Sending SMS to selected parents...")}>Send SMS</button>
                        <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }} onClick={() => alert("Printing Reports...")}>Print Reports</button>
                        <button style={{ background: 'white', border: 'none', color: '#0f172a', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedStudents([])}>Clear</button>
                    </div>
                </div>
            )}

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}><input type="checkbox" onChange={handleSelectAll} checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0} /></th>
                            <th style={{ width: '60px' }}>Sl. No</th>
                            <th>Reg No</th>
                            <th>Name</th>
                            <th>Sem</th>

                            <th>CIE Performance</th>

                            <th>Mentoring</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStudents.length > 0 ? (
                            paginatedStudents.map((student, index) => (
                                <tr key={student.id} onClick={() => handleViewProfile(student)} style={{ cursor: 'pointer', background: selectedStudents.includes(student.id) ? '#f0f9ff' : 'transparent' }}>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleSelectStudent(student.id)} />
                                    </td>
                                    <td style={{ color: '#64748b', fontWeight: 500 }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>{student.regNo || student.rollNo}</td>
                                    <td style={{ fontWeight: 600 }}>
                                        {student.name}
                                    </td>
                                    <td>{student.semester || student.sem}</td>

                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${((student.marks?.cie1 || 0) + (student.marks?.cie2 || 0)) / 40 * 100}%`,
                                                    height: '100%',
                                                    background: (((student.marks?.cie1 || 0) + (student.marks?.cie2 || 0)) / 40) >= 0.5 ? '#3b82f6' : '#f59e0b'
                                                }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{Math.round(((student.marks?.cie1 || 0) + (student.marks?.cie2 || 0)) / 40 * 100)}%</span>
                                        </div>
                                    </td>

                                    <td>
                                        {student.mentoringStatus === 'Done' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.85rem' }}>
                                                <CheckCircle size={14} color="#10b981" /> Done
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 500 }}>
                                                <Clock size={14} /> Pending
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <button className={styles.secondaryBtn} onClick={(e) => { e.stopPropagation(); handleViewProfile(student); }} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <Search size={32} color="#cbd5e1" />
                                        <p style={{ margin: 0 }}>No students found matching your filters.</p>
                                        <button
                                            onClick={() => { setSearchQuery(''); setShowAtRisk(false); }}
                                            style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer showing count */}
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                    Showing all {filteredStudents.length} students
                </div>
            </div>

            <StudentProfileModal
                selectedStudentProfile={internalSelectedStudent}
                setSelectedStudentProfile={setInternalSelectedStudent}
                selectedDept={selectedDept}
            />
        </div>
    );
});
