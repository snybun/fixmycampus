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
