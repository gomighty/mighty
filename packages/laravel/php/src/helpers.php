<?php

declare(strict_types=1);

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Mighty\Laravel\Mighty;

/**
 * @param  array<string, mixed>  $props
 * @param  array<string, mixed>  $context
 */
function mighty(?string $component = null, array $props = [], array $context = []): Mighty|string|RedirectResponse
{
    /** @var Mighty $mighty */
    $mighty = app(Mighty::class);

    if ($component === null) {
        return $mighty;
    }

    $response = $mighty->render($component, $props, $context);

    if ($response instanceof RedirectResponse) {
        return $response;
    }

    return $response->getContent() ?: '';
}
