<?php

declare(strict_types=1);

namespace Mighty\Laravel\Console;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class MightyBuildCommand extends Command
{
    /** @var string */
    protected $signature = 'mighty:build {--runtime= : bun or node}';

    /** @var string */
    protected $description = 'Build the Astro project for production';

    public function handle(): int
    {
        /** @var string $runtime */
        $runtime = $this->option('runtime') ?? config('mighty.runtime', 'bun');
        $runner = $runtime === 'bun' ? 'bunx' : 'npx';

        /** @var string $astroRoot */
        $astroRoot = config('mighty.astro_root', 'resources/astro');
        $root = base_path($astroRoot);

        $process = new Process([$runner, 'mighty-sidecar', 'build', '--root', $root], base_path());
        $process->setTimeout(null);
        $process->setTty(Process::isTtySupported());
        $process->run(fn (string $type, string $buffer) => $this->output->write($buffer));

        return $process->getExitCode() ?? 0;
    }
}
