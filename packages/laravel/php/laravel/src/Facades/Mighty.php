<?php

declare(strict_types=1);

namespace Mighty\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse render(string $component, array<string, mixed> $props = [], array<string, mixed> $context = [])
 * @method static static share(string|callable(): array<string, mixed>|array<string, mixed> $key, mixed $value = null)
 *
 * @see \Mighty\Laravel\Mighty
 */
class Mighty extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Mighty\Laravel\Mighty::class;
    }
}
