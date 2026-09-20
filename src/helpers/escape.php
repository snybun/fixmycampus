<?php

declare(strict_types=1);

/**
 * FixMyCampus HTML & Output Escaping Helpers
 *
 * Prevents Cross-Site Scripting (XSS) vulnerabilities by sanitizing dynamic outputs.
 */

if (!function_exists('e')) {
    /**
     * Escape a string for safe HTML rendering.
     *
     * @param string|null $value
     * @return string
     */
    function e(?string $value): string
    {
        if ($value === null) {
            return '';
        }
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

if (!function_exists('e_attr')) {
    /**
     * Escape a string for safe usage inside HTML attributes.
     *
     * @param string|null $value
     * @return string
     */
    function e_attr(?string $value): string
    {
        return e($value);
    }
}

if (!function_exists('e_js')) {
    /**
     * Safely encode a value for embedding inside inline JavaScript tags or data attributes.
     *
     * @param mixed $value
     * @return string
     */
    function e_js(mixed $value): string
    {
        return json_encode($value, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: 'null';
    }
}
