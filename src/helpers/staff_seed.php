<?php

declare(strict_types=1);

/**
 * FixMyCampus Staff Roster Seed Helper
 * Ensures campus maintenance specialists exist for all key facility departments.
 */

require_once __DIR__ . '/db.php';

if (!function_exists('ensure_specialized_staff_seeded')) {
    function ensure_specialized_staff_seeded(): void {
        try {
            $staffRoster = [
                [
                    'identifier' => 'MGT-001',
                    'name'       => 'Juan Dela Cruz',
                    'email'      => 'juandelacruz@phinmaed.com',
                    'department' => 'Plumbing',
                    'phone'      => '09123456789',
                    'role_id'    => 2, // Supervisor
                ],
                [
                    'identifier' => 'TEC-HVAC-01',
                    'name'       => 'Engr. Ricardo Gomez',
                    'email'      => 'ricardo.gomez@phinmaed.com',
                    'department' => 'HVAC / Air Conditioning',
                    'phone'      => '09172345671',
                    'role_id'    => 3, // Technician
                ],
                [
                    'identifier' => 'TEC-ELEC-02',
                    'name'       => 'Mateo Santos',
                    'email'      => 'mateo.santos@phinmaed.com',
                    'department' => 'Electrical',
                    'phone'      => '09183456782',
                    'role_id'    => 3,
                ],
                [
                    'identifier' => 'TEC-CARP-03',
                    'name'       => 'Danilo Reyes',
                    'email'      => 'danilo.reyes@phinmaed.com',
                    'department' => 'Carpentry & Woodwork',
                    'phone'      => '09194567893',
                    'role_id'    => 3,
                ],
                [
                    'identifier' => 'TEC-AV-04',
                    'name'       => 'Christian Ramos',
                    'email'      => 'christian.ramos@phinmaed.com',
                    'department' => 'Audio-Visual & Classroom Tech',
                    'phone'      => '09205678904',
                    'role_id'    => 3,
                ],
                [
                    'identifier' => 'TEC-NET-05',
                    'name'       => 'Alex Hernandez',
                    'email'      => 'alex.hernandez@phinmaed.com',
                    'department' => 'Network & Telecommunications',
                    'phone'      => '09216789015',
                    'role_id'    => 3,
                ],
                [
                    'identifier' => 'TEC-JAN-06',
                    'name'       => 'Eduardo Bautista',
                    'email'      => 'eduardo.bautista@phinmaed.com',
                    'department' => 'Janitorial & Sanitation',
                    'phone'      => '09227890126',
                    'role_id'    => 3,
                ],
                [
                    'identifier' => 'TEC-GEN-07',
                    'name'       => 'Roberto Cruz',
                    'email'      => 'roberto.cruz@phinmaed.com',
                    'department' => 'General Maintenance',
                    'phone'      => '09238901237',
                    'role_id'    => 3,
                ],
            ];

            $defaultPasswordHash = password_hash('Worker@1234', PASSWORD_BCRYPT);

            foreach ($staffRoster as $s) {
                $existing = db_fetch_one("
                    SELECT id FROM `users` WHERE email = :email OR user_identifier = :id LIMIT 1
                ", [':email' => $s['email'], ':id' => $s['identifier']]);

                if (!$existing) {
                    db_insert('users', [
                        'role_id'         => $s['role_id'],
                        'user_identifier' => $s['identifier'],
                        'full_name'       => $s['name'],
                        'email'           => $s['email'],
                        'password_hash'   => $defaultPasswordHash,
                        'phone_number'    => $s['phone'],
                        'department'      => $s['department'],
                        'status'          => 'active',
                    ]);
                }
            }
        } catch (\Throwable $e) {
            error_log("[FixMyCampus] ensure_specialized_staff_seeded: " . $e->getMessage());
        }
    }
}

if (!function_exists('find_suggested_worker_for_category')) {
    function find_suggested_worker_for_category(int|string $category): ?array {
        ensure_specialized_staff_seeded();

        $categorySlug = '';
        if (is_numeric($category)) {
            $catId = (int)$category;
            $slugRow = db_fetch_one("SELECT slug FROM `categories` WHERE id = :id LIMIT 1", [':id' => $catId]);
            $categorySlug = $slugRow['slug'] ?? '';
            if (empty($categorySlug)) {
                $idMap = [
                    1 => 'air-conditioning',
                    2 => 'electrical',
                    3 => 'furniture',
                    4 => 'classroom',
                    5 => 'restroom',
                    6 => 'internet',
                    7 => 'cleaning',
                    8 => 'safety',
                    9 => 'other',
                ];
                $categorySlug = $idMap[$catId] ?? 'other';
            }
        } else {
            $categorySlug = strtolower(trim((string)$category));
        }

        $specMap = [
            'air-conditioning' => ['HVAC / Air Conditioning', ['hvac', 'air', 'cooling', 'ventilation']],
            'electrical'       => ['Electrical', ['electrical', 'electrician', 'power', 'lighting']],
            'furniture'        => ['Carpentry & Woodwork', ['carpentry', 'woodwork', 'furniture']],
            'classroom'        => ['Audio-Visual & Classroom Tech', ['audio', 'visual', 'classroom', 'av', 'tech', 'projector']],
            'restroom'         => ['Plumbing', ['plumbing', 'pipe', 'restroom', 'water', 'drainage']],
            'internet'         => ['Network & Telecommunications', ['network', 'telecommunications', 'internet', 'wifi', 'lan']],
            'cleaning'         => ['Janitorial & Sanitation', ['janitorial', 'sanitation', 'cleaning', 'waste']],
            'safety'           => ['General Maintenance', ['safety', 'general', 'maintenance', 'hazard', 'grounds']],
            'other'            => ['General Maintenance', ['general', 'maintenance', 'physical plant']],
        ];

        $targetDept = 'General Maintenance';
        $keywords = ['maintenance'];
        if (isset($specMap[$categorySlug])) {
            [$targetDept, $keywords] = $specMap[$categorySlug];
        }

        $whereOr = [];
        $params = [];
        foreach ($keywords as $kIdx => $kw) {
            $whereOr[] = "LOWER(u.department) LIKE :kw{$kIdx}";
            $params[":kw{$kIdx}"] = "%{$kw}%";
        }
        $orSql = implode(' OR ', $whereOr);

        $matchedWorker = db_fetch_one("
            SELECT u.id, u.user_identifier, u.full_name, u.email, u.phone_number, u.department,
                   r.name AS role_name, r.display_name AS role_display,
                   (SELECT COUNT(*) FROM `report_assignments` ra 
                    JOIN `reports` rep ON ra.report_id = rep.id 
                    WHERE ra.assigned_to = u.id AND ra.status IN ('pending', 'accepted', 'in_progress') AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected')) AS active_jobs
            FROM `users` u
            JOIN `roles` r ON u.role_id = r.id
            WHERE r.name IN ('technician', 'supervisor')
              AND u.status = 'active'
              AND ({$orSql})
            ORDER BY active_jobs ASC, u.id ASC
            LIMIT 1
        ", $params);

        if (!$matchedWorker) {
            $matchedWorker = db_fetch_one("
                SELECT u.id, u.user_identifier, u.full_name, u.email, u.phone_number, u.department,
                       r.name AS role_name, r.display_name AS role_display,
                       (SELECT COUNT(*) FROM `report_assignments` ra 
                        JOIN `reports` rep ON ra.report_id = rep.id 
                        WHERE ra.assigned_to = u.id AND ra.status IN ('pending', 'accepted', 'in_progress') AND rep.status NOT IN ('resolved', 'closed', 'archived', 'rejected')) AS active_jobs
                FROM `users` u
                JOIN `roles` r ON u.role_id = r.id
                WHERE r.name IN ('technician', 'supervisor')
                  AND u.status = 'active'
                ORDER BY active_jobs ASC, u.id ASC
                LIMIT 1
            ");
        }

        if ($matchedWorker) {
            $matchedWorker['target_specialization'] = $targetDept;
            $matchedWorker['category_slug'] = $categorySlug;
        }

        return $matchedWorker;
    }
}
