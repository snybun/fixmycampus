<?php

declare(strict_types=1);

/**
 * FixMyCampus Database Helper Functions
 * Provides shorthand functions for database queries, fetches, and transactions.
 */

use FixMyCampus\Core\Database;

// Ensure Core Database singleton is loaded
require_once dirname(__DIR__) . '/Core/Database.php';

if (!function_exists('db')) {
    /**
     * Get active PDO connection.
     *
     * @return PDO
     * @throws Exception
     */
    function db(): PDO
    {
        return Database::getConnection();
    }
}

if (!function_exists('db_query')) {
    /**
     * Execute a parameterized SQL statement.
     *
     * @param string $sql
     * @param array $params
     * @return PDOStatement
     * @throws Exception
     */
    function db_query(string $sql, array $params = []): PDOStatement
    {
        $pdo = db();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
}

if (!function_exists('db_fetch_one')) {
    /**
     * Execute query and return a single row as associative array, or null if none.
     *
     * @param string $sql
     * @param array $params
     * @return array|null
     */
    function db_fetch_one(string $sql, array $params = []): ?array
    {
        $stmt = db_query($sql, $params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result !== false ? $result : null;
    }
}

if (!function_exists('db_fetch_all')) {
    /**
     * Execute query and return all matching rows as an array of associative arrays.
     *
     * @param string $sql
     * @param array $params
     * @return array
     */
    function db_fetch_all(string $sql, array $params = []): array
    {
        $stmt = db_query($sql, $params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

if (!function_exists('db_fetch_column')) {
    /**
     * Execute query and return a single scalar value.
     *
     * @param string $sql
     * @param array $params
     * @param int $columnIndex
     * @return mixed
     */
    function db_fetch_column(string $sql, array $params = [], int $columnIndex = 0): mixed
    {
        $stmt = db_query($sql, $params);
        $val = $stmt->fetchColumn($columnIndex);
        return $val !== false ? $val : null;
    }
}

if (!function_exists('db_insert')) {
    /**
     * Execute an INSERT query and return the last insert ID.
     * Supports both raw SQL statement with params or table name with associative data.
     *
     * @param string $tableOrSql
     * @param array $dataOrParams
     * @return int
     */
    function db_insert(string $tableOrSql, array $dataOrParams = []): int
    {
        $pdo = db();
        // If it starts with INSERT or contains spaces, treat as raw SQL
        if (stripos(trim($tableOrSql), 'INSERT') === 0 || str_contains($tableOrSql, ' ')) {
            $stmt = $pdo->prepare($tableOrSql);
            $stmt->execute($dataOrParams);
            return (int) $pdo->lastInsertId();
        }

        // Otherwise treat as table name + associative array of [col => val]
        $cleanTable = preg_replace('/[^a-zA-Z0-9_]/', '', $tableOrSql);
        $columns = array_keys($dataOrParams);
        $placeholders = array_map(fn($col) => ":{$col}", $columns);

        $sql = sprintf(
            'INSERT INTO `%s` (`%s`) VALUES (%s)',
            $cleanTable,
            implode('`, `', $columns),
            implode(', ', $placeholders)
        );

        $params = [];
        foreach ($dataOrParams as $col => $val) {
            $params[":{$col}"] = $val;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) $pdo->lastInsertId();
    }
}

if (!function_exists('db_execute')) {
    /**
     * Execute an UPDATE/DELETE/DDL query and return affected rows.
     *
     * @param string $sql
     * @param array $params
     * @return int
     */
    function db_execute(string $sql, array $params = []): int
    {
        $stmt = db_query($sql, $params);
        return $stmt->rowCount();
    }
}

if (!function_exists('db_last_id')) {
    /**
     * Get the last inserted auto-increment ID.
     *
     * @return string
     */
    function db_last_id(): string
    {
        return db()->lastInsertId();
    }
}

if (!function_exists('db_transaction')) {
    /**
     * Execute a callable within a database transaction.
     * Automatically rolls back on any thrown exception and commits on success.
     *
     * @param callable $callback
     * @return mixed
     * @throws Throwable
     */
    function db_transaction(callable $callback): mixed
    {
        $pdo = db();
        $pdo->beginTransaction();

        try {
            $result = $callback($pdo);
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
