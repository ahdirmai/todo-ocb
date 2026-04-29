<?php

use App\Services\SopAuditStepParser;

test('it parses sop content into ordered audit steps with evidence requirements', function () {
    $steps = app(SopAuditStepParser::class)->parse(<<<'SOP'
1. PIC, tujuan, dan tgl kunjungan wajib dicatat di awal kunjungan.
2. Cek absen kehadiran shift pagi lalu tulis hasil pengecekan di komentar.
3. Audit aset jual dan lampirkan foto rak utama sebagai bukti.
4. In-store training opsional bila ada anggota baru.
SOP, [
        ['id' => 'col-1', 'title' => 'PIC, TUJUAN, DAN TGL KUNJUNGAN', 'order' => 1],
        ['id' => 'col-2', 'title' => 'Cek Absen Kehadiran Shift Pagi', 'order' => 2],
        ['id' => 'col-3', 'title' => 'Audit Aset Jual', 'order' => 3],
        ['id' => 'col-4', 'title' => 'In-Store Training', 'order' => 4],
    ]);

    expect($steps)->toHaveCount(4)
        ->and($steps[0])->toMatchArray([
            'id' => 'S1',
            'required_evidence' => 'comment',
            'priority' => 'high',
            'expected_column' => 'PIC, TUJUAN, DAN TGL KUNJUNGAN',
            'is_mandatory' => true,
        ])
        ->and($steps[1])->toMatchArray([
            'id' => 'S2',
            'required_evidence' => 'comment',
            'expected_column' => 'Cek Absen Kehadiran Shift Pagi',
            'min_comment' => 1,
        ])
        ->and($steps[2])->toMatchArray([
            'id' => 'S3',
            'required_evidence' => 'both',
            'expected_column' => 'Audit Aset Jual',
            'min_media' => 1,
        ])
        ->and($steps[3])->toMatchArray([
            'id' => 'S4',
            'priority' => 'low',
            'expected_column' => 'In-Store Training',
            'is_mandatory' => false,
            'min_comment' => 0,
        ])
        ->and($steps[2]['keywords'])->toContain('audit', 'aset', 'jual');
});

test('it can parse html sop content into audit steps', function () {
    $steps = app(SopAuditStepParser::class)->parse('<ol><li>Cek laporan saldo dan setoran shift pagi.</li><li>Unggah screenshot sales report retail.</li></ol>', [
        ['id' => 'col-1', 'title' => 'Cek Laporan Saldo & Setoran Shift Pagi', 'order' => 1],
        ['id' => 'col-2', 'title' => 'Cek Sales Report - Retail Shift Pagi', 'order' => 2],
    ]);

    expect($steps)->toHaveCount(2)
        ->and($steps[0]['expected_column'])->toBe('Cek Laporan Saldo & Setoran Shift Pagi')
        ->and($steps[1]['required_evidence'])->toBe('media');
});
