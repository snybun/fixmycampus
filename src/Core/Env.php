<?php

namespace FixMyCampus\Core;

/**
 * Lightweight Environment Variable Loader
 * Reads .env file into PHP $_ENV and getenv()
 */
class Env
{
    private static bool $loaded = false;

    /**
     * Load environment variables from a file if not already set.
     */
    public static function load(string $path): void
    {
        if (self::$loaded || !file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);

            // Skip comments and empty lines
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            // Parse key=value
            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $key = trim($parts[0]);
            $val = trim($parts[1]);

            // Strip surrounding single or double quotes
            if (
                (str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                (str_starts_with($val, "'") && str_ends_with($val, "'"))
            ) {
                $val = substr($val, 1, -1);
            }

            // Only set if not already defined in environment (e.g. from Docker)
            if (getenv($key) === false) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }

        self::$loaded = true;
    }

    /**
     * Get an environment variable with fallback default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $val = getenv($key);

        if ($val === false) {
            $val = $_ENV[$key] ?? $_SERVER[$key] ?? null;
        }

        if ($val === null) {
            return $default;
        }

        // Convert common booleans and nulls
        return match (strtolower((string)$val)) {
            'true', '(true)' => true,
            'false', '(false)' => false,
            'empty', '(empty)' => '',
            'null', '(null)' => null,
            default => $val,
        };
    }
}
