<?php

return [
    'documents' => [
        'max_file_kb' => (int) env('DOCUMENT_UPLOAD_MAX_FILE_KB', 10240),
        'max_attachments' => 5,
        'allowed_mimes' => [
            'pdf',
            'doc',
            'docx',
            'xls',
            'xlsx',
            'png',
            'jpg',
            'jpeg',
            'webp',
        ],
    ],
];
