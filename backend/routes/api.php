<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\BookController;
use App\Controllers\CategoryController;
use App\Controllers\GeneralController;
use App\Controllers\LoanController;
use App\Controllers\MemberController;
use App\Controllers\SettingController;
use App\Controllers\UserController;
use App\Controllers\ReportController;

// Instantiate controllers
$authController = new AuthController();
$bookController = new BookController();
$categoryController = new CategoryController();
$generalController = new GeneralController();
$loanController = new LoanController();
$memberController = new MemberController();
$settingController = new SettingController();
$userController = new UserController();
$reportController = new ReportController();

// General & Health Routes
$router->get('/api', [$generalController, 'index']);
$router->get('/api/health', [$generalController, 'health']);
$router->get('/api/db/ping', [$generalController, 'dbPing']);

// Auth Routes
$router->post('/api/auth/login', [$authController, 'login']);

// Settings Routes
$router->get('/api/settings', [$settingController, 'get']);
$router->put('/api/settings', [$settingController, 'put']);

// Categories Routes
$router->get('/api/categories', [$categoryController, 'list']);
$router->post('/api/categories', [$categoryController, 'create']);
$router->put('/api/categories', [$categoryController, 'update']);
$router->delete('/api/categories', [$categoryController, 'delete']);

// Books Routes
$router->get('/api/books', [$bookController, 'list']);
$router->post('/api/books', [$bookController, 'create']);
$router->put('/api/books', [$bookController, 'update']);
$router->delete('/api/books', [$bookController, 'delete']);

// Members Routes
$router->get('/api/members', [$memberController, 'list']);
$router->post('/api/members', [$memberController, 'create']);
$router->put('/api/members', [$memberController, 'update']);
$router->delete('/api/members', [$memberController, 'delete']);

// Loans (Sirkulasi) Routes
$router->get('/api/loans', [$loanController, 'list']);
$router->post('/api/loans', [$loanController, 'create']);
$router->put('/api/loans', [$loanController, 'update']);
$router->post('/api/loans/return', [$loanController, 'returnLoan']);
$router->post('/api/loans/cancel', [$loanController, 'cancel']);

// Users Routes
$router->get('/api/users', [$userController, 'list']);
$router->post('/api/users', [$userController, 'create']);

// Reports Routes
$router->get('/api/reports/overview', [$reportController, 'overview']);
