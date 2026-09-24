/**
 * FixMyCampus API Client
 * Facilitates REST requests between the React client and the PHP API endpoints.
 */

const API_BASE = '/api';

export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats.php`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching stats:', err);
    return { success: false, error: err.message, db_connected: false };
  }
}

export async function fetchReports(filters = {}) {
  try {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/reports.php?${query}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching reports:', err);
    return { success: false, data: [] };
  }
}

export async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories.php`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching categories:', err);
    return { success: false, data: [] };
  }
}

export async function fetchBuildings() {
  try {
    const res = await fetch(`${API_BASE}/buildings.php`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching buildings:', err);
    return { success: false, buildings: [], locations: [] };
  }
}

export async function fetchAuthMe() {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=me`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching auth me:', err);
    return { authenticated: false, user: null };
  }
}

export async function loginUser({ email, password, remember = false }) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, remember }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API login request error:', err);
    return {
      success: false,
      message: 'Unable to connect to the backend server. Please verify Docker is running.',
    };
  }
}

export async function registerUser({ identifier, fullName, email, department, password }) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, full_name: fullName, email, department, password }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API register request error:', err);
    return {
      success: false,
      message: 'Unable to connect to the backend server. Please verify Docker is running.',
    };
  }
}

export async function sendOtp(email) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=send_otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Backend send_otp failed:', err);
    return {
      success: false,
      message: 'Unable to connect to the authentication server. Please verify Docker backend is running.',
    };
  }
}

export async function resetPassword({ email, otp, newPassword }) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=reset_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp, password: newPassword }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Backend reset_password failed:', err);
    return {
      success: false,
      message: 'Unable to connect to the authentication server.',
    };
  }
}

export async function fetchGoogleConfig() {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=google_config`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch google config from API:', err);
    return { success: true, client_id: '', allowed_domain: 'phinmaed.com' };
  }
}

export async function loginWithGoogle({ credential, mockEmail }) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=google_login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential, mock_email: mockEmail }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error logging in with Google:', err);
    return {
      success: false,
      message: 'Failed to communicate with authentication server.',
    };
  }
}

export async function logoutUser() {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.error('Logout error:', err);
  }
  return { success: true };
}

export async function fetchAdminOverview() {
  try {
    const res = await fetch(`${API_BASE}/admin.php?action=overview`, {
      credentials: 'include',
    });
    return await res.json();
  } catch (err) {
    console.error('fetchAdminOverview error:', err);
    return { success: false, message: 'Failed to fetch admin overview.' };
  }
}

export async function fetchAdminUsers(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/admin.php?action=users&${query}`, {
      credentials: 'include',
    });
    return await res.json();
  } catch (err) {
    console.error('fetchAdminUsers error:', err);
    return { success: false, message: 'Failed to fetch users list.' };
  }
}

export async function updateAdminUserRole(userId, roleId) {
  try {
    const res = await fetch(`${API_BASE}/admin.php?action=update_role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    });
    return await res.json();
  } catch (err) {
    console.error('updateAdminUserRole error:', err);
    return { success: false, message: 'Failed to update user role.' };
  }
}

export async function updateAdminUserStatus(userId, status) {
  try {
    const res = await fetch(`${API_BASE}/admin.php?action=update_status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, status }),
    });
    return await res.json();
  } catch (err) {
    console.error('updateAdminUserStatus error:', err);
    return { success: false, message: 'Failed to update user status.' };
  }
}

export async function createReport(reportData) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(reportData),
    });
    return await res.json();
  } catch (err) {
    console.error('createReport error:', err);
    return { success: false, message: 'Failed to submit report. Please check server connection.' };
  }
}

