<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');

        $query = Store::query()->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('branch_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        return Inertia::render('stores/index', [
            'stores' => $query->paginate(20)->withQueryString(),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('stores/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_code' => 'required|string|max:255|unique:stores,branch_code',
            'name' => 'required|string|max:255',
            'address' => 'required|string',
        ]);

        try {
            $store = DB::transaction(function () use ($validated): Store {
                $store = Store::create($validated);

                ActivityLogger::log(
                    event: 'created',
                    logName: 'store',
                    description: 'Membuat toko baru',
                    subject: $store,
                    teamId: null,
                    properties: ['branch_code' => $store->branch_code, 'name' => $store->name]
                );

                return $store;
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal membuat toko, silakan coba lagi.']);
        }

        return redirect()->route('stores.index')->with('success', 'Toko berhasil dibuat.');
    }

    public function edit(Store $store): Response
    {
        return Inertia::render('stores/edit', [
            'store' => $store,
        ]);
    }

    public function update(Request $request, Store $store): RedirectResponse
    {
        $validated = $request->validate([
            'branch_code' => 'required|string|max:255|unique:stores,branch_code,'.$store->id,
            'name' => 'required|string|max:255',
            'address' => 'required|string',
        ]);

        try {
            DB::transaction(function () use ($store, $validated): void {
                $store->update($validated);

                ActivityLogger::log(
                    event: 'updated',
                    logName: 'store',
                    description: 'Memperbarui toko',
                    subject: $store,
                    teamId: null,
                    properties: ['branch_code' => $store->branch_code, 'name' => $store->name]
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal memperbarui toko, silakan coba lagi.']);
        }

        return redirect()->route('stores.index')->with('success', 'Toko berhasil diperbarui.');
    }

    public function destroy(Store $store): RedirectResponse
    {
        $branchCode = $store->branch_code;
        $name = $store->name;

        try {
            DB::transaction(function () use ($store, $branchCode, $name): void {
                $store->delete();

                ActivityLogger::log(
                    event: 'deleted',
                    logName: 'store',
                    description: 'Menghapus toko',
                    subject: null,
                    teamId: null,
                    properties: ['branch_code' => $branchCode, 'name' => $name]
                );
            });
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors(['error' => 'Gagal menghapus toko, silakan coba lagi.']);
        }

        return redirect()->route('stores.index')->with('success', 'Toko berhasil dihapus.');
    }
}
