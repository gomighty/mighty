<?php

declare(strict_types=1);

return [
    'sidecar_url' => env('MIGHTY_SIDECAR_URL', 'http://127.0.0.1:5174'),
    'sidecar_port' => env('MIGHTY_SIDECAR_PORT', 5174),
    'astro_root' => env('MIGHTY_ASTRO_ROOT', 'resources/astro'),
    'timeout' => env('MIGHTY_TIMEOUT', 30),
    'runtime' => env('MIGHTY_RUNTIME', 'bun'),
];
