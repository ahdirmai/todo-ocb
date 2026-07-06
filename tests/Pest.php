<?php

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
 // ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| CSRF middleware disabled for Feature tests
|--------------------------------------------------------------------------
|
| Pest's `actingAs()->post(...)` flow does not always propagate the
| request-time CSRF token (session/storage driver mismatch can drop the
| token between auth and request phases), causing HTTP 419 (CSRF
| mismatch) on POST/PUT/DELETE in tests. Disable CSRF exclusively for
| Feature tests via Pest's `withoutMiddleware` — production CSRF in
| `bootstrap/app.php` is unaffected, these requests only fire inside
| Pest's test execution. Other middleware (auth, role, position,
| verified, throttling) stays active to keep authorization/validation
| tests faithful.
*/

beforeEach(function (): void {
    $this->withoutMiddleware([
        PreventRequestForgery::class,
        ValidateCsrfToken::class,
    ]);
})->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}
