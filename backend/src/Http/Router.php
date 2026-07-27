<?php

declare(strict_types=1);

namespace App\Http;

final class Router
{
    /**
     * @var array<string, array<string, callable>>
     */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->add('PUT', $path, $handler);
    }

    public function patch(string $path, callable $handler): void
    {
        $this->add('PATCH', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $this->routes[$method][$path] = $handler;
    }

    public function dispatch(Request $request, array $context = []): void
    {
        $method = $request->method();
        $path = $request->path();

        if ($method === 'OPTIONS') {
            Response::emit(Response::json([
                'success' => true,
                'message' => 'Preflight accepted',
            ]));
            return;
        }

        $handler = $this->routes[$method][$path] ?? null;

        if (!$handler) {
            Response::emit(Response::json([
                'success' => false,
                'message' => 'Route not found',
                'data' => [
                    'method' => $method,
                    'path' => $path,
                ],
            ], 404));
            return;
        }

        $result = $handler($request, $context);

        if (is_array($result) && array_key_exists('status', $result) && array_key_exists('body', $result)) {
            Response::emit($result);
            return;
        }

        Response::emit(Response::json([
            'success' => true,
            'data' => $result,
        ]));
    }
}

