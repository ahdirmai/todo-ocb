<?php

use App\Http\Middleware\CheckPositionAccess;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ValidateKpiArea;
use App\Http\Middleware\ValidateSecretKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Drop CSRF middleware when running tests, AND mark all routes as
        // CSRF-exempt as a defensive belt-and-braces fallback at the
        // PreventRequestForgery layer (`inExceptArray(['*'])`).
        //
        // Two detection paths because `PHPUNIT_COMPOSER_INSTALL` (Composer-
        // prepended when PHPUnit runs via Composer's script layer) is NOT
        // reliably set when Pest is invoked via `php artisan test` — the
        // run path bypasses Composer's auto-prepend. APP_ENV=testing is
        // forced by `phpunit.xml`, so it consistently catches Pest runs.
        //
        // Production CSRF protection is unaffected: BOTH conditions must
        // be false in prod (APP_ENV=production|local + PHPUnit constant
        // undefined).
        if (defined('PHPUNIT_COMPOSER_INSTALL') || env('APP_ENV') === 'testing') {
            $middleware->web(remove: [
                PreventRequestForgery::class,
                ValidateCsrfToken::class,
            ]);
            PreventRequestForgery::except(['*']);
        }

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'secret' => ValidateSecretKey::class,
            'position' => CheckPositionAccess::class,
            'kpi.area' => ValidateKpiArea::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function ($response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if ($request->expectsJson() || ! in_array($status, [403, 404, 500, 503], true)) {
                return $response;
            }

            return Inertia::render('errors/status', [
                'status' => $status,
            ])->toResponse($request)->setStatusCode($status);
        });
    })->create();
