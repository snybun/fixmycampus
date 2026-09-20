<?php

declare(strict_types=1);

/**
 * FixMyCampus Sidebar Layout Component
 * Responsive navigation sidebar with sectioned links and counters.
 */

$totalTickets = $stats['total_reports'] ?? 0;
$inProgressTickets = $stats['in_progress'] ?? 0;
?>
<aside class="app-sidebar" id="appSidebar" aria-label="Sidebar navigation">
    <div class="sidebar-section">
        <span class="sidebar-label">Operations</span>
        <a href="/" class="sidebar-nav-link active">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </span>
            <span>Dashboard</span>
        </a>
        <a href="#reports" class="sidebar-nav-link">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
            </span>
            <span>Defect Tickets</span>
            <?php if ($totalTickets > 0): ?>
                <span class="sidebar-badge"><?= $totalTickets ?></span>
            <?php endif; ?>
        </a>
        <a href="#new-ticket" class="sidebar-nav-link">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
            </span>
            <span>Report Defect</span>
        </a>
    </div>

    <div class="sidebar-section">
        <span class="sidebar-label">Campus Facilities</span>
        <a href="#buildings" class="sidebar-nav-link">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <line x1="9" y1="22" x2="9" y2="22.01"></line>
                    <line x1="15" y1="22" x2="15" y2="22.01"></line>
                    <line x1="9" y1="6" x2="9" y2="6.01"></line>
                    <line x1="15" y1="6" x2="15" y2="6.01"></line>
                    <line x1="9" y1="10" x2="9" y2="10.01"></line>
                    <line x1="15" y1="10" x2="15" y2="10.01"></line>
                    <line x1="9" y1="14" x2="9" y2="14.01"></line>
                    <line x1="15" y1="14" x2="15" y2="14.01"></line>
                    <line x1="9" y1="18" x2="9" y2="18.01"></line>
                    <line x1="15" y1="18" x2="15" y2="18.01"></line>
                </svg>
            </span>
            <span>Buildings &amp; Rooms</span>
        </a>
        <a href="#categories" class="sidebar-nav-link">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </span>
            <span>Issue Categories</span>
        </a>
    </div>

    <div class="sidebar-section">
        <span class="sidebar-label">System</span>
        <a href="#schema" class="sidebar-nav-link">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
            </span>
            <span>Database Tables</span>
        </a>
        <a href="/health.php" class="sidebar-nav-link" target="_blank">
            <span class="sidebar-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
            </span>
            <span>Health Check API</span>
        </a>
    </div>
</aside>
<div class="sidebar-overlay" id="sidebarOverlay" aria-hidden="true"></div>
