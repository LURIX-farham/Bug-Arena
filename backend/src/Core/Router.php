<?php
declare(strict_types=1);

namespace BugArena\Core;

use Throwable;

final class Router
{
    /** @var array<int, array{method:string, pattern:string, regex:string, handler:callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, callable $handler): void
    {
        $regex = '#^' . preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = compact('method', 'pattern', 'regex', 'handler');
    }

    public function dispatch(Request $request): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }
            if (preg_match($route['regex'], $request->path, $matches) !== 1) {
                continue;
            }
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }
            try {
                ($route['handler'])($request, $params);
            } catch (ValidationException $e) {
                Response::error($e->getCode1(), $e->getStatusCode(), $e->getExtra());
            } catch (Throwable $e) {
                Logger::error('unhandled', $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
                Response::error('internal_error', 500);
            }
            return;
        }

        // Path matched but wrong verb?
        $allowed = [];
        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $request->path) === 1) {
                $allowed[] = $route['method'];
            }
        }
        if ($allowed !== []) {
            header('Allow: ' . implode(', ', array_unique($allowed)));
            $debug = (bool) (($GLOBALS['bug_arena_config']['app']['debug'] ?? false));
            if ($debug) {
                Response::json([
                    'ok' => false,
                    'error' => 'method_not_allowed',
                    'path' => $request->path,
                    'method' => $request->method,
                    'allowed' => array_values(array_unique($allowed)),
                    'requestUri' => $_SERVER['REQUEST_URI'] ?? null,
                    'scriptName' => $_SERVER['SCRIPT_NAME'] ?? null,
                    'pathInfo' => $_SERVER['PATH_INFO'] ?? null,
                    'redirectUrl' => $_SERVER['REDIRECT_URL'] ?? null,
                ], 405);
            }
            Response::error('method_not_allowed', 405);
        }
        $debug = (bool) (($GLOBALS['bug_arena_config']['app']['debug'] ?? false));
        if ($debug) {
            Response::json([
                'ok' => false,
                'error' => 'not_found',
                'path' => $request->path,
                'method' => $request->method,
                'requestUri' => $_SERVER['REQUEST_URI'] ?? null,
                'scriptName' => $_SERVER['SCRIPT_NAME'] ?? null,
            ], 404);
        }
        Response::error('not_found', 404);
    }
}
