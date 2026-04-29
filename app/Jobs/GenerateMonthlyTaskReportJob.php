<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\MonthlyTaskReportingService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateMonthlyTaskReportJob implements ShouldQueue
{
    use Queueable;

    /** Maximum seconds allowed for scoring. */
    public int $timeout = 120;

    public function __construct(
        public readonly CarbonImmutable $month,
        public readonly string $teamId,
        public readonly ?int $generatedById = null,
    ) {}

    public function handle(MonthlyTaskReportingService $reportingService): void
    {
        $generatedBy = $this->generatedById
            ? User::find($this->generatedById)
            : null;

        $reportingService->getOrGenerate(
            $this->month,
            $this->teamId,
            $generatedBy,
        );
    }
}
