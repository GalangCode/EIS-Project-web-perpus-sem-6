<?php

declare(strict_types=1);

namespace App\Support;

use PDO;
use PDOException;

final class Database
{
    public static function connection(array $config): PDO
    {
        if (($config['driver'] ?? 'mysql') !== 'mysql') {
            throw new PDOException('Only mysql driver is configured in this bootstrap.');
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['host'] ?? '127.0.0.1',
            $config['port'] ?? '3306',
            $config['name'] ?? '',
            $config['charset'] ?? 'utf8mb4',
        );

        $pdo = new PDO(
            $dsn,
            (string) ($config['user'] ?? 'root'),
            (string) ($config['pass'] ?? ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );

        return $pdo;
    }
}

