<?php

declare(strict_types=1);

/**
 * FixMyCampus Database Configuration & Connection Factory
 *
 * Configures PDO connection parameters securely from environment variables.
 * Disables prepared statement emulation, enforces exception error mode,
 * and handles connection failures gracefully without leaking sensitive credentials.
 */

use FixMyCampus\Core\Env;
use FixMyCampus\Core\Database;

// Ensure Core Database & Env are loaded
require_once dirname(__DIR__) . '/Core/Env.php';
require_once dirname(__DIR__) . '/Core/Database.php';

return [
    'driver'    => 'mysql',
    'host'      => Env::get('DB_HOST', 'database'),
    'port'      => (int) Env::get('DB_PORT', 3306),
    'database'  => Env::get('DB_DATABASE', 'fixmycampus_db'),
    'username'  => Env::get('DB_USERNAME', 'fmc_user'),
    'password'  => Env::get('DB_PASSWORD', ''),
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'options'   => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ],
];
