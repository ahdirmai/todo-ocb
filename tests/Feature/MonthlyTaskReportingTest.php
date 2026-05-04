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

test('internal recap per user without team_id returns all teams for requested month', function () {
    $admin = User::factory()->create();
    $teamA = createReportingTeam(['name' => 'All Team A']);
    $teamB = createReportingTeam(['name' => 'All Team B']);
    createSopDocument($teamA, $admin);
    createSopDocument($teamB, $admin);

    $recap = fn (string $name) => [[
        'member_key' => 'user:1', 'name' => $name, 'position' => 'SPV',
        'team_name' => $name, 'work_days' => 26, 'jumlah_task' => 3,
        'total_score' => 900, 'skor_maksimal' => 1200, 'target_score' => 5000,
        'max_score_per_task' => 400, 'compliance_persen' => '75.0',
        'target_compliance' => '18.0', 'performance_label' => 'good',
        'kpi_status' => 'tidak_memenuhi',
    ]];

    $base = [
        'report_month' => '2026-04-01',
        'platform' => 'word-match',
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 3,
        'payload' => ['month' => '2026-04', 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => '2026-04', 'overall' => [], 'teams' => []],
        'generated_at' => now(),
    ];

    MonthlyTaskReport::create(array_merge($base, ['team_id' => $teamA->id, 'recap_per_user' => $recap('All Team A')]));
    MonthlyTaskReport::create(array_merge($base, ['team_id' => $teamB->id, 'recap_per_user' => $recap('All Team B')]));

    config(['app.api_secret_key' => 'test-secret-123']);

    $response = $this->withHeaders(['X-Secret-Key' => 'test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.recap-per-user', ['month' => '2026-04']));

    $response->assertSuccessful()
        ->assertJsonPath('data.month', '2026-04')
        ->assertJsonPath('data.source_task_count', 6)
        ->assertJsonCount(2, 'data.recap_per_user');
});

test('internal recap per user without team_id returns empty when month has no reports', function () {
    $admin = User::factory()->create();
    $team = createReportingTeam(['name' => 'May Team']);
    createSopDocument($team, $admin);

    // Hanya ada data April, tidak ada Mei
    MonthlyTaskReport::create([
        'report_month' => '2026-04-01',
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 3,
        'payload' => ['month' => '2026-04', 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => '2026-04', 'overall' => [], 'teams' => []],
        'generated_at' => now(),
    ]);

    config(['app.api_secret_key' => 'test-secret-123']);

    // Request bulan Mei — harus return kosong, bukan fallback ke April
    $this->withHeaders(['X-Secret-Key' => 'test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.recap-per-user', ['month' => '2026-05']))
        ->assertSuccessful()
        ->assertJsonPath('data.month', '2026-05')
        ->assertJsonPath('data.recap_per_user', [])
        ->assertJsonPath('data.source_task_count', 0);
});

test('internal recap per user without team_id returns empty when no reports exist', function () {
    config(['app.api_secret_key' => 'test-secret-123']);

    $this->withHeaders(['X-Secret-Key' => 'test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.recap-per-user'))
        ->assertSuccessful()
        ->assertJsonPath('data.recap_per_user', [])
        ->assertJsonPath('data.source_task_count', 0);
});

test('internal endpoint returns reports with valid secret key', function () {
    $admin = User::factory()->create();
    $team = createReportingTeam(['name' => 'Internal Team']);
    createSopDocument($team, $admin);

    MonthlyTaskReport::create([
        'report_month' => '2026-04-01',
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 5,
        'payload' => ['month' => '2026-04', 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => '2026-04', 'overall' => [], 'teams' => []],
        'generated_at' => now(),
    ]);

    config(['app.api_secret_key' => 'test-secret-123']);

    $this->withHeaders(['X-Secret-Key' => 'test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.index'))
        ->assertSuccessful()
        ->assertJsonCount(1, 'data');
});

test('internal endpoint accepts Authorization Bearer as secret key', function () {
    config(['app.api_secret_key' => 'test-secret-123']);

    $this->withHeaders(['Authorization' => 'Bearer test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.index'))
        ->assertSuccessful();
});

test('internal endpoint rejects request without secret key', function () {
    $this->getJson(route('api.v1.internal.reports.monthly-tasks.index'))
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Invalid or missing secret key.');
});

test('internal endpoint rejects request with wrong secret key', function () {
    config(['app.api_secret_key' => 'correct-secret']);

    $this->withHeaders(['X-Secret-Key' => 'wrong-secret'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.index'))
        ->assertUnauthorized();
});

test('internal endpoint recap per user returns data with valid secret key', function () {
    $admin = User::factory()->create();
    $team = createReportingTeam(['name' => 'Internal Recap Team']);
    createSopDocument($team, $admin);

    MonthlyTaskReport::create([
        'report_month' => now()->startOfMonth()->toDateString(),
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 3,
        'payload' => ['month' => now()->format('Y-m'), 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => now()->format('Y-m'), 'overall' => [], 'teams' => []],
        'recap_per_user' => [[
            'member_key' => 'user:1', 'name' => 'Budi', 'position' => 'SPV',
            'team_name' => 'Internal Recap Team', 'work_days' => 26,
            'jumlah_task' => 3, 'total_score' => 900, 'skor_maksimal' => 1200,
            'target_score' => 5000, 'max_score_per_task' => 400,
            'compliance_persen' => '75.0', 'target_compliance' => '18.0',
            'performance_label' => 'good', 'kpi_status' => 'tidak_memenuhi',
        ]],
        'generated_at' => now(),
    ]);

    config(['app.api_secret_key' => 'test-secret-123']);

    $this->withHeaders(['X-Secret-Key' => 'test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.recap-per-user', [
            'month' => now()->format('Y-m'),
            'team_id' => $team->id,
        ]))
        ->assertSuccessful()
        ->assertJsonPath('data.recap_per_user.0.name', 'Budi');
});

test('admin can list all generated reports via api', function () {
    ensureReportingRoles();

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $team = createReportingTeam(['name' => 'Index Team']);
    createSopDocument($team, $admin);

    $baseReport = [
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 3,
        'payload' => ['month' => '2026-03', 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => '2026-03', 'overall' => [], 'teams' => []],
        'generated_at' => now(),
    ];

    MonthlyTaskReport::create(array_merge($baseReport, ['report_month' => '2026-03-01']));
    MonthlyTaskReport::create(array_merge($baseReport, [
        'report_month' => '2026-04-01',
        'payload' => ['month' => '2026-04', 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => '2026-04', 'overall' => [], 'teams' => []],
    ]));

    Sanctum::actingAs($admin);

    $response = $this->getJson(route('api.v1.reports.monthly-tasks.index'));

    $response->assertSuccessful()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.month', '2026-04')
        ->assertJsonPath('data.1.month', '2026-03')
        ->assertJsonStructure([
            'data' => [['id', 'month', 'report_month', 'platform', 'team', 'generated_at', 'source_task_count']],
            'meta' => ['total', 'per_page', 'current_page'],
        ]);
});

test('admin can filter reports by team_id', function () {
    ensureReportingRoles();

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $teamA = createReportingTeam(['name' => 'Team Filter A']);
    $teamB = createReportingTeam(['name' => 'Team Filter B']);
    createSopDocument($teamA, $admin);
    createSopDocument($teamB, $admin);

    $makeReport = fn (Team $team, string $month) => MonthlyTaskReport::create([
        'report_month' => $month.'-01',
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 0,
        'payload' => ['month' => $month, 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => $month, 'overall' => [], 'teams' => []],
        'generated_at' => now(),
    ]);

    $makeReport($teamA, '2026-03');
    $makeReport($teamB, '2026-03');

    Sanctum::actingAs($admin);

    $response = $this->getJson(route('api.v1.reports.monthly-tasks.index', ['team_id' => $teamA->id]));

    $response->assertSuccessful()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.team.id', $teamA->id);
});

test('member cannot access reports index api', function () {
    ensureReportingRoles();

    $user = User::factory()->create();
    $user->assignRole('member');

    Sanctum::actingAs($user);

    $this->getJson(route('api.v1.reports.monthly-tasks.index'))->assertForbidden();
});

test('admin can get recap per user from api', function () {
    ensureReportingRoles();

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $team = createReportingTeam(['name' => 'Recap Team']);
    createSopDocument($team, $admin);

    $recapData = [
        [
            'member_key' => 'user:1',
            'name' => 'Budi Santoso',
            'position' => 'SPV Area A',
            'team_name' => 'Recap Team',
            'work_days' => 26,
            'jumlah_task' => 5,
            'total_score' => 1500,
            'skor_maksimal' => 2000,
            'target_score' => 5000,
            'max_score_per_task' => 400,
            'compliance_persen' => '75.0',
            'target_compliance' => '30.0',
            'performance_label' => 'good',
            'kpi_status' => 'tidak_memenuhi',
        ],
    ];

    MonthlyTaskReport::create([
        'report_month' => now()->startOfMonth()->toDateString(),
        'platform' => 'word-match',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 5,
        'payload' => ['month' => now()->format('Y-m'), 'overview' => [], 'teams' => []],
        'source_snapshot' => ['month' => now()->format('Y-m'), 'overall' => [], 'teams' => []],
        'recap_per_user' => $recapData,
        'generated_at' => now(),
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson(route('api.v1.reports.monthly-tasks.recap-per-user', [
        'month' => now()->format('Y-m'),
        'team_id' => $team->id,
    ]));

    $response->assertSuccessful()
        ->assertJsonPath('data.recap_per_user.0.member_key', 'user:1')
        ->assertJsonPath('data.recap_per_user.0.name', 'Budi Santoso')
        ->assertJsonPath('data.recap_per_user.0.performance_label', 'good')
        ->assertJsonPath('data.recap_per_user.0.kpi_status', 'tidak_memenuhi')
        ->assertJsonPath('data.source_task_count', 5);
});

test('member cannot access recap per user api endpoint', function () {
    ensureReportingRoles();

    $user = User::factory()->create();
    $user->assignRole('member');
    $team = createReportingTeam(['name' => 'Restricted Recap Team']);
    createSopDocument($team, $user);

    Sanctum::actingAs($user);

    $this->getJson(route('api.v1.reports.monthly-tasks.recap-per-user', [
        'month' => now()->format('Y-m'),
        'team_id' => $team->id,
    ]))->assertForbidden();
});

test('internal recap per user returns empty data when report not yet generated', function () {
    $admin = User::factory()->create();
    $team = createReportingTeam(['name' => 'No Report Team']);
    createSopDocument($team, $admin);

    config(['app.api_secret_key' => 'test-secret-123']);

    $this->withHeaders(['X-Secret-Key' => 'test-secret-123'])
        ->getJson(route('api.v1.internal.reports.monthly-tasks.recap-per-user', [
            'month' => '2026-05',
            'team_id' => $team->id,
        ]))
        ->assertSuccessful()
        ->assertJsonPath('data.recap_per_user', [])
        ->assertJsonPath('data.source_task_count', 0)
        ->assertJsonPath('data.month', '2026-05');
});

test('recap per user returns 404 when report not yet generated', function () {
    ensureReportingRoles();

    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $team = createReportingTeam(['name' => 'Empty Recap Team']);
    createSopDocument($team, $admin);

    Sanctum::actingAs($admin);

    $this->getJson(route('api.v1.reports.monthly-tasks.recap-per-user', [
        'month' => now()->format('Y-m'),
        'team_id' => $team->id,
    ]))->assertNotFound();
});

test('performance label is calculated from compliance percentage', function () {
    $scoring = new TaskColumnScoringService;

    expect($scoring->determinePerformanceLabel('85.0'))->toBe('excellent');
    expect($scoring->determinePerformanceLabel('70.0'))->toBe('good');
    expect($scoring->determinePerformanceLabel('50.0'))->toBe('watch');
    expect($scoring->determinePerformanceLabel('30.0'))->toBe('critical');
});
