<?php

declare(strict_types=1);

namespace Mighty\Laravel;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;

class Mighty
{
    /** @var array<string, mixed> */
    protected array $sharedProps = [];

    /** @var list<callable(): array<string, mixed>> */
    protected array $lazySharedProps = [];

    /**
     * @param  array<string, mixed>  $props
     * @param  array<string, mixed>  $context
     */
    public function render(string $component, array $props = [], array $context = []): Response|RedirectResponse
    {
        $laravelContext = $this->buildLaravelContext();
        $mergedContext = array_merge($laravelContext, $context);

        /** @var array{status?: int, content?: string, redirectTo?: string} $data */
        $data = $this->httpClient()
            ->post('/render', [
                'component' => $component,
                'props' => $props,
                'context' => $mergedContext,
            ])
            ->json();

        if (isset($data['redirectTo'])) {
            return new RedirectResponse($data['redirectTo']);
        }

        return new Response(
            $data['content'] ?? '',
            $data['status'] ?? 200,
            ['Content-Type' => 'text/html'],
        );
    }

    /**
     * @param  string|callable(): array<string, mixed>|array<string, mixed>  $key
     */
    public function share(string|callable|array $key, mixed $value = null): static
    {
        if (is_array($key)) {
            /** @var array<string, mixed> $merged */
            $merged = array_merge($this->sharedProps, $key);
            $this->sharedProps = $merged;
        } elseif (is_callable($key)) {
            $this->lazySharedProps[] = $key;
        } else {
            $this->sharedProps[$key] = $value;
        }

        return $this;
    }

    public function httpClient(): PendingRequest
    {
        /** @var string $baseUrl */
        $baseUrl = config('mighty.sidecar_url', 'http://127.0.0.1:5174');

        /** @var int $timeout */
        $timeout = config('mighty.timeout', 30);

        return Http::baseUrl($baseUrl)
            ->timeout($timeout)
            ->acceptJson();
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildLaravelContext(): array
    {
        $shared = $this->resolveSharedProps();

        $context = [
            '_shared' => $shared,
            '_csrfToken' => csrf_token(),
        ];

        $request = request();

        if ($request->user()) {
            $context['_user'] = $request->user()->toArray();
        }

        if ($request->hasSession()) {
            $context['_session'] = $request->session()->all();

            $errors = $request->session()->get('errors');
            if ($errors instanceof \Illuminate\Support\ViewErrorBag) {
                $context['_errors'] = [];
                foreach ($errors->getBags() as $bag => $messageBag) {
                    $context['_errors'][$bag] = $messageBag->toArray();
                }
            }
        }

        return $context;
    }

    /**
     * @return array<string, mixed>
     */
    protected function resolveSharedProps(): array
    {
        $resolved = $this->sharedProps;

        foreach ($this->lazySharedProps as $callback) {
            /** @var array<string, mixed> $result */
            $result = $callback();
            $resolved = array_merge($resolved, $result);
        }

        return $resolved;
    }
}
