<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    /**
     * Display all activity logs — accessible by superadmin & admin only.
     */
    public function index(Request $request)
    {
        $logName = $request->query('log_name');
        $search = $request->query('search');

        $query = ActivityLog::with('causer', 'subject')
            ->latest();

        if ($logName) {
            $query->byLogName($logName);
        }

        if ($search) {
            $query->where('description', 'like', "%{$search}%");
        }

        return Inertia::render('activity/index', [
            'activityLogs' => $query->paginate(50)->withQueryString(),
            'filters' => [
                'log_name' => $logName,
                'search' => $search,
            ],
        ]);
    }
}
