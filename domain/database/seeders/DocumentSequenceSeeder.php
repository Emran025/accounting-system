<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DocumentSequence;

class DocumentSequenceSeeder extends Seeder
{
    public function run(): void
    {
        $sequences = [
            ['document_type' => 'INV', 'prefix' => 'INV', 'current_number' => 0, 'format' => '{PREFIX}-{NUMBER}'],
            ['document_type' => 'PUR', 'prefix' => 'PUR', 'current_number' => 0, 'format' => '{PREFIX}-{NUMBER}'],
            ['document_type' => 'EXP', 'prefix' => 'EXP', 'current_number' => 0, 'format' => '{PREFIX}-{NUMBER}'],
            ['document_type' => 'REV', 'prefix' => 'REV', 'current_number' => 0, 'format' => '{PREFIX}-{NUMBER}'],
            ['document_type' => 'VOU', 'prefix' => 'VOU', 'current_number' => 0, 'format' => '{PREFIX}-{NUMBER}'],
        ];

        foreach ($sequences as $sequence) {
            DocumentSequence::updateOrCreate(
                ['document_type' => $sequence['document_type']],
                $sequence
            );
        }
    }
}
