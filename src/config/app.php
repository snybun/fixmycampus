<?php

declare(strict_types=1);

/**
 * FixMyCampus Application Configuration
 *
 * Defines directory constants, boots environment variables, and exports app settings.
 */

// Define core filesystem path constants
if (!defined('APP_ROOT')) {
    define('APP_ROOT', dirname(__DIR__, 2));
}

if (!defined('SRC_PATH')) {
    define('SRC_PATH', APP_ROOT . '/src');
}

if (!defined('VIEW_PATH')) {
    define('VIEW_PATH', SRC_PATH . '/views');
}

if (!defined('STORAGE_PATH')) {
    define('STORAGE_PATH', APP_ROOT . '/storage');
}

if (!defined('PUBLIC_PATH')) {
    define('PUBLIC_PATH', APP_ROOT . '/public');
}

// Ensure Env class is available and environment variables are loaded
require_once SRC_PATH . '/Core/Env.php';
FixMyCampus\Core\Env::load(APP_ROOT . '/.env');

return [
    'name'        => FixMyCampus\Core\Env::get('APP_NAME', 'FixMyCampus'),
    'tagline'     => FixMyCampus\Core\Env::get('APP_TAGLINE', 'Report. Track. Improve.'),
    'environment' => FixMyCampus\Core\Env::get('APP_ENV', 'development'),
    'debug'       => (bool) FixMyCampus\Core\Env::get('APP_DEBUG', true),
    'url'         => FixMyCampus\Core\Env::get('APP_URL', 'http://localhost:8080'),
    'port'        => (int) FixMyCampus\Core\Env::get('APP_PORT', 8080),
    'timezone'    => 'UTC',
];
