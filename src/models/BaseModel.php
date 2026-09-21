<?php

declare(strict_types=1);

namespace FixMyCampus\Models;

use PDO;

require_once dirname(__DIR__) . '/helpers/db.php';

/**
 * FixMyCampus Abstract Base Model
 *
 * Provides active-record-like convenience methods using prepared statements.
 */

abstract class BaseModel
{
    /**
     * Associated database table name.
     */
    protected static string $table = '';

    /**
     * Primary key column.
     */
    protected static string $primaryKey = 'id';

    /**
     * Get all records from table.
     *
     * @param string $orderBy
     * @param string $direction
     * @return array
     */
    public static function all(string $orderBy = 'id', string $direction = 'ASC'): array
    {
        $table = static::$table;
        $orderCol = preg_replace('/[^a-zA-Z0-9_]/', '', $orderBy);
        $dir = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';

        return db_fetch_all("SELECT * FROM `{$table}` ORDER BY `{$orderCol}` {$dir}");
    }

    /**
     * Find a record by its primary key.
     *
     * @param int|string $id
     * @return array|null
     */
    public static function find(int|string $id): ?array
    {
        $table = static::$table;
        $pk = static::$primaryKey;

        return db_fetch_one("SELECT * FROM `{$table}` WHERE `{$pk}` = :id LIMIT 1", [':id' => $id]);
    }

    /**
     * Count total rows matching optional WHERE conditions.
     *
     * @param string $whereClause
     * @param array $params
     * @return int
     */
    public static function count(string $whereClause = '', array $params = []): int
    {
        $table = static::$table;
        $sql = "SELECT COUNT(*) FROM `{$table}`";
        if ($whereClause !== '') {
            $sql .= " WHERE {$whereClause}";
        }

        return (int) db_fetch_column($sql, $params);
    }

    /**
     * Execute a filtered WHERE query.
     *
     * @param string $whereClause
     * @param array $params
     * @param string $orderBy
     * @param int|null $limit
     * @return array
     */
    public static function where(string $whereClause, array $params = [], string $orderBy = '', ?int $limit = null): array
    {
        $table = static::$table;
        $sql = "SELECT * FROM `{$table}` WHERE {$whereClause}";

        if ($orderBy !== '') {
            $sql .= " ORDER BY {$orderBy}";
        }

        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit;
        }

        return db_fetch_all($sql, $params);
    }
}
