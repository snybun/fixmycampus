<?php

declare(strict_types=1);

/**
 * FixMyCampus Session & Flash Messaging Helpers
 *
 * Provides safe session lifecycle initialization, flash messaging, and session data manipulation.
 */

if (!function_exists('session_start_safe')) {
    /**
     * Start the PHP session securely if not already active.
     */
    function session_start_safe(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            if (!headers_sent()) {
                $isHttps = (
                    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                    (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) ||
                    (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
                );

                session_set_cookie_params([
                    'lifetime' => 0,
                    'path'     => '/',
                    'domain'   => '',
                    'secure'   => $isHttps,
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]);

                session_start();
            } else {
                @session_start();
            }
        }
    }
}

if (!function_exists('session_set')) {
    /**
     * Store a value in the session.
     */
    function session_set(string $key, mixed $value): void
    {
        session_start_safe();
        $_SESSION[$key] = $value;
    }
}

if (!function_exists('session_get')) {
    /**
     * Retrieve a value from the session with fallback default.
     */
    function session_get(string $key, mixed $default = null): mixed
    {
        session_start_safe();
        return $_SESSION[$key] ?? $default;
    }
}

if (!function_exists('session_has')) {
    /**
     * Determine if a session key exists.
     */
    function session_has(string $key): bool
    {
        session_start_safe();
        return array_key_exists($key, $_SESSION);
    }
}

if (!function_exists('session_remove')) {
    /**
     * Remove a key from the session.
     */
    function session_remove(string $key): void
    {
        session_start_safe();
        unset($_SESSION[$key]);
    }
}

if (!function_exists('set_flash')) {
    /**
     * Set a flash message for the subsequent request.
     *
     * @param string $type success|error|warning|info
     * @param string $message
     */
    function set_flash(string $type, string $message): void
    {
        session_start_safe();
        if (!isset($_SESSION['_flashes']) || !is_array($_SESSION['_flashes'])) {
            $_SESSION['_flashes'] = [];
        }
        $_SESSION['_flashes'][] = [
            'type'    => $type,
            'message' => $message,
        ];
    }
}

if (!function_exists('get_flashes')) {
    /**
     * Retrieve and clear all accumulated flash messages.
     *
     * @return array
     */
    function get_flashes(): array
    {
        session_start_safe();
        $flashes = $_SESSION['_flashes'] ?? [];
        unset($_SESSION['_flashes']);
        return is_array($flashes) ? $flashes : [];
    }
}

if (!function_exists('has_flashes')) {
    /**
     * Check if any flash messages are currently queued.
     */
    function has_flashes(): bool
    {
        session_start_safe();
        return !empty($_SESSION['_flashes']);
    }
}
