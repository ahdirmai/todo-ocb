<?php

use App\Models\KpiDailyReport;
use App\Models\Position;
use App\Models\PositionReportField;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeReporterPosition(string $name, string $area, bool $isManager): Position
{
    $position = Position::firstOrCreate(
        ['name' => $name],
        [
            'area_slug' => $area,
            'has_kpi' => true,
            'is_manager' => $isManager,
            'requires_spv_team' => false,
        ]
    );

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

    return $position;
}

function submitReporterReport(User $user, string $date, array $fields = []): KpiDailyReport
{
    return KpiDailyReport::create([
        'user_id' => $user->id,
        'report_date' => $date,
        'fields' => $fields ?: ['daily_note' => 'Report'],
        'submitted_at' => now(),
        'is_late' => false,
    ]);
}

beforeEach(function (): void {
    // A manager reporter and a non-manager reporter (e.g. SPV) — both have a
    // report template, so both must appear in the feed.
    $this->manager = User::factory()->create([
        'position_id' => makeReporterPosition('Manager HR', 'hr', true)->id,
    ]);
    $this->spv = User::factory()->create([
        'position_id' => makeReporterPosition('SPV Unit 1', 'spv', false)->id,
    ]);
});

test('feed includes every position with a report template, not just managers', function (): void {
    $yesterday = now()->subDay()->toDateString();
    submitReporterReport($this->spv, $yesterday);

    $response = $this->getJson('/api/reports/daily-reporters');

    $response
        ->assertOk()
        ->assertJsonPath('date', $yesterday)
        ->assertJsonCount(1, 'reports')
        ->assertJsonCount(1, 'pending')
        ->assertJsonPath('reports.0.user.job_position.name', 'SPV Unit 1');

    expect(collect($response['pending'])->pluck('user.job_position.name')->all())
        ->toBe(['Manager HR']);
});

test('date filter selects reports for the requested day', function (): void {
    submitReporterReport($this->manager, '2026-06-14');
    submitReporterReport($this->spv, '2026-06-14');

    $this->getJson('/api/reports/daily-reporters?date=2026-06-14')
        ->assertOk()
        ->assertJsonPath('date', '2026-06-14')
        ->assertJsonCount(2, 'reports')
        ->assertJsonCount(0, 'pending');
});

test('date filter defaults to yesterday', function (): void {
    $this->getJson('/api/reports/daily-reporters')
        ->assertOk()
        ->assertJsonPath('date', now()->subDay()->toDateString());
});

test('rejects invalid date format', function (): void {
    $this->getJson('/api/reports/daily-reporters?date=invalid')
        ->assertStatus(422);
});

test('excludes positions without a report template', function (): void {
    $staffPosition = Position::firstOrCreate(['name' => 'Staff Gudang'], [
        'area_slug' => 'gudang',
        'has_kpi' => false,
        'is_manager' => false,
    ]);
    $staff = User::factory()->create(['position_id' => $staffPosition->id]);
    submitReporterReport($staff, now()->subDay()->toDateString());

    $response = $this->getJson('/api/reports/daily-reporters');

    // Staff has no report template → not counted as a reporter.
    $response
        ->assertOk()
        ->assertJsonCount(0, 'reports')
        ->assertJsonCount(2, 'pending');
});

test('report includes reporter kpi tasks', function (): void {
    $yesterday = now()->subDay()->toDateString();
    submitReporterReport($this->spv, $yesterday);

    $task = Task::factory()->create([
        'creator_id' => $this->spv->id,
        'is_kpi_task' => true,
        'created_at' => $yesterday,
    ]);

    $this->getJson('/api/reports/daily-reporters')
        ->assertOk()
        ->assertJsonCount(1, 'reports.0.tasks')
        ->assertJsonPath('reports.0.tasks.0.id', $task->id)
        ->assertJsonStructure([
            'reports' => [
                '*' => ['id', 'user', 'fields', 'report_fields', 'tasks', 'submitted_at', 'is_late'],
            ],
            'pending' => [
                '*' => ['user', 'report_fields'],
            ],
        ]);
});
