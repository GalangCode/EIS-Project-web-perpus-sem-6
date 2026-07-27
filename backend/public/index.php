<?php

declare(strict_types=1);

$bootstrap = require __DIR__ . '/../bootstrap.php';

$appConfig = $bootstrap['app'] ?? [];
header('Access-Control-Allow-Origin: ' . ($appConfig['cors_origin'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

$router = new App\Http\Router();
require __DIR__ . '/../routes/api.php';

$request = App\Http\Request::fromGlobals();
$router->dispatch($request, $bootstrap);
