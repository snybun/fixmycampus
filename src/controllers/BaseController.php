<?php

declare(strict_types=1);

namespace FixMyCampus\Controllers;

/**
 * FixMyCampus Base Controller
 *
 * Provides template rendering with layout wrapping and standard response handling.
 */
abstract class BaseController
{
    /**
     * Render a view file wrapped in a layout.
     *
     * @param string $view Relative view path without extension (e.g. 'pages/home')
     * @param array<string, mixed> $data Data passed to view and layout
     * @param string $layout Layout template name inside src/views/layouts/
     * @return void
     */
    protected function render(string $view, array $data = [], string $layout = 'main'): void
    {
        $viewFile = VIEW_PATH . '/' . ltrim($view, '/') . '.php';

        if (!file_exists($viewFile)) {
            http_response_code(500);
            echo "View template not found: " . htmlspecialchars($viewFile, ENT_QUOTES, 'UTF-8');
            return;
        }

        // Global layout variables
        $data['appName']     = $data['appName'] ?? \FixMyCampus\Core\Env::get('APP_NAME', 'FixMyCampus');
        $data['appTagline']  = $data['appTagline'] ?? \FixMyCampus\Core\Env::get('APP_TAGLINE', 'Report. Track. Improve.');
        $data['currentUser'] = auth_user();
        $data['flashes']     = get_flashes();

        // Extract variables to view scope
        extract($data, EXTR_SKIP);

        // Capture view content
        ob_start();
        include $viewFile;
        $content = ob_get_clean();

        // If no layout is desired (partial rendering)
        if ($layout === '' || $layout === null) {
            echo $content;
            return;
        }

        $layoutFile = VIEW_PATH . '/layouts/' . $layout . '.php';
        if (!file_exists($layoutFile)) {
            echo $content;
            return;
        }

        include $layoutFile;
    }

    /**
     * Send a JSON response and exit.
     *
     * @param mixed $data
     * @param int $statusCode
     * @return void
     */
    protected function json(mixed $data, int $statusCode = 200): void
    {
        \FixMyCampus\Core\Response::json($data, $statusCode);
    }
}
