<?php

declare(strict_types=1);

/**
 * FixMyCampus Front Controller Entry Point
 *
 * Bootstraps configuration, initializes security and session,
 * loads helper utilities, and dispatches the initial controller.
 */

// 1. Load application configuration & environment
$config = require_once dirname(__DIR__) . '/src/config/app.php';

// Configure runtime error display based on environment
if ($config['debug']) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// 2. Load Core Components & Database
require_once SRC_PATH . '/Core/Database.php';
require_once SRC_PATH . '/Core/Response.php';

// 3. Load Reusable Helpers
require_once SRC_PATH . '/helpers/escape.php';
require_once SRC_PATH . '/helpers/session.php';
require_once SRC_PATH . '/helpers/auth.php';
require_once SRC_PATH . '/helpers/redirect.php';
require_once SRC_PATH . '/helpers/db.php';

// 4. Initialize Secure Session
session_start_safe();

// 5. Load Base Models & Controllers
require_once SRC_PATH . '/models/BaseModel.php';
require_once SRC_PATH . '/controllers/BaseController.php';
require_once SRC_PATH . '/controllers/HomeController.php';

// 6. Dispatch Foundation Controller
try {
    $controller = new \FixMyCampus\Controllers\HomeController();
    $controller->index();
} catch (\Throwable $e) {
    if ($config['debug']) {
        http_response_code(500);
        echo '<h1>Application Error</h1>';
        echo '<p><strong>Message:</strong> ' . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . '</p>';
        echo '<pre>' . htmlspecialchars($e->getTraceAsString(), ENT_QUOTES, 'UTF-8') . '</pre>';
    } else {
        http_response_code(500);
        echo '<h1>500 - Service Temporarily Unavailable</h1>';
        echo '<p>An unexpected error occurred. Please contact the campus physical plant administrator.</p>';
    }
}
