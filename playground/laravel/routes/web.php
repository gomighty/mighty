<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => mighty('index'));

Route::get('/props', fn () => mighty('props', ['title' => 'Hello', 'items' => ['a', 'b', 'c']]));

Route::get('/context', fn () => mighty('context'));
