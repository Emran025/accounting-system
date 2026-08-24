<?php

namespace App\Domains\HumanCapital\HRCompliance\Actions;

use App\Domains\HumanCapital\HRCompliance\Models\KnowledgeBase;
use App\Support\Content\RichTextSanitizer;

class UpdateKnowledgeBaseEntryAction
{
    public function __construct(private readonly RichTextSanitizer $richTextSanitizer)
    {
    }

    public function execute(int $id, array $data): KnowledgeBase
    {
        if (array_key_exists('content', $data)) {
            $data['content'] = $this->richTextSanitizer->sanitize($data['content']);
        }
        $kb = KnowledgeBase::findOrFail($id);

        $kb->update($data);

        return $kb;
    }
}
