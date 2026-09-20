<?php

declare(strict_types=1);

/**
 * FixMyCampus Foundation Overview Page
 * Displays operational defect metrics, recent seeded tickets, categories, and database health.
 */

$isDbConnected = $stats['db_connected'] ?? false;
$recentReports = $stats['recent_reports'] ?? [];
$categories    = $stats['categories'] ?? [];
$tables        = $stats['tables'] ?? [];
?>

<div class="page-header">
    <div class="page-header-text">
        <h1>Campus Facility &amp; Maintenance</h1>
        <p>Monitor physical plant conditions, defect resolutions, and facility operations across campus.</p>
    </div>
    <div class="page-header-actions">
        <a href="/health.php" target="_blank" class="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>JSON Health API</span>
        </a>
    </div>
</div>

<!-- Key Performance Metrics -->
<section class="stats-grid" aria-label="Maintenance overview statistics">
    <div class="stat-card">
        <span class="stat-label">Total Reported</span>
        <span class="stat-number"><?= (int)($stats['total_reports'] ?? 0) ?></span>
        <span class="stat-meta">All-time recorded defects</span>
    </div>
    <div class="stat-card">
        <span class="stat-label">In Progress / Assigned</span>
        <span class="stat-number"><?= (int)($stats['in_progress'] ?? 0) ?></span>
        <span class="stat-meta">Active technician work orders</span>
    </div>
    <div class="stat-card">
        <span class="stat-label">Resolved Deficiencies</span>
        <span class="stat-number"><?= (int)($stats['resolved'] ?? 0) ?></span>
        <span class="stat-meta">Verified &amp; closed tickets</span>
    </div>
    <div class="stat-card">
        <span class="stat-label">Campus Buildings</span>
        <span class="stat-number"><?= (int)($stats['buildings_count'] ?? 0) ?></span>
        <span class="stat-meta"><?= (int)($stats['categories_count'] ?? 0) ?> Active service categories</span>
    </div>
</section>

<!-- Recent Defect Reports Table -->
<section class="card" id="reports">
    <div class="card-header">
        <div>
            <h2 class="card-title">Recent Defect Tickets</h2>
            <p class="card-subtitle">Live records queried from <code>fixmycampus_db.reports</code> via PDO prepared statements</p>
        </div>
        <span class="badge badge-neutral"><?= count($recentReports) ?> Displayed</span>
    </div>

    <?php if (!empty($recentReports)): ?>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th>Issue Summary</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Reported</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recentReports as $report): 
                        // Subtle priority badges
                        $priorityBadge = match ($report['priority'] ?? 'medium') {
                            'emergency' => 'badge-danger',
                            'high'      => 'badge-warning',
                            'medium'    => 'badge-info',
                            'low'       => 'badge-neutral',
                            default     => 'badge-neutral',
                        };

                        // Subtle status badges
                        $statusBadge = match ($report['status'] ?? 'submitted') {
                            'resolved', 'closed' => 'badge-success',
                            'in_progress'        => 'badge-warning',
                            'assigned'           => 'badge-info',
                            'emergency'          => 'badge-danger',
                            default              => 'badge-neutral',
                        };

                        $cleanStatus = ucwords(str_replace('_', ' ', $report['status'] ?? 'submitted'));
                        $cleanPriority = ucfirst($report['priority'] ?? 'medium');
                        $dateFormatted = !empty($report['reported_at']) ? date('M j, Y', strtotime($report['reported_at'])) : '—';
                    ?>
                        <tr>
                            <td>
                                <strong style="font-family: var(--font-mono); font-size: 0.8125rem;">
                                    <?= e($report['ticket_number'] ?? '') ?>
                                </strong>
                            </td>
                            <td>
                                <strong><?= e($report['title'] ?? '') ?></strong>
                            </td>
                            <td>
                                <span style="color: var(--color-text-secondary); font-size: 0.8125rem;">
                                    <?= e($report['category_name'] ?? 'General') ?>
                                </span>
                            </td>
                            <td>
                                <span style="font-size: 0.8125rem;">
                                    <?= e($report['building_name'] ?? '') ?> &bull; <?= e($report['location_name'] ?? '') ?>
                                </span>
                            </td>
                            <td>
                                <span class="badge <?= e_attr($priorityBadge) ?>">
                                    <?= e($cleanPriority) ?>
                                </span>
                            </td>
                            <td>
                                <span class="badge <?= e_attr($statusBadge) ?>">
                                    <?= e($cleanStatus) ?>
                                </span>
                            </td>
                            <td>
                                <span style="color: var(--color-text-muted); font-size: 0.8125rem;">
                                    <?= e($dateFormatted) ?>
                                </span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php else: ?>
        <p style="padding: 1.5rem; text-align: center; color: var(--color-text-muted);">
            No defect reports found in database. Start containers with <code>docker compose up -d</code> to auto-seed initial data.
        </p>
    <?php endif; ?>
</section>

<!-- Issue Classification & SLA Section -->
<section class="card" id="categories">
    <div class="card-header">
        <div>
            <h2 class="card-title">Defect Categories &amp; Resolution SLA</h2>
            <p class="card-subtitle">Target response times defined in database schema</p>
        </div>
    </div>

    <div class="category-grid">
        <?php foreach ($categories as $cat): ?>
            <div class="category-card">
                <div class="category-info">
                    <h4><?= e($cat['name']) ?></h4>
                    <span class="category-sla">Target Resolution: <?= (int)$cat['sla_hours'] ?> hours</span>
                </div>
                <span class="badge badge-neutral"><?= (int)$cat['sla_hours'] ?>h SLA</span>
            </div>
        <?php endforeach; ?>
    </div>
</section>

<!-- Database Foundation Verification -->
<section class="card" id="schema">
    <div class="card-header">
        <div>
            <h2 class="card-title">Database &amp; Architecture Foundation</h2>
            <p class="card-subtitle">Verified connection to MySQL 8.0 schema</p>
        </div>
        <?php if ($isDbConnected): ?>
            <span class="badge badge-success">Connected</span>
        <?php else: ?>
            <span class="badge badge-danger">Connection Offline</span>
        <?php endif; ?>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
        <div style="background: var(--color-canvas); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); padding: 1rem;">
            <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 600;">Engine Details</span>
            <ul style="list-style: none; margin-top: 0.5rem; font-size: 0.8125rem;">
                <li style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span style="color: var(--color-text-secondary);">Database Name:</span>
                    <strong><?= e(\FixMyCampus\Core\Env::get('DB_DATABASE', 'fixmycampus_db')) ?></strong>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span style="color: var(--color-text-secondary);">Host &amp; Port:</span>
                    <strong><?= e(\FixMyCampus\Core\Env::get('DB_HOST', 'database') . ':' . \FixMyCampus\Core\Env::get('DB_PORT', 3306)) ?></strong>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span style="color: var(--color-text-secondary);">Server Version:</span>
                    <strong><?= e((string)($stats['db_version'] ?? 'MySQL 8')) ?></strong>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span style="color: var(--color-text-secondary);">Driver:</span>
                    <strong>PDO MySQL (Emulation Disabled)</strong>
                </li>
            </ul>
        </div>

        <div style="background: var(--color-canvas); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); padding: 1rem;">
            <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 600;">Relational Tables (<?= count($tables) ?>)</span>
            <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                <?php foreach ($tables as $table): ?>
                    <span style="font-family: var(--font-mono); font-size: 0.6875rem; padding: 0.2rem 0.5rem; background: var(--color-white); border: 1px solid var(--color-border-subtle); border-radius: 4px;">
                        <?= e($table) ?>
                    </span>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</section>
