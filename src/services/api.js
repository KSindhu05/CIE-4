const API_BASE_URL = 'http://127.0.0.1:8084/api';

const safeJson = async (response) => {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (e) {
        console.warn('Failed to parse JSON:', text);
        return {};
    }
};

export const login = async (userId, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: userId, password }),
        });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Login failed');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Network Error' };
    }
};

export const fetchStudentDashboard = async (regNo) => {
    try {
        const response = await fetch(`${API_BASE_URL}/student/dashboard?regNo=${regNo}`);
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch student data');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch dashboard error:', error);
        return null;
    }
};

export const fetchHODDashboard = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/hod/dashboard`);
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch HOD data');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch dashboard error:', error);
        return null;
    }
};

export const fetchPrincipalDashboard = async (token) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/dashboard`, { headers });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch principal dashboard');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch dashboard error:', error);
        return null;
    }
};

export const fetchAllFaculty = async (token) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/faculty/all`, { headers });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch faculty list');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch faculty error:', error);
        return [];
    }
};

export const fetchTimetables = async (token) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/timetables`, { headers });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch timetables');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch timetables error:', error);
        return [];
    }
};

export const fetchNotifications = async (token) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/notifications`, { headers });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch notifications');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return [];
    }
};

export const fetchReports = async (token) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/reports`, { headers });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch reports');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch reports error:', error);
        return [];
    }
};

export const fetchHods = async (token) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/hods`, { headers });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to fetch HODs');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch HODs error:', error);
        return [];
    }
};

export const createHod = async (token, hodData) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_BASE_URL}/principal/hod`, {
            method: 'POST',
            headers,
            body: JSON.stringify(hodData),
        });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to create HOD');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Create HOD error:', error);
        throw error;
    }
};

export const updateHod = async (token, id, hodData) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const response = await fetch(`${API_BASE_URL}/principal/hod/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(hodData),
        });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to update HOD');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Update HOD error:', error);
        throw error;
    }
};

export const deleteHod = async (token, id) => {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/principal/hod/${id}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) {
            const errorData = await safeJson(response);
            throw new Error(errorData.message || 'Failed to delete HOD');
        }
        return await safeJson(response);
    } catch (error) {
        console.error('Delete HOD error:', error);
        throw error;
    }
};

export const fetchSemesterStatus = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/semester/status`);
        return await safeJson(response);
    } catch (error) {
        console.error('Fetch semester status error:', error);
        return { status: 'ACTIVE' };
    }
};

export const updateSemesterStatus = async (token, status) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/semester/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        return await safeJson(response);
    } catch (error) {
        console.error('Update semester status error:', error);
        throw error;
    }
};

export const resetMarks = async (token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/semester/reset-marks`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await safeJson(response);
    } catch (error) {
        console.error('Reset marks error:', error);
        throw error;
    }
};

export const resetFaculty = async (token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/semester/reset-faculty`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await safeJson(response);
    } catch (error) {
        console.error('Reset faculty error:', error);
        throw error;
    }
};

export const cleanupData = async (token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/semester/cleanup-data`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await safeJson(response);
    } catch (error) {
        console.error('Cleanup data error:', error);
        throw error;
    }
};

export const shiftSemesters = async (token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/principal/semester/shift`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await safeJson(response);
    } catch (error) {
        console.error('Shift semesters error:', error);
        throw error;
    }
};
