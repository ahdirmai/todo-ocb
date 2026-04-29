<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sop_steps', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')->constrained('documents')->cascadeOnDelete();

            $table->unsignedSmallInteger('sequence_order');
            $table->string('name');                         // nama jalur (label tampilan)
            $table->string('action')->nullable();           // deskripsi singkat tindakan
            $table->json('keywords');                       // kata kunci untuk matching komentar
            $table->string('required_evidence')->default('comment'); // 'comment'|'media'|'both'
            $table->string('priority')->default('medium'); // 'high'|'medium'|'low'
            $table->unsignedTinyInteger('weight')->default(3);
            $table->unsignedTinyInteger('min_comment')->default(1);
            $table->unsignedTinyInteger('min_media')->default(0);
            $table->string('expected_column')->nullable();  // kanban column yang diharapkan
            $table->boolean('is_mandatory')->default(true);

            // Metadata parsing
            $table->string('parsed_by')->default('ai');    // 'ai' | 'regex'
            $table->string('parsed_from')->nullable();     // 'text'|'pdf'

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sop_steps');
    }
};
