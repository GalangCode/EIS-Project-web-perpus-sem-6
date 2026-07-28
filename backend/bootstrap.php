<?php

declare(strict_types=1);

require_once __DIR__ . '/src/Support/Env.php';
require_once __DIR__ . '/src/Support/Database.php';
require_once __DIR__ . '/src/Support/Token.php';
require_once __DIR__ . '/src/Support/BookValidation.php';
require_once __DIR__ . '/src/Support/MemberValidation.php';
require_once __DIR__ . '/src/Http/Request.php';
require_once __DIR__ . '/src/Http/Response.php';
require_once __DIR__ . '/src/Http/Router.php';
require_once __DIR__ . '/src/Middleware/AuthMiddleware.php';

App\Support\Env::load(__DIR__ . '/.env');

date_default_timezone_set(App\Support\Env::get('APP_TIMEZONE', 'Asia/Singapore'));

return [
    'app' => require __DIR__ . '/config/app.php',
    'database' => require __DIR__ . '/config/database.php',
];
