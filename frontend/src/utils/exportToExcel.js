import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Format report status into a human-readable title
 */
function formatStatus(status) {
  if (!status) return 'Submitted';
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format report priority
 */
function formatPriority(priority) {
  if (!priority) return 'Medium';
  const p = priority.toLowerCase();
  if (p === 'emergency') return 'Emergency';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/**
 * Format timestamp into readable date and time string
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Export reports array to a styled, multi-sheet Excel (.xlsx) file.
 * 
 * @param {Array} reports - Array of report objects
 * @param {string} baseFilename - Base name for the exported file
 * @param {Object} options - Optional metadata or custom title
 */
export function exportReportsToExcel(reports = [], baseFilename = 'FixMyCampus_Defect_Reports', options = {}) {
  if (!reports || !Array.isArray(reports) || reports.length === 0) {
    alert('No reports available to export.');
    return false;
  }

  // -------------------------------------------------------------------------
  // 1. Build Main Sheet: "Defect Reports"
  // -------------------------------------------------------------------------
  const reportRows = reports.map((r, index) => {
    const locParts = [
      r.building_name,
      r.floor_name,
      r.room_number || r.location_name || r.specific_area,
    ].filter(Boolean);

    return {
      'No.': index + 1,
      'Ticket #': r.ticket_number || `FMC-${r.id}`,
      'Issue Title': r.title || 'Untitled Defect',
      'Category': r.category_name || r.category || 'General',
      'Priority': formatPriority(r.priority),
      'Status': formatStatus(r.status),
      'Building': r.building_name || 'Campus Wide',
      'Floor': r.floor_name || '—',
      'Room / Area': r.room_number || r.location_name || r.specific_area || '—',
      'Full Location': locParts.join(' • ') || 'Campus Facility',
      'Reporter Name': r.reporter_name || 'Campus User',
      'Reporter Email': r.reporter_email || '—',
      'Reporter ID': r.reporter_identifier || '—',
      'Assigned Staff': r.worker_name || 'Unassigned',
      'Staff Department': r.worker_department || '—',
      'Date Reported': formatDateTime(r.reported_at),
      'Last Updated': formatDateTime(r.updated_at),
      'Description / Context': r.description || '—',
    };
  });

  const wsReports = XLSX.utils.json_to_sheet(reportRows);

  // Auto-fit column widths
  wsReports['!cols'] = [
    { wch: 6 },   // No.
    { wch: 18 },  // Ticket #
    { wch: 30 },  // Title
    { wch: 20 },  // Category
    { wch: 14 },  // Priority
    { wch: 16 },  // Status
    { wch: 22 },  // Building
    { wch: 14 },  // Floor
    { wch: 18 },  // Room / Area
    { wch: 32 },  // Full Location
    { wch: 22 },  // Reporter Name
    { wch: 30 },  // Reporter Email
    { wch: 18 },  // Reporter ID
    { wch: 22 },  // Assigned Staff
    { wch: 24 },  // Staff Dept
    { wch: 22 },  // Date Reported
    { wch: 22 },  // Last Updated
    { wch: 45 },  // Description
  ];

  // -------------------------------------------------------------------------
  // 2. Build Executive Summary Sheet
  // -------------------------------------------------------------------------
  const totalReports = reports.length;
  const statusCounts = {};
  const priorityCounts = {};
  const categoryCounts = {};
  const buildingCounts = {};

  reports.forEach((r) => {
    const s = formatStatus(r.status);
    statusCounts[s] = (statusCounts[s] || 0) + 1;

    const p = formatPriority(r.priority);
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;

    const c = r.category_name || r.category || 'General';
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;

    const b = r.building_name || 'Others / Unassigned';
    buildingCounts[b] = (buildingCounts[b] || 0) + 1;
  });

  const nowFormatted = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const summaryRows = [
    { 'Section / Metric': 'FIXMYCAMPUS FACILITY MANAGEMENT REPORT', 'Count / Details': '', 'Ratio': '' },
    { 'Section / Metric': 'Report Generated', 'Count / Details': nowFormatted, 'Ratio': '' },
    { 'Section / Metric': 'Total Exported Reports', 'Count / Details': totalReports, 'Ratio': '100%' },
    { 'Section / Metric': '', 'Count / Details': '', 'Ratio': '' },

    { 'Section / Metric': '--- STATUS BREAKDOWN ---', 'Count / Details': '', 'Ratio': '' },
    ...Object.entries(statusCounts).map(([status, count]) => ({
      'Section / Metric': status,
      'Count / Details': count,
      'Ratio': `${Math.round((count / Math.max(1, totalReports)) * 100)}%`,
    })),
    { 'Section / Metric': '', 'Count / Details': '', 'Ratio': '' },

    { 'Section / Metric': '--- PRIORITY BREAKDOWN ---', 'Count / Details': '', 'Ratio': '' },
    ...Object.entries(priorityCounts).map(([priority, count]) => ({
      'Section / Metric': priority,
      'Count / Details': count,
      'Ratio': `${Math.round((count / Math.max(1, totalReports)) * 100)}%`,
    })),
    { 'Section / Metric': '', 'Count / Details': '', 'Ratio': '' },

    { 'Section / Metric': '--- CATEGORY BREAKDOWN ---', 'Count / Details': '', 'Ratio': '' },
    ...Object.entries(categoryCounts).map(([category, count]) => ({
      'Section / Metric': category,
      'Count / Details': count,
      'Ratio': `${Math.round((count / Math.max(1, totalReports)) * 100)}%`,
    })),
    { 'Section / Metric': '', 'Count / Details': '', 'Ratio': '' },

    { 'Section / Metric': '--- BUILDING BREAKDOWN ---', 'Count / Details': '', 'Ratio': '' },
    ...Object.entries(buildingCounts).map(([bldg, count]) => ({
      'Section / Metric': bldg,
      'Count / Details': count,
      'Ratio': `${Math.round((count / Math.max(1, totalReports)) * 100)}%`,
    })),
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 38 },
    { wch: 28 },
    { wch: 14 },
  ];

  // -------------------------------------------------------------------------
  // 3. Assemble Workbook & Trigger Direct Download (.xlsx)
  // -------------------------------------------------------------------------
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsReports, 'Defect Tickets');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');

  const dateTag = new Date().toISOString().split('T')[0];
  const cleanBase = baseFilename.replace(/\.xlsx$/i, '');
  const filename = `${cleanBase}_${dateTag}.xlsx`;

  // Write workbook to raw ArrayBuffer
  const excelBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
  });

  // Official Excel OOXML MIME type
  const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

  // 1. Create File object (preserves filename at the binary level) or fallback to Blob
  let fileOrBlob;
  try {
    fileOrBlob = new File([excelBuffer], filename, { type: EXCEL_MIME });
  } catch {
    fileOrBlob = new Blob([excelBuffer], { type: EXCEL_MIME });
  }

  // 2. Legacy IE / Old Edge support
  if (typeof window !== 'undefined' && window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(fileOrBlob, filename);
    return true;
  }

  // 3. Modern browser download via DOM-attached anchor
  // In Chromium (Chrome & Edge), the anchor tag MUST be connected to document.body
  // and must NOT be removed synchronously, otherwise Chromium drops the 'download'
  // filename attribute and names the file after the internal Blob UUID without extension.
  try {
    const blobUrl = window.URL.createObjectURL(fileOrBlob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = filename;
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        // cleanup ignore
      }
    }, 15000);
    return true;
  } catch (err) {
    console.warn('DOM anchor download failed, attempting file-saver saveAs fallback:', err);
    try {
      saveAs(fileOrBlob, filename);
      return true;
    } catch (saveErr) {
      console.error('All download methods failed:', saveErr);
      return false;
    }
  }
}


