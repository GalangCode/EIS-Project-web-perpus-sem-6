<?php

declare(strict_types=1);

return [
    'driver' => App\Support\Env::get('DB_DRIVER', 'mysql'),
    'host' => App\Support\Env::get('DB_HOST', '127.0.0.1'),
    'port' => App\Support\Env::get('DB_PORT', '3306'),
    'name' => App\Support\Env::get('DB_NAME', 'eis_balangan'),
    'user' => App\Support\Env::get('DB_USER', 'root'),
    'pass' => App\Support\Env::get('DB_PASS', ''),
    'charset' => App\Support\Env::get('DB_CHARSET', 'utf8mb4'),
];

