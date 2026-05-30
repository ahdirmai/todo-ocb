<?php

namespace App\Http\Controllers;

use App\Models\KpiDailyReport;
use App\Models\KpiDailyScore;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class KpiCeoController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();

        $allScores = KpiDailyScore::with('user.jobPosition')
            ->where('score_date', $today)
            ->orderBy('total_score', 'desc')
            ->get();

        $gradeDistribution = KpiDailyScore::where('score_date', $today)
            ->select('grade', DB::raw('count(*) as count'))
            ->groupBy('grade')
            ->get()
            ->pluck('count', 'grade');

        $criticalAlerts = KpiDailyScore::where('grade', 'D')
            ->where('score_date', $today)
            ->with('user')
            ->get();

        $lateReports = KpiDailyReport::where('is_late', true)
            ->where('report_date', $today)
            ->with('user')
            ->get();

        $spvTeamUserIds = DB::table('team_user')
            ->join('teams', 'teams.id', '=', 'team_user.team_id')
            ->where('teams.is_spv_team', true)
            ->pluck('team_user.user_id');

        $pendingReports = User::whereIn('id', $spvTeamUserIds)
            ->whereDoesntHave('kpiReports', fn ($q) => $q->where('report_date', $today))
            ->get(['id', 'name', 'email']);

        return Inertia::render('kpi/ceo-dashboard', [
            'allScores' => $allScores,
            'gradeDistribution' => $gradeDistribution,
            'criticalAlerts' => $criticalAlerts,
            'lateReports' => $lateReports,
            'pendingReports' => $pendingReports,
            'date' => $today,
        ]);
    }

    public function dailyReports(): Response
    {
        $today = now()->toDateString();

        $reports = KpiDailyReport::with('user')
            ->where('report_date', $today)
            ->latest('submitted_at')
            ->get();

        return Inertia::render('kpi/ceo-reports', [
            'reports' => $reports,
            'date' => $today,
        ]);
    }

    public function alerts(): Response
    {
        $today = now()->toDateString();

        $gradeDAlerts = KpiDailyScore::where('grade', 'D')
            ->where('score_date', $today)
            ->with('user.jobPosition')
            ->get();

        $lateReports = KpiDailyReport::where('is_late', true)
            ->where('report_date', $today)
            ->with('user')
            ->get();

        $spvTeamUserIds = DB::table('team_user')
            ->join('teams', 'teams.id', '=', 'team_user.team_id')
            ->where('teams.is_spv_team', true)
            ->pluck('team_user.user_id');

        $missingReports = User::whereIn('id', $spvTeamUserIds)
            ->whereDoesntHave('kpiReports', fn ($q) => $q->where('report_date', $today))
            ->get(['id', 'name', 'email']);

        return Inertia::render('kpi/ceo-alerts', [
            'gradeDAlerts' => $gradeDAlerts,
            'lateReports' => $lateReports,
            'missingReports' => $missingReports,
            'date' => $today,
        ]);
    }
}
