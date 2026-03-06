<?php

declare(strict_types=1);

namespace Mighty\Laravel;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Mighty\Laravel\Console\MightyBuildCommand;
use Mighty\Laravel\Console\MightyDevCommand;
use Mighty\Laravel\Console\MightyStartCommand;

class MightyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/mighty.php', 'mighty');
        $this->app->singleton(Mighty::class);
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__.'/../config/mighty.php' => config_path('mighty.php'),
        ], 'mighty-config');

        $this->registerBladePrecompiler();
        $this->registerBladeDirective();

        if ($this->app->runningInConsole()) {
            $this->commands([
                MightyDevCommand::class,
                MightyBuildCommand::class,
                MightyStartCommand::class,
            ]);
        }
    }

    protected function registerBladePrecompiler(): void
    {
        Blade::precompiler(function (string $string): string {
            // Match self-closing tags: <mighty:component.name :dynamic="$expr" static="value" />
            $string = preg_replace_callback(
                '/<mighty:([a-z0-9._]+)((?:\s+:?[a-z0-9_-]+="[^"]*")*)\s*\/>/i',
                fn (array $matches) => $this->compileMightyTag($matches[1], $matches[2]),
                $string,
            ) ?? $string;

            // Match paired tags: <mighty:component.name ...>...</mighty:component.name>
            $string = preg_replace_callback(
                '/<mighty:([a-z0-9._]+)((?:\s+:?[a-z0-9_-]+="[^"]*")*)\s*>.*?<\/mighty:\1>/si',
                fn (array $matches) => $this->compileMightyTag($matches[1], $matches[2]),
                $string,
            ) ?? $string;

            return $string;
        });
    }

    protected function registerBladeDirective(): void
    {
        Blade::directive('mighty', fn (string $expression) => "<?php echo mighty({$expression}); ?>");
    }

    protected function compileMightyTag(string $component, string $attributeString): string
    {
        $props = $this->parseAttributes($attributeString);

        if ($props === '') {
            return "<?php echo mighty('{$component}'); ?>";
        }

        return "<?php echo mighty('{$component}', [{$props}]); ?>";
    }

    protected function parseAttributes(string $attributeString): string
    {
        $props = [];

        // Match dynamic attributes: :prop="$expression"
        preg_match_all('/:([a-z0-9_-]+)="([^"]*)"/i', $attributeString, $dynamicMatches, PREG_SET_ORDER);
        foreach ($dynamicMatches as $match) {
            $props[] = "'{$match[1]}' => {$match[2]}";
        }

        // Match static attributes: prop="value" (not prefixed with :)
        preg_match_all('/(?<!:)\b([a-z0-9_-]+)="([^"]*)"/i', $attributeString, $staticMatches, PREG_SET_ORDER);
        foreach ($staticMatches as $match) {
            $props[] = "'{$match[1]}' => '{$match[2]}'";
        }

        return implode(', ', $props);
    }
}
