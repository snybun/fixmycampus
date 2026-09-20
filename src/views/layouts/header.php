<?php

declare(strict_types=1);

/**
 * FixMyCampus Global Header Layout
 * Top application bar with branding, mobile drawer trigger, and system status indicator.
 */

$isDbConnected = $stats['db_connected'] ?? true;
?>
<header class="app-header">
    <div class="header-container">
        <div class="header-left">
            <button type="button" class="btn-menu-toggle" id="menuToggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="appSidebar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
            <a href="/" class="brand-link">
                <div class="brand-badge">F</div>
                <span class="brand-title"><?= e($appName ?? 'FixMyCampus') ?></span>
            </a>
        </div>

        <nav class="header-center" aria-label="Primary navigation">
            <div class="header-nav">
                <a href="/" class="nav-link active">Overview</a>
                <a href="#reports" class="nav-link">Defect Tickets</a>
                <a href="#categories" class="nav-link">Categories</a>
                <a href="/health.php" class="nav-link" target="_blank">Diagnostics</a>
            </div>
        </nav>

        <div class="header-right">
            <div class="system-status-indicator" title="<?= $isDbConnected ? 'MySQL 8 Database Connected' : 'Database Offline' ?>">
                <span class="status-dot <?= $isDbConnected ? '' : 'offline' ?>"></span>
                <span class="text"><?= $isDbConnected ? 'MySQL Active' : 'DB Offline' ?></span>
            </div>
            <a href="#new-ticket" class="btn btn-primary btn-sm">
                <span>+ Report Defect</span>
            </a>
        </div>
    </div>
</header>
