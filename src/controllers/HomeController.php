<?php

declare(strict_types=1);

namespace FixMyCampus\Controllers;

/**
 * FixMyCampus Home Controller
 *
 * Dispatches the foundation landing & overview page with live database statistics.
 */
class HomeController extends BaseController
{
    /**
     * Display the foundation dashboard.
     */
    public function index(): void
    {
        $stats = [
            'total_reports'    => 0,
            'in_progress'      => 0,
            'resolved'         => 0,
            'emergency'        => 0,
            'categories_count' => 0,
            'buildings_count'  => 0,
            'db_connected'     => false,
            'db_version'       => 'N/A',
            'tables'           => [],
            'recent_reports'   => [],
            'categories'       => [],
        ];

        try {
            $dbStatus = \FixMyCampus\Core\Database::testConnection();
            if ($dbStatus['status'] === 'connected') {
                $stats['db_connected'] = true;
                $stats['db_version']   = $dbStatus['server_version'] ?? 'MySQL 8';
                $stats['tables']       = $dbStatus['tables'] ?? [];

                // Aggregate metrics safely using prepared statements
                $stats['total_reports']    = (int) db_fetch_column("SELECT COUNT(*) FROM `reports`");
                $stats['in_progress']      = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `status` IN ('assigned', 'in_progress')");
                $stats['resolved']         = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `status` IN ('resolved', 'closed')");
                $stats['emergency']        = (int) db_fetch_column("SELECT COUNT(*) FROM `reports` WHERE `priority` = 'emergency'");
                $stats['categories_count'] = (int) db_fetch_column("SELECT COUNT(*) FROM `categories` WHERE `is_active` = 1");
                $stats['buildings_count']  = (int) db_fetch_column("SELECT COUNT(*) FROM `buildings` WHERE `is_active` = 1");

                // Fetch recent sample reports with relations
                $stats['recent_reports'] = db_fetch_all("
                    SELECT 
                        r.id,
                        r.ticket_number,
                        r.title,
                        r.priority,
                        r.status,
                        r.reported_at,
                        c.name AS category_name,
                        b.name AS building_name,
                        l.name AS location_name,
                        u.full_name AS reporter_name
                    FROM `reports` r
                    LEFT JOIN `categories` c ON r.category_id = c.id
                    LEFT JOIN `locations` l ON r.location_id = l.id
                    LEFT JOIN `buildings` b ON l.building_id = b.id
                    LEFT JOIN `users` u ON r.reporter_id = u.id
                    ORDER BY r.reported_at DESC
                    LIMIT 5
                ");

                // Fetch defect categories
                $stats['categories'] = db_fetch_all("
                    SELECT id, name, slug, sla_hours, icon 
                    FROM `categories` 
                    WHERE `is_active` = 1 
                    ORDER BY name ASC 
                    LIMIT 6
                ");
            }
        } catch (\Throwable $e) {
            $stats['db_connected'] = false;
            $stats['db_error'] = $e->getMessage();
        }

        $this->render('pages/home', [
            'pageTitle' => 'Campus Facility Defect & Maintenance Management',
            'stats'     => $stats,
        ]);
    }
}
