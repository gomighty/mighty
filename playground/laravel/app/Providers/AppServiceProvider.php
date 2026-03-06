<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Mighty\Laravel\Mighty;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        /** @var Mighty $mighty */
        $mighty = app(Mighty::class);

        $mighty->share('appName', config('app.name'));
    }
}
