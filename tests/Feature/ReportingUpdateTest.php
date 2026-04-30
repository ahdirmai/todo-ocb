<?php

use App\Enums\GroupingType;
use App\Models\MonthlyTaskReport;
use App\Models\Team;
use App\Models\User;
use App\Services\TaskColumnScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::findOrCreate('member', 'web');
    Role::findOrCreate('admin', 'web');
    Role::findOrCreate('superadmin', 'web');
});

function makeTestTask(array $overrides = []): array
{
    return array_merge([
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
    ], $overrides);
}

function makeTestSopSteps(): array
{
    return [
        [
            'name' => 'Cek Absen Kehadiran Shift Pagi',
            'expected_column' => 'Cek Absen Kehadiran Shift Pagi',
            'score_kurang' => 2,
            'score_cukup' => 4,
            'score_sangat_baik' => 5,
            'min_comment' => 1,
            'min_media' => 1,
            'is_mandatory' => true,
        ],
        [
            'name' => 'Audit Aset Jual',
            'expected_column' => 'Audit Aset Jual',
            'score_kurang' => 2,
            'score_cukup' => 4,
            'score_sangat_baik' => 5,
            'min_comment' => 0,
            'min_media' => 1,
            'is_mandatory' => true,
        ],
    ];
}

function makeTestColumns(): array
{
    return [
        ['id' => 'col-1', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 1, 'is_done' => false],
        ['id' => 'col-2', 'title' => 'Audit Aset Jual', 'order' => 2, 'is_done' => false],
    ];
}

test('sop step scoring gives sangat_baik when all requirements met', function () {
    $scoring = new TaskColumnScoringService;
    $task = makeTestTask();
    $result = $scoring->scoreTask($task, makeTestColumns(), makeTestSopSteps());

    expect($result['breakdown_jalur'][0]['skor'])->toBe(5);
    expect($result['breakdown_jalur'][0]['level'])->toBe('sangat_baik');
    expect($result['breakdown_jalur'][0]['skor_maksimal'])->toBe(5);
});

test('sop step scoring gives cukup when min_media not met', function () {
    $scoring = new TaskColumnScoringService;
    $task = makeTestTask([
        'comments' => [
            ['author' => 'User', 'content' => 'Sudah cek absen kehadiran shift pagi', 'attachments_count' => 0],
        ],
    ]);
    $result = $scoring->scoreTask($task, makeTestColumns(), makeTestSopSteps());

    expect($result['breakdown_jalur'][0]['skor'])->toBe(4);
    expect($result['breakdown_jalur'][0]['level'])->toBe('cukup');
});

test('sop step scoring gives kurang when step passed without evidence', function () {
    $scoring = new TaskColumnScoringService;
    $task = makeTestTask([
        'status' => 'Audit Aset Jual',
        'comments' => [],
        'comments_count' => 0,
    ]);
    $result = $scoring->scoreTask($task, makeTestColumns(), makeTestSopSteps());

    expect($result['breakdown_jalur'][0]['skor'])->toBe(2);
    expect($result['breakdown_jalur'][0]['level'])->toBe('kurang');
});

test('sop step scoring gives 0 when no evidence and step not passed', function () {
    $scoring = new TaskColumnScoringService;
    $task = makeTestTask([
        'status' => 'Cek Absen Kehadiran Shift Pagi',
        'comments' => [],
        'comments_count' => 0,
    ]);
    $result = $scoring->scoreTask($task, makeTestColumns(), makeTestSopSteps());

    expect($result['breakdown_jalur'][1]['skor'])->toBe(0);
    expect($result['breakdown_jalur'][1]['level'])->toBe('none');
});

test('max score is sum of all steps score_sangat_baik', function () {
    $scoring = new TaskColumnScoringService;
    $task = makeTestTask();
    $result = $scoring->scoreTask($task, makeTestColumns(), makeTestSopSteps());

    expect($result['skor_maksimal_task'])->toBe(10);
});

test('admin can update report scores', function () {
    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('admin');

    $team = Team::create([
        'name' => 'Test Team',
        'slug' => 'test-team',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $report = MonthlyTaskReport::create([
        'report_month' => '2026-04-01',
        'platform' => 'sop-step-scoring',
        'team_id' => $team->id,
        'generated_by' => $admin->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 1,
        'payload' => [
            'teams' => [
                [
                    'team_id' => $team->id,
                    'members' => [
                        [
                            'member_key' => 'user:1',
                            'breakdown_task' => [
                                [
                                    'task_id' => 'task-1',
                                    'skor_total_task' => 5,
                                    'skor_maksimal_task' => 10,
                                    'compliance_persen' => '50.0',
                                    'quality' => 'Cukup',
                                    'breakdown_jalur' => [
                                        [
                                            'nama_jalur' => 'Step 1',
                                            'skor' => 3,
                                            'skor_maksimal' => 5,
                                            'score_kurang' => 2,
                                            'score_cukup' => 4,
                                            'score_sangat_baik' => 5,
                                            'level' => 'cukup',
                                            'penjelasan' => 'Test',
                                        ],
                                        [
                                            'nama_jalur' => 'Step 2',
                                            'skor' => 2,
                                            'skor_maksimal' => 5,
                                            'score_kurang' => 2,
                                            'score_cukup' => 4,
                                            'score_sangat_baik' => 5,
                                            'level' => 'kurang',
                                            'penjelasan' => 'Test',
                                        ],
                                    ],
                                ],
                            ],
                            'total_score' => 5,
                            'skor_maksimal' => 10,
                            'compliance_persen' => '50.0',
                            'performance_label' => 'watch',
                        ],
                    ],
                ],
            ],
        ],
        'source_snapshot' => [],
        'generated_at' => now(),
    ]);

    $response = $this->actingAs($admin)->put(route('reporting.update', $report), [
        'teams' => [
            [
                'members' => [
                    [
                        'breakdown_task' => [
                            [
                                'breakdown_jalur' => [
                                    ['skor' => 5],
                                    ['skor' => 4],
                                ],
                                'admin_note' => 'Good improvement',
                                'quality' => 'Baik — mayoritas step terdokumentasi',
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $response->assertRedirect();

    $report->refresh();
    $payload = $report->payload;

    expect(data_get($payload, 'teams.0.members.0.breakdown_task.0.breakdown_jalur.0.skor'))->toBe(5);
    expect(data_get($payload, 'teams.0.members.0.breakdown_task.0.breakdown_jalur.1.skor'))->toBe(4);
    expect(data_get($payload, 'teams.0.members.0.breakdown_task.0.skor_total_task'))->toBe(9);
    expect(data_get($payload, 'teams.0.members.0.breakdown_task.0.admin_note'))->toBe('Good improvement');
    expect(data_get($payload, 'teams.0.members.0.total_score'))->toBe(9);
    expect(data_get($payload, 'teams.0.members.0.compliance_persen'))->toBe('90.0');
    expect(data_get($payload, 'teams.0.members.0.performance_label'))->toBe('excellent');
});

test('non-admin cannot update report', function () {
    $member = User::factory()->create(['email_verified_at' => now()]);
    $member->assignRole('member');

    $team = Team::create([
        'name' => 'Test Team',
        'slug' => 'test-team-2',
        'grouping' => GroupingType::TEAM,
        'is_active' => true,
    ]);

    $report = MonthlyTaskReport::create([
        'report_month' => '2026-04-01',
        'platform' => 'sop-step-scoring',
        'team_id' => $team->id,
        'generated_by' => $member->id,
        'model' => 'word-match-v1',
        'prompt_version' => 'v1',
        'source_task_count' => 0,
        'payload' => ['teams' => []],
        'source_snapshot' => [],
        'generated_at' => now(),
    ]);

    $response = $this->actingAs($member)->put(route('reporting.update', $report), [
        'teams' => [],
    ]);

    $response->assertForbidden();
});
