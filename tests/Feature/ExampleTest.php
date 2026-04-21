<?php

test('returns a successful response', function () {
    config()->set('session.driver', 'array');
    config()->set('app.name', 'OCB KPI Management');

    $response = $this->get(route('home'));

    expect(config('app.name'))->toBe('OCB KPI Management');

    $response->assertOk();
});
