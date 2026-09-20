<?php

declare(strict_types=1);

/**
 * FixMyCampus HTTP Redirection Helpers
 *
 * Provides safe URL redirects and flash-accompanied navigation.
 */

require_once __DIR__ . '/session.php';

if (!function_exists('redirect')) {
    /**
     * Redirect to a specific URL with an HTTP status code.
     *
     * @param string $url
     * @param int $statusCode
     */
    function redirect(string $url, int $statusCode = 302): void
    {
        // Prevent header injection attacks
        $cleanUrl = str_replace(["\r", "\n"], '', $url);

        http_response_code($statusCode);
        header("Location: {$cleanUrl}");
        exit;
    }
}

if (!function_exists('redirect_with_flash')) {
    /**
     * Set a flash message and immediately redirect.
     *
     * @param string $url
     * @param string $type success|error|warning|info
     * @param string $message
     */
    function redirect_with_flash(string $url, string $type, string $message): void
    {
        set_flash($type, $message);
        redirect($url);
    }
}

if (!function_exists('redirect_back')) {
    /**
     * Redirect back to the HTTP referrer or fallback URL.
     *
     * @param string $fallback
     */
    function redirect_back(string $fallback = '/'): void
    {
        $referer = $_SERVER['HTTP_REFERER'] ?? null;
        if ($referer && filter_var($referer, FILTER_VALIDATE_URL)) {
            // Verify same-host redirect to avoid open redirect vulnerabilities
            $refererHost = parse_url($referer, PHP_URL_HOST);
            $currentHost = $_SERVER['HTTP_HOST'] ?? '';

            if ($refererHost === $currentHost) {
                redirect($referer);
            }
        }

        redirect($fallback);
    }
}
