/**
 * FixMyCampus API Client
 * Facilitates REST requests between the React client and the PHP API endpoints.
 */

const API_BASE = '/api';

export async function fetchFeedback(params = {}) {
  try {
    const res = await fetch(`${API_BASE}/feedback.php?${new URLSearchParams(params)}`, {
      credentials: 'include', cache: 'no-store',
    });
    return { ...await res.json(), httpStatus: res.status };
  } catch {
    return { success: false, message: 'Unable to load feedback. Please try again.' };
  }
}

export async function submitFeedback({ report_id, rating, comments }) {
  try {
    const res = await fetch(`${API_BASE}/feedback.php`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id, rating, comments }),
    });
    return { ...await res.json(), httpStatus: res.status };
  } catch {
    return { success: false, message: 'Unable to submit feedback. Please check your connection and try again.' };
  }
}

export async function fetchStats(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE}/stats.php?${query}` : `${API_BASE}/stats.php`;
    const res = await fetch(url, {
      credentials: 'include',
    });
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
    const res = await fetch(`${API_BASE}/reports.php?${query}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching reports:', err);
    return { success: false, data: [] };
  }
}

export async function fetchReportDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=detail&id=${id}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching report detail:', err);
    return { success: false, error: err.message };
  }
}

export async function assignReport({ report_id, assigned_to, assigned_by = 1, expected_admin_id, notes = '' }) {
  try {
    const session = await fetchAuthMe();
    if (!session.authenticated || session.user?.role_name !== 'admin'
      || (expected_admin_id != null && Number(session.user.id) !== Number(expected_admin_id))) {
      return {
        success: false,
        error_code: 'SESSION_CHANGED',
        message: 'Your login session has changed or expired. Please sign in as an administrator again before assigning a worker. Tabs in the same browser share a login session.',
      };
    }
    const res = await fetch(`${API_BASE}/reports.php?action=assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
      credentials: 'include',
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

export async function archiveReport(reportId) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ report_id: reportId }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error archiving report:', err);
    return { success: false, message: 'Connection error while archiving report.' };
  }
}

export async function restoreReport(reportId) {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=unarchive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ report_id: reportId }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error restoring report:', err);
    return { success: false, message: 'Connection error while restoring report.' };
  }
}

export async function fetchHistoryLogs({ page = 1, limit = 10, type = 'all', search = '' } = {}) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      type,
    });
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/history_logs.php?${params.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching history logs:', err);
    return {
      success: false,
      data: [],
      summary: { all: 0, user_login: 0, user_registration: 0, report_submitted: 0, status_change: 0, report_archived: 0 },
      pagination: { total: 0, page: 1, limit: 10, total_pages: 1 },
    };
  }
}

export async function deleteHistoryLog(id) {
  try {
    const res = await fetch(`${API_BASE}/history_logs.php?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting history log:', err);
    return { success: false, message: 'Connection error while deleting history log.' };
  }
}

export async function deleteMultipleHistoryLogs(ids = [], { clearAll = false, type = 'all' } = {}) {
  try {
    const res = await fetch(`${API_BASE}/history_logs.php?action=delete_multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids, clear_all: clearAll, type }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting multiple history logs:', err);
    return { success: false, message: 'Connection error while clearing history logs.' };
  }
}

export async function fetchNotifications(userId = null, dashboard = null, options = {}) {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (dashboard) params.append('dashboard', dashboard);
    if (options.is_archived !== undefined) {
      params.append('is_archived', options.is_archived ? '1' : '0');
    }
    if (options.filter) {
      params.append('filter', options.filter);
    }
    if (options.include_archived) {
      params.append('include_archived', '1');
    }
    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/notifications.php?${queryString}` : `${API_BASE}/notifications.php`;
    const headers = {};
    if (userId) headers['X-User-ID'] = String(userId);
    const res = await fetch(url, {
      credentials: 'include',
      headers,
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return { success: false, unread_count: 0, count: 0, data: [] };
  }
}

export async function markNotificationRead(id, userId = null, dashboard = null) {
  try {
    const params = new URLSearchParams({ action: 'mark_read' });
    if (id) params.append('id', id);
    if (userId) params.append('user_id', userId);
    if (dashboard) params.append('dashboard', dashboard);
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-ID'] = String(userId);
    const res = await fetch(`${API_BASE}/notifications.php?${params.toString()}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ id, user_id: userId, dashboard }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return { success: false, message: err.message };
  }
}

export async function markAllNotificationsRead(userId = null, dashboard = null) {
  try {
    const params = new URLSearchParams({ action: 'mark_all_read' });
    if (userId) params.append('user_id', userId);
    if (dashboard) params.append('dashboard', dashboard);
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-ID'] = String(userId);
    const res = await fetch(`${API_BASE}/notifications.php?${params.toString()}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, dashboard }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return { success: false, message: err.message };
  }
}

export async function archiveNotification(id, userId = null, dashboard = null) {
  try {
    const params = new URLSearchParams({ action: 'archive' });
    if (id) params.append('id', id);
    if (userId) params.append('user_id', userId);
    if (dashboard) params.append('dashboard', dashboard);
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-ID'] = String(userId);
    const res = await fetch(`${API_BASE}/notifications.php?${params.toString()}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ id, user_id: userId, dashboard }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error archiving notification:', err);
    return { success: false, message: err.message };
  }
}

export async function unarchiveNotification(id, userId = null, dashboard = null) {
  try {
    const params = new URLSearchParams({ action: 'unarchive' });
    if (id) params.append('id', id);
    if (userId) params.append('user_id', userId);
    if (dashboard) params.append('dashboard', dashboard);
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-ID'] = String(userId);
    const res = await fetch(`${API_BASE}/notifications.php?${params.toString()}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ id, user_id: userId, dashboard }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error unarchiving notification:', err);
    return { success: false, message: err.message };
  }
}

export async function archiveAllNotifications(userId = null, dashboard = null) {
  try {
    const params = new URLSearchParams({ action: 'archive_all' });
    if (userId) params.append('user_id', userId);
    if (dashboard) params.append('dashboard', dashboard);
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers['X-User-ID'] = String(userId);
    const res = await fetch(`${API_BASE}/notifications.php?${params.toString()}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, dashboard }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error archiving all notifications:', err);
    return { success: false, message: err.message };
  }
}

export async function deleteNotification(id, userId = null, dashboard = null) {
  return archiveNotification(id, userId, dashboard);
}

export async function deleteAllNotifications(userId = null, dashboard = null) {
  return archiveAllNotifications(userId, dashboard);
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
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('Error adding building:', err);
    return { success: false, message: err.message };
  }
}

export async function updateBuilding(id, data) {
  try {
    const res = await fetch(`${API_BASE}/buildings.php?action=update&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating building:', err);
    return { success: false, message: err.message };
  }
}

export async function deleteBuilding(id) {
  try {
    const res = await fetch(`${API_BASE}/buildings.php?action=delete&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return await res.json();
  } catch (err) {
    console.error('Error deleting building:', err);
    return { success: false, message: err.message };
  }
}

export async function fetchStaff() {
  try {
    const res = await fetch(`${API_BASE}/staff.php`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching staff:', err);
    return { success: false, data: [] };
  }
}

export async function fetchStaffStats(staffId) {
  try {
    const res = await fetch(`${API_BASE}/staff.php?action=stats&id=${staffId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching staff stats:', err);
    return { success: false, message: err.message };
  }
}

export async function addStaffMember(data) {
  try {
    const res = await fetch(`${API_BASE}/staff.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error('Error adding staff member:', err);
    return { success: false, message: err.message };
  }
}

export async function removeStaffMember(staffId, details = {}) {
  try {
    const res = await fetch(`${API_BASE}/staff.php?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        staff_id: staffId,
        reason: details.reason || 'Resignation',
        notes: details.notes || '',
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Error removing staff member:', err);
    return { success: false, message: err.message };
  }
}

export async function fetchSuggestedWorker({ categoryId, categorySlug } = {}) {
  try {
    const params = new URLSearchParams({ action: 'suggested' });
    if (categoryId) params.append('category_id', String(categoryId));
    if (categorySlug) params.append('category_slug', String(categorySlug));

    const res = await fetch(`${API_BASE}/staff.php?${params.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching suggested worker:', err);
    return { success: false, suggested_worker: null };
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
    const res = await fetch(`${API_BASE}/auth.php?action=me`, {
      credentials: 'include',
      cache: 'no-store',
    });
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

export async function registerUser({ identifier, lastName, firstName, middleName, fullName, email, department, password }) {
  const computedFullName = fullName || [firstName, middleName, lastName].filter(Boolean).join(' ');
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        identifier,
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName,
        full_name: computedFullName,
        email,
        department,
        password,
      }),
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

export async function verifyAdminRole() {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=verify_admin`, {
      credentials: 'include',
    });
    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      ...data,
    };
  } catch (err) {
    console.error('verifyAdminRole error:', err);
    return {
      ok: false,
      status: 500,
      success: false,
      authorized: false,
      message: 'Failed to verify administrative authorization with server.',
    };
  }
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

export function getExportReportsUrl(filters = {}) {
  const params = new URLSearchParams();
  params.append('action', 'export');
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== 'all' && val !== '') {
      params.append(key, val);
    }
  });
  return `${API_BASE}/reports.php?${params.toString()}`;
}

export async function checkDuplicateReport({ buildingId, buildingName, categoryId, categorySlug, roomNumber }) {
  try {
    const params = new URLSearchParams();
    if (buildingId) params.append('building_id', buildingId);
    if (buildingName) params.append('building_name', buildingName);
    if (categoryId) params.append('category_id', categoryId);
    if (categorySlug) params.append('category_slug', categorySlug);
    if (roomNumber) params.append('room_number', roomNumber);

    const res = await fetch(`${API_BASE}/reports.php?action=check_duplicate&${params.toString()}`, {
      credentials: 'include',
    });
    return await res.json();
  } catch (err) {
    console.error('checkDuplicateReport error:', err);
    return { success: false, duplicate_found: false };
  }
}

export async function confirmReport(reportId, ticketNumber = '') {
  try {
    const res = await fetch(`${API_BASE}/reports.php?action=confirm_report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ report_id: reportId, ticket_number: ticketNumber }),
    });
    return await res.json();
  } catch (err) {
    console.error('confirmReport error:', err);
    return { success: false, message: 'Failed to confirm report' };
  }
}

