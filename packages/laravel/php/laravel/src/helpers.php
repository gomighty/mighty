<?php

declare(strict_types=1);

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Mighty\Laravel\Mighty;

/**
 * @param  array<string, mixed>  $props
 * @param  array<string, mixed>  $context
 */
function mighty(?string $component = null, array $props = [], array $context = []): Mighty|Response|RedirectResponse
{
    /** @var Mighty $mighty */
    $mighty = app(Mighty::class);

    if ($component === null) {
        return $mighty;
    }

    return $mighty->render($component, $props, $context);
}
