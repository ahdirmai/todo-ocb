<?php

namespace App\Exports;

use App\Models\Feedback;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\Xlsx\Writer;

class FeedbackExport
{
    public function download(string $path): void
    {
        $writer = new Writer;
        $writer->openToFile($path);

        $headers = [
            'ID', 'Tipe', 'Siklus', 'User', 'Email', 'Posisi',
            'Kategori', 'Subjek', 'Pesan',
            'Rating', 'Lama Pakai', 'Fitur Digunakan', 'Fitur Terbantu',
            'Kendala', 'Kendala Lain', 'Kehilangan Data',
            'Fitur Diinginkan', 'Request Fitur',
            'Saran', 'Dibuat',
        ];
        $writer->addRow(Row::fromValues($headers));

        Feedback::with('user.jobPosition', 'cycle')
            ->latest()
            ->chunk(100, function ($feedback) use ($writer): void {
                foreach ($feedback as $f) {
                    $sd = $f->survey_data;

                    $writer->addRow(Row::fromValues([
                        $f->id,
                        $f->category === 'survey' ? 'Survey' : 'Quick Feedback',
                        $f->cycle?->title ?? '-',
                        $f->user?->name ?? '-',
                        $f->user?->email ?? '-',
                        $f->user?->jobPosition?->name ?? '-',
                        $f->category,
                        $f->subject,
                        $f->message,
                        $f->rating ?? '-',
                        $sd ? $this->usageLabel($sd['usage_duration'] ?? null) : '-',
                        $sd ? $this->featureLabels(($sd['most_used_features'] ?? []), 'Fitur') : '-',
                        $sd['most_helpful_feature'] ?? '-',
                        $sd ? $this->featureLabels(($sd['technical_issues'] ?? []), 'Issue') : '-',
                        $sd['other_issue'] ?? '-',
                        $sd ? ($this->dataLossLabel($sd['data_loss'] ?? null)) : '-',
                        $sd ? $this->featureLabels(($sd['desired_features'] ?? []), 'Fitur') : '-',
                        $sd['custom_feature_request'] ?? '-',
                        $sd['suggestions'] ?? '-',
                        $f->created_at->toDateTimeString(),
                    ]));
                }
            });

        $writer->close();
    }

    private function usageLabel(?string $val): string
    {
        return match ($val) {
            '<1' => '< 1 bulan',
            '1-3' => '1-3 bulan',
            '>3' => '> 3 bulan',
            default => '-',
        };
    }

    private function dataLossLabel(?string $val): string
    {
        return match ($val) {
            'tidak' => 'Tidak pernah',
            '1-2' => 'Pernah 1-2 kali',
            'sering' => 'Sering',
            default => '-',
        };
    }

    private function featureLabels(array $values, string $type): string
    {
        if (empty($values)) {
            return '-';
        }

        $labels = match ($type) {
            'Fitur' => [
                'dashboard' => 'Dashboard / tugas harian',
                'upload' => 'Upload bukti tugas',
                'report' => 'Laporan harian',
                'monitoring' => 'Monitoring SPV',
                'store' => 'Kunjungan toko',
            ],
            'Issue' => [
                'none' => 'Tidak ada',
                'slow' => 'Aplikasi lambat',
                'error' => 'Sering error',
                'mobile' => 'Sulit di HP',
                'upload' => 'Sulit upload',
            ],
            default => [],
        };

        $mapped = array_map(fn ($v) => $labels[$v] ?? $v, $values);

        return implode(', ', $mapped);
    }
}
