<?php

use App\Models\KpiDailyReport;
use App\Models\Position;
use App\Models\PositionPermission;
use App\Models\PositionReportField;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->managerPositions = ['Manager HR', 'Manager Operasional', 'Manager Gudang'];
    $this->managerUsers = [];

    foreach ($this->managerPositions as $name) {
        $position = Position::firstOrCreate(['name' => $name]);
        PositionPermission::firstOrCreate([
            'position_id' => $position->id,
            'route_key' => match ($name) {
                'Manager HR' => 'hr',
                'Manager Operasional' => 'operational',
                default => 'gudang',
            },
        ]);

        PositionReportField::updateOrCreate(
            ['position_id' => $position->id, 'field_key' => 'daily_note'],
            [
                'field_label' => 'Daily Note',
                'field_type' => 'textarea',
                'group_label' => 'Laporan',
                'is_required' => true,
                'sort_order' => 1,
            ]
        );

        // Create one user per manager position for predictable pending counts
        $this->managerUsers[$name] = User::factory()->create(['position_id' => $position->id]);
    }
});

function submitReport(User $user, string $date, array $fields = []): KpiDailyReport
{
    return KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => $date,
        'fields' => $fields ?: ['daily_note' => 'Report from '.$user->jobPosition->name],
        'submitted_at' => now(),
        'is_late' => false,
    ]);
}

test('returns submitted reports and pending managers', function (): void {
    $yesterday = now()->subDay()->toDateString();
    submitReport($this->managerUsers['Manager Gudang'], $yesterday);

    $response = $this->getJson('/api/reports/daily-manager');

    $response
        ->assertOk()
        ->assertJsonPath('date', $yesterday)
        ->assertJsonCount(1, 'reports')
        ->assertJsonCount(2, 'pending')
        ->assertJsonStructure([
            'date',
            'reports' => [
                '*' => ['id', 'user', 'fields', 'report_fields', 'tasks', 'submitted_at', 'is_late'],
            ],
            'pending' => [
                '*' => ['user', 'report_fields'],
            ],
        ]);
});

test('report includes manager tasks with comments', function (): void {
    $yesterday = now()->subDay()->toDateString();
    $user = $this->managerUsers['Manager Gudang'];

    submitReport($user, $yesterday, ['daily_note' => 'Report']);

    $task = Task::factory()->create([
        'creator_id' => $user->id,
        'is_kpi_task' => true,
        'created_at' => $yesterday,
    ]);

    $response = $this->getJson('/api/reports/daily-manager');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'reports.0.tasks')
        ->assertJsonPath('reports.0.tasks.0.id', $task->id)
        ->assertJsonPath('reports.0.tasks.0.is_kpi_task', true)
        ->assertJsonStructure([
            'reports' => [
                '*' => [
                    'tasks' => [
                        '*' => ['id', 'title', 'is_verified', 'is_done', 'comments', 'comment_count', 'has_media'],
                    ],
                ],
            ],
        ]);
});

test('pending includes managers who did not submit', function (): void {
    submitReport($this->managerUsers['Manager HR'], now()->subDay()->toDateString());

    $response = $this->getJson('/api/reports/daily-manager');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'reports')
        ->assertJsonCount(2, 'pending')
        ->assertJsonPath('reports.0.user.job_position.name', 'Manager HR');

    $pendingPositions = collect($response['pending'])->pluck('user.job_position.name')->sort()->values()->all();
    expect($pendingPositions)->toBe(['Manager Gudang', 'Manager Operasional']);
});

test('pending includes report_fields template', function (): void {
    $response = $this->getJson('/api/reports/daily-manager?date=2025-01-01');

    $response
        ->assertOk()
        ->assertJsonCount(0, 'reports')
        ->assertJsonCount(3, 'pending');

    foreach ($response['pending'] as $pending) {
        expect($pending['report_fields'])->toHaveCount(1)
            ->and($pending['report_fields'][0]['field_key'])->toBe('daily_note');
    }
});

test('returns reports for specified date', function (): void {
    submitReport($this->managerUsers['Manager HR'], '2026-06-14');
    submitReport($this->managerUsers['Manager Operasional'], '2026-06-14');

    $response = $this->getJson('/api/reports/daily-manager?date=2026-06-14');

    $response
        ->assertOk()
        ->assertJsonPath('date', '2026-06-14')
        ->assertJsonCount(2, 'reports')
        ->assertJsonCount(1, 'pending');
});

test('rejects invalid date format', function (): void {
    $this->getJson('/api/reports/daily-manager?date=invalid')
        ->assertStatus(422);
});

test('does not include non-manager users', function (): void {
    $yesterday = now()->subDay()->toDateString();
    $position = Position::firstOrCreate(['name' => 'Staff Gudang']);
    $user = User::factory()->create(['position_id' => $position->id]);

    KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => $yesterday,
        'fields' => ['note' => 'Staff report'],
        'submitted_at' => now(),
    ]);

    $response = $this->getJson('/api/reports/daily-manager');

    $response
        ->assertOk()
        ->assertJsonCount(0, 'reports')
        ->assertJsonCount(3, 'pending');
});
