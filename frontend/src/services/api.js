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

export async function fetchReportDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=detail&id=${id}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching report detail:', err);
    return { success: false, error: err.message };
  }
}

export async function assignReport({ report_id, assigned_to, assigned_by = 1, notes = '' }) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id, assigned_to, assigned_by, notes }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error assigning report:', err);
    return { success: false, message: err.message };
  }
}

export async function updateReportStatus({ report_id, status, remarks = '', changed_by = 1 }) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=update_status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id, status, remarks, changed_by }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating report status:', err);
    return { success: false, message: err.message };
  }
}

export async function deleteReport(reportId) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ report_id: reportId }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting report:', err);
    return { success: false, message: 'Connection error while deleting report.' };
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

export async function addBuilding(data) {
  try {
    const res = await fetch(`${API_BASE}/buildings.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('Error adding building:', err);
    return { success: false, message: err.message };
  }
}

export async function fetchStaff() {
  try {
    const res = await fetch(`${API_BASE}/staff.php`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching staff:', err);
    return { success: false, data: [] };
  }
}

export async function addStaffMember(data) {
  try {
    const res = await fetch(`${API_BASE}/staff.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('Error adding staff member:', err);
    return { success: false, message: err.message };
  }
}

export async function fetchUsers(filters = {}) {
  try {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/users.php?${query}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching users:', err);
    return { success: false, data: [] };
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

export async function updateProfilePicture(avatarData) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=update_avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ avatar_url: avatarData }),
    });
    return await res.json();
  } catch (err) {
    console.error('updateProfilePicture error:', err);
    return { success: false, message: 'Failed to update profile picture.' };
  }
}

export async function updateUserProfile(profileData) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=update_profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profileData),
    });
    return await res.json();
  } catch (err) {
    console.error('updateUserProfile error:', err);
    return { success: false, message: 'Failed to update profile details.' };
  }
}

export async function changeUserPassword({ current_password, new_password }) {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ current_password, new_password }),
    });
    return await res.json();
  } catch (err) {
    console.error('changeUserPassword error:', err);
    return { success: false, message: 'Failed to update password.' };
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


