<?php

use App\Enums\GroupingType;
use App\Models\Comment;
use App\Models\Document;
use App\Models\Kanban;
use App\Models\KanbanColumn;
use App\Models\MonthlyTaskReport;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Services\MonthlyTaskReportingService;
use App\Services\TaskColumnScoringService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function ensureReportingRoles(): void
{
    Role::findOrCreate('member', 'web');
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('superadmin', 'web');
}

function createReportingTeam(array $overrides = []): Team
{
    return Team::create(array_merge([
        'name' => 'Operations',
        'slug' => fake()->unique()->slug(),
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ], $overrides));
}

function createReportingKanban(Team $team, array $columns): array
{
    $kanban = Kanban::create([
        'team_id' => $team->id,
        'name' => 'Main Board',
    ]);

    $created = [];
    foreach ($columns as $order => $columnData) {
        $created[] = KanbanColumn::create(array_merge([
            'kanban_id' => $kanban->id,
            'order' => $order + 1,
            'is_default' => $order === 0,
            'is_done' => false,
        ], $columnData));
    }

    return $created;
}

function createSopDocument(Team $team, User $user, array $overrides = []): Document
{
    return Document::create(array_merge([
        'team_id' => $team->id,
        'user_id' => $user->id,
        'name' => 'SOP Audit Team',
        'type' => 'document',
        'content' => implode("\n", [
            '1. PIC, tujuan, dan tgl kunjungan wajib dicatat di awal kunjungan.',
            '2. Cek absen kehadiran shift pagi lalu tulis hasil pengecekan di komentar.',
            '3. Audit aset jual dan lampirkan foto rak utama sebagai bukti.',
        ]),
        'is_sop' => true,
    ], $overrides));
}

// ─── TaskColumnScoringService Unit Tests ────────────────────────────────────

test('score 10 when comment matches column and has attachment', function () {
    $scoring = new TaskColumnScoringService;

    $task = [
        'id' => 'task-1',
        'title' => 'Test Task',
        'status' => 'Cek Absen Kehadiran Shift Pagi',
        'is_done' => false,
        'due_date' => '2026-04-22',
        'created_at' => '2026-04-20',
        'comments_count' => 1,
        'attachment_count' => 1,
        'comments' => [
            ['author' => 'User', 'content' => 'Sudah cek absen kehadiran shift pagi, semua hadir', 'attachments_count' => 1],
        ],
    ];

    $columns = [
        ['id' => 'col-1', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 1, 'is_done' => false],
    ];

    $result = $scoring->scoreTask($task, $columns);

    expect($result['breakdown_jalur'][0]['skor'])->toBe(10);
    expect($result['breakdown_jalur'][0]['penjelasan'])->toBe('Komentar cocok + File terlampir');
});

test('score 6 when comment matches column but no attachment', function () {
    $scoring = new TaskColumnScoringService;

    $task = [
        'id' => 'task-1',
        'title' => 'Test Task',
        'status' => 'Cek Absen Kehadiran Shift Pagi',
        'is_done' => false,
        'due_date' => '2026-04-22',
        'created_at' => '2026-04-20',
        'comments_count' => 1,
        'attachment_count' => 0,
        'comments' => [
            ['author' => 'User', 'content' => 'Sudah cek absen kehadiran shift pagi, semua hadir', 'attachments_count' => 0],
        ],
    ];

    $columns = [
        ['id' => 'col-1', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 1, 'is_done' => false],
    ];

    $result = $scoring->scoreTask($task, $columns);

    expect($result['breakdown_jalur'][0]['skor'])->toBe(6);
    expect($result['breakdown_jalur'][0]['penjelasan'])->toBe('Hanya komentar (tanpa lampiran file)');
});

test('score 3 when no comment matches but task is in next step', function () {
    $scoring = new TaskColumnScoringService;

    $task = [
        'id' => 'task-1',
        'title' => 'Test Task',
        'status' => 'Audit Aset Jual',
        'is_done' => false,
        'due_date' => '2026-04-22',
        'created_at' => '2026-04-20',
        'comments_count' => 0,
        'attachment_count' => 0,
        'comments' => [],
    ];

    $columns = [
        ['id' => 'col-1', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 1, 'is_done' => false],
        ['id' => 'col-2', 'title' => 'Audit Aset Jual', 'order' => 2, 'is_done' => false],
    ];

    $result = $scoring->scoreTask($task, $columns);

    // Column 1 should get score 3 because task is at column 2
    expect($result['breakdown_jalur'][0]['skor'])->toBe(3);
    expect($result['breakdown_jalur'][0]['penjelasan'])->toBe('Tanpa evidence, tapi sudah di step selanjutnya');

    // Column 2 should get score 0 because no matching comment for it
    expect($result['breakdown_jalur'][1]['skor'])->toBe(0);
});

test('score 0 when no comment and task is not past the step', function () {
    $scoring = new TaskColumnScoringService;

    $task = [
        'id' => 'task-1',
        'title' => 'Test Task',
        'status' => 'Cek Absen Kehadiran Shift Pagi',
        'is_done' => false,
        'due_date' => '2026-04-22',
        'created_at' => '2026-04-20',
        'comments_count' => 0,
        'attachment_count' => 0,
        'comments' => [],
    ];

    $columns = [
        ['id' => 'col-1', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 1, 'is_done' => false],
        ['id' => 'col-2', 'title' => 'Audit Aset Jual', 'order' => 2, 'is_done' => false],
    ];

    $result = $scoring->scoreTask($task, $columns);

    // Column 1 is current, no comment match -> 0
    expect($result['breakdown_jalur'][0]['skor'])->toBe(0);
    // Column 2 is after current, no match -> 0
    expect($result['breakdown_jalur'][1]['skor'])->toBe(0);
});

test('multiple columns scored correctly in a single task', function () {
    $scoring = new TaskColumnScoringService;

    $task = [
        'id' => 'task-1',
        'title' => 'Audit April',
        'status' => 'Audit Aset Jual',
        'is_done' => false,
        'due_date' => '2026-04-22',
        'created_at' => '2026-04-20',
        'comments_count' => 2,
        'attachment_count' => 1,
        'comments' => [
            ['author' => 'SPV', 'content' => 'PIC sudah ditentukan, tujuan kunjungan sudah dicatat', 'attachments_count' => 1],
            ['author' => 'SPV', 'content' => 'Sudah audit aset jual dan cek rak utama', 'attachments_count' => 0],
        ],
    ];

    $columns = [
        ['id' => 'col-1', 'title' => 'PIC, TUJUAN, DAN TGL KUNJUNGAN', 'order' => 1, 'is_done' => false],
        ['id' => 'col-2', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 2, 'is_done' => false],
        ['id' => 'col-3', 'title' => 'Audit Aset Jual', 'order' => 3, 'is_done' => false],
        ['id' => 'col-4', 'title' => 'Selesai', 'order' => 4, 'is_done' => true],
    ];

    $result = $scoring->scoreTask($task, $columns);

    // Col 1: PIC/TUJUAN — comment 1 matches (has "PIC", "tujuan", "kunjungan") + attachment → 10
    expect($result['breakdown_jalur'][0]['skor'])->toBe(10);

    // Col 2: Cek Absen — no matching comment, but task is past this column (order 2 < order 3) → 3
    expect($result['breakdown_jalur'][1]['skor'])->toBe(3);

    // Col 3: Audit Aset Jual — comment 2 matches ("audit", "aset", "jual"), no attachment → 6
    expect($result['breakdown_jalur'][2]['skor'])->toBe(6);

    // Col 4: Selesai — no matching comment, task is not past this (order 4 > order 3) → 0
    expect($result['breakdown_jalur'][3]['skor'])->toBe(0);

    // Total: 10 + 3 + 6 + 0 = 19
    expect($result['skor_total_task'])->toBe(19);
    expect($result['skor_maksimal_task'])->toBe(40);
});

test('every step is recorded in breakdown_jalur', function () {
    $scoring = new TaskColumnScoringService;

    $task = [
        'id' => 'task-1',
        'title' => 'Test Task',
        'status' => null,
        'is_done' => false,
        'due_date' => null,
        'created_at' => '2026-04-20',
        'comments_count' => 0,
        'attachment_count' => 0,
        'comments' => [],
    ];

    $columns = [
        ['id' => 'col-1', 'title' => 'Step A', 'order' => 1, 'is_done' => false],
        ['id' => 'col-2', 'title' => 'Step B', 'order' => 2, 'is_done' => false],
        ['id' => 'col-3', 'title' => 'Step C', 'order' => 3, 'is_done' => false],
        ['id' => 'col-4', 'title' => 'Step D', 'order' => 4, 'is_done' => false],
        ['id' => 'col-5', 'title' => 'Step E', 'order' => 5, 'is_done' => true],
    ];

    $result = $scoring->scoreTask($task, $columns);

    // Every column should appear in breakdown_jalur
    expect($result['breakdown_jalur'])->toHaveCount(5);
    expect(collect($result['breakdown_jalur'])->pluck('nama_jalur')->all())->toBe([
        'Step A', 'Step B', 'Step C', 'Step D', 'Step E',
    ]);
});

// ─── Integration Tests (Service-level) ──────────────────────────────────────

test('service generates monthly task report with word-matching scoring', function () {
    $admin = User::factory()->create(['name' => 'Admin Report']);
    $member = User::factory()->create(['name' => 'Ayu', 'position' => 'SPV']);
    $team = createReportingTeam(['name' => 'SPV Unit 1']);
    $team->users()->attach($admin->id, ['role' => 'admin']);
    $team->users()->attach($member->id, ['role' => 'member']);
    createSopDocument($team, $admin);

    [$col1, $col2, $col3, $col4] = createReportingKanban($team, [
        ['title' => 'PIC, TUJUAN, DAN TGL KUNJUNGAN'],
        ['title' => 'Cek Absen Kehadiran Shift Pagi'],
        ['title' => 'Audit Aset Jual'],
        ['title' => 'Done', 'is_done' => true],
    ]);

    // Task currently in column 3 (Audit Aset Jual)
    $task = Task::create([
        'team_id' => $team->id,
        'kanban_column_id' => $col3->id,
        'title' => 'Audit KPI April',
        'description' => 'Review task bulanan',
        'order_position' => 1,
        'creator_id' => $admin->id,
        'due_date' => now()->startOfMonth()->addDays(3),
        'created_at' => now()->startOfMonth()->addDays(1),
        'updated_at' => now()->startOfMonth()->addDays(1),
    ]);
    $task->assignees()->attach($member->id);

    // Add comments matching column names
    Comment::create([
        'task_id' => $task->id,
        'user_id' => $member->id,
        'content' => 'PIC sudah ditentukan, tujuan dan tanggal kunjungan dicatat',
    ]);
    Comment::create([
        'task_id' => $task->id,
        'user_id' => $member->id,
        'content' => 'Audit aset jual sudah dilakukan, rak sudah dicek',
    ]);

    /** @var MonthlyTaskReportingService $service */
    $service = app(MonthlyTaskReportingService::class);
    $month = CarbonImmutable::now()->startOfMonth();

    $report = $service->getOrGenerate($month, $team->id, $admin);

    expect($report)->not->toBeNull();
    expect($report->platform)->toBe('word-match');
    expect($report->model)->toBe('word-match-v1');
    expect($report->team_id)->toBe($team->id);
    expect($report->source_task_count)->toBe(1);
    expect(data_get($report->payload, 'teams.0.members.0.name'))->toBe('Ayu');
    expect(data_get($report->payload, 'teams.0.members.0.breakdown_task.0.nama_task'))->toBe('Audit KPI April');

    // Verify breakdown_jalur has all 4 columns
    $breakdown = data_get($report->payload, 'teams.0.members.0.breakdown_task.0.breakdown_jalur');
    expect($breakdown)->toHaveCount(4);

    // Column 1: PIC/TUJUAN — comment matches → 6 (no attachment)
    expect($breakdown[0]['nama_jalur'])->toBe('PIC, TUJUAN, DAN TGL KUNJUNGAN');
    expect($breakdown[0]['skor'])->toBe(6);

    // Column 2: Cek Absen — no match, but task is past this step → 3
    expect($breakdown[1]['nama_jalur'])->toBe('Cek Absen Kehadiran Shift Pagi');
    expect($breakdown[1]['skor'])->toBe(3);

    // Column 3: Audit Aset Jual — comment matches → 6 (no attachment)
    expect($breakdown[2]['nama_jalur'])->toBe('Audit Aset Jual');
    expect($breakdown[2]['skor'])->toBe(6);

    // Column 4: Done — task not past this → 0
    expect($breakdown[3]['nama_jalur'])->toBe('Done');
    expect($breakdown[3]['skor'])->toBe(0);

    // Total: 6 + 3 + 6 + 0 = 15, max = 40
    expect(data_get($report->payload, 'teams.0.members.0.breakdown_task.0.skor_total_task'))->toBe(15);
    expect(data_get($report->payload, 'teams.0.members.0.breakdown_task.0.skor_maksimal_task'))->toBe(40);
});

test('existing monthly report is reused without regenerating', function () {
    $admin = User::factory()->create();
    $team = createReportingTeam(['name' => 'Reusable Team']);
    createSopDocument($team, $admin);

    MonthlyTaskReport::create([
        'report_month' => now()->startOfMonth()->toDateString(),
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 0,
        'payload' => [
            'month' => now()->format('Y-m'),
            'period' => ['start' => now()->startOfMonth()->toDateString(), 'end' => now()->endOfMonth()->toDateString()],
            'overview' => [
                'headline' => 'Cached report',
                'summary' => 'Sudah ada report tersimpan.',
                'metrics' => ['task_count' => 0, 'completed_count' => 0, 'overdue_count' => 0, 'team_count' => 0, 'member_count' => 0],
            ],
            'teams' => [],
        ],
        'source_snapshot' => [
            'month' => now()->format('Y-m'),
            'period' => ['start' => now()->startOfMonth()->toDateString(), 'end' => now()->endOfMonth()->toDateString()],
            'overall' => ['task_count' => 0, 'completed_count' => 0, 'overdue_count' => 0, 'team_count' => 0, 'member_count' => 0],
            'teams' => [],
        ],
        'generated_at' => now(),
    ]);

    /** @var MonthlyTaskReportingService $service */
    $service = app(MonthlyTaskReportingService::class);
    $month = CarbonImmutable::now()->startOfMonth();

    $report = $service->getOrGenerate($month, $team->id, $admin);

    expect($report)->not->toBeNull();
    expect(MonthlyTaskReport::query()->count())->toBe(1);
    expect(data_get($report->payload, 'overview.headline'))->toBe('Cached report');
});

test('admin can access reporting index page', function () {
    ensureReportingRoles();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('reporting.index'))
        ->assertSuccessful();
});

test('member cannot access reporting page', function () {
    ensureReportingRoles();

    $user = User::factory()->create();
    $user->assignRole('member');

    $this->actingAs($user)
        ->get(route('reporting.index'))
        ->assertForbidden();
});

test('member cannot access api reporting endpoint', function () {
    ensureReportingRoles();

    $user = User::factory()->create();
    $user->assignRole('member');
    $team = createReportingTeam(['name' => 'Restricted Team']);
    createSopDocument($team, $user);

    Sanctum::actingAs($user);

    $this->getJson(route('api.v1.reports.monthly-tasks.show', ['month' => now()->format('Y-m'), 'team_id' => $team->id]))
        ->assertForbidden();
});

test('only sop teams are exposed by the reporting service', function () {
    $user = User::factory()->create();
    $teamWithSop = createReportingTeam(['name' => 'Team With SOP']);
    $teamWithoutSop = createReportingTeam(['name' => 'Team Without SOP']);
    createSopDocument($teamWithSop, $user);

    $teams = app(MonthlyTaskReportingService::class)->teamOptions();

    expect(collect($teams)->pluck('id')->all())->toBe([$teamWithSop->id]);
    expect(collect($teams)->pluck('id')->all())->not->toContain($teamWithoutSop->id);
});

test('report generation fails for team without sop', function () {
    $admin = User::factory()->create();
    $team = createReportingTeam(['name' => 'No SOP Team']);

    /** @var MonthlyTaskReportingService $service */
    $service = app(MonthlyTaskReportingService::class);
    $month = CarbonImmutable::now()->startOfMonth();

    expect(fn () => $service->getOrGenerate($month, $team->id, $admin))
        ->toThrow(RuntimeException::class, 'Team tidak memiliki SOP');
});

test('performance label is calculated from compliance percentage', function () {
    $scoring = new TaskColumnScoringService;

    expect($scoring->determinePerformanceLabel('85.0'))->toBe('excellent');
    expect($scoring->determinePerformanceLabel('70.0'))->toBe('good');
    expect($scoring->determinePerformanceLabel('50.0'))->toBe('watch');
    expect($scoring->determinePerformanceLabel('30.0'))->toBe('critical');
});
