<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

return new class extends Migration
{
    /**
     * Seed initial tax authorities (ZATCA) so Tax Engine can work.
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        Artisan::call('db:seed', ['--class' => \Database\Seeders\TaxSeeder::class, '--force' => true]);
    }

    public function down(): void
    {
        // No-op: seeder data is non-destructive; tables dropped by earlier migrations
    }
};
