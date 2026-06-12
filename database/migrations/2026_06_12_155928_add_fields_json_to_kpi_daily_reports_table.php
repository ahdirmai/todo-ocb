<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            $table->json('fields')->nullable()->after('report_data');
        });

        // Migrate existing data into `fields` JSON
        $reports = DB::table('kpi_daily_reports')
            ->join('users', 'users.id', '=', 'kpi_daily_reports.user_id')
            ->leftJoin('positions', 'positions.id', '=', 'users.position_id')
            ->select('kpi_daily_reports.id', 'positions.name as position_name', 'kpi_daily_reports.status_34_tasks', 'kpi_daily_reports.spv_status', 'kpi_daily_reports.issues_today', 'kpi_daily_reports.follow_up', 'kpi_daily_reports.action_plan', 'kpi_daily_reports.report_data')
            ->get();

        foreach ($reports as $report) {
            $fields = [];

            if ($report->position_name === 'Manager Operasional') {
                $fields = [
                    'status_34_tasks' => $report->status_34_tasks ?? '',
                    'spv_status' => $report->spv_status ?? '',
                    'issues_today' => $report->issues_today ?? '',
                    'follow_up' => $report->follow_up ?? '',
                    'action_plan' => $report->action_plan ?? '',
                ];
            } elseif ($report->position_name === 'Manager HR') {
                $reportData = json_decode($report->report_data, true) ?? [];
                $fields = array_merge($reportData, [
                    'action_plan' => $report->action_plan ?? '',
                ]);
            } elseif ($report->position_name === 'Manager Gudang') {
                $reportData = json_decode($report->report_data, true) ?? [];
                $fields = [
                    'recap' => $reportData['recap'] ?? '',
                    'action_plan' => $report->action_plan ?? '',
                ];
            } else {
                // Unknown position — preserve all non-null columns
                $fields = array_filter([
                    'status_34_tasks' => $report->status_34_tasks,
                    'spv_status' => $report->spv_status,
                    'issues_today' => $report->issues_today,
                    'follow_up' => $report->follow_up,
                    'action_plan' => $report->action_plan,
                ], fn ($v) => $v !== null);
            }

            DB::table('kpi_daily_reports')
                ->where('id', $report->id)
                ->update(['fields' => json_encode($fields)]);
        }

        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            $table->dropColumn([
                'status_34_tasks',
                'spv_status',
                'issues_today',
                'follow_up',
                'action_plan',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            $table->text('status_34_tasks')->nullable();
            $table->text('spv_status')->nullable();
            $table->text('issues_today')->nullable();
            $table->text('follow_up')->nullable();
            $table->text('action_plan')->nullable();
        });

        // Restore data from fields JSON
        $reports = DB::table('kpi_daily_reports')
            ->whereNotNull('fields')
            ->select('id', 'fields')
            ->get();

        foreach ($reports as $report) {
            $fields = json_decode($report->fields, true) ?? [];
            DB::table('kpi_daily_reports')
                ->where('id', $report->id)
                ->update([
                    'status_34_tasks' => $fields['status_34_tasks'] ?? null,
                    'spv_status' => $fields['spv_status'] ?? null,
                    'issues_today' => $fields['issues_today'] ?? null,
                    'follow_up' => $fields['follow_up'] ?? null,
                    'action_plan' => $fields['action_plan'] ?? null,
                ]);
        }

        Schema::table('kpi_daily_reports', function (Blueprint $table) {
            $table->dropColumn('fields');
        });
    }
};
