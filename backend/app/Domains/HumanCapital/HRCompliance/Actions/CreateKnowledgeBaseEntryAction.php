<?php

namespace App\Domains\HumanCapital\HRCompliance\Actions;

use App\Domains\HumanCapital\HRCompliance\Models\KnowledgeBase;
use App\Support\Content\RichTextSanitizer;

class CreateKnowledgeBaseEntryAction
{
    public function __construct(private readonly RichTextSanitizer $richTextSanitizer)
    {
    }

    public function execute(array $data): KnowledgeBase
    {
        $data['content'] = $this->richTextSanitizer->sanitize($data['content']);
        $data['view_count'] = 0;
        $data['helpful_count'] = 0;
        $data['created_by'] = auth()->id();
        $data['is_published'] = $data['is_published'] ?? false;

        return KnowledgeBase::create($data);
    }
}
