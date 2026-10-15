<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$pathInfo = $_SERVER['PATH_INFO'] ?? $_SERVER['ORIG_PATH_INFO'] ?? '';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
$base = rtrim(dirname($scriptName), '/');

$resolved = $path;
if (is_string($pathInfo) && $pathInfo !== '' && $pathInfo !== '/') {
    $resolved = $pathInfo;
} else {
    if ($base !== '' && $base !== '/' && $base !== '.' && str_starts_with($path, $base)) {
        $remainder = substr($path, strlen($base)) ?: '/';
        if ($remainder !== '/index.php' && $remainder !== 'index.php' && $remainder !== '/') {
            $resolved = $remainder;
        }
    }
}
foreach (['/api/public', '/api'] as $mount) {
    if ($resolved === $mount || str_starts_with($resolved, $mount . '/')) {
        $resolved = substr($resolved, strlen($mount)) ?: '/';
    }
}
$resolved = '/' . trim($resolved, '/');
if ($resolved !== '/') {
    $resolved = rtrim($resolved, '/') ?: '/';
}

echo json_encode([
    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? null,
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? null,
    'PATH_INFO' => $pathInfo ?: null,
    'parsed_path' => $path,
    'script_base' => $base,
    'resolved_route_path' => $resolved,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
