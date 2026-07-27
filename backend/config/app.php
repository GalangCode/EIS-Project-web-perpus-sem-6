<?php

declare(strict_types=1);

return [
    'name' => App\Support\Env::get('APP_NAME', 'EIS Balangan'),
    'env' => App\Support\Env::get('APP_ENV', 'local'),
    'debug' => App\Support\Env::bool('APP_DEBUG', true),
    'timezone' => App\Support\Env::get('APP_TIMEZONE', 'Asia/Singapore'),
    'cors_origin' => App\Support\Env::get('CORS_ORIGIN', '*'),
    'auth_secret' => App\Support\Env::get('JWT_SECRET', 'change-this-secret'),
];
