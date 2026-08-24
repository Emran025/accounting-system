<?php

namespace App\Support\Content;

use Illuminate\Support\Facades\File;
use HTMLPurifier;
use HTMLPurifier_Config;

class RichTextSanitizer
{
    /**
     * Removes executable markup while preserving the document structure generated
     * by the knowledge-base rich text editor.
     */
    public function sanitize(string $html): string
    {
        $cacheDirectory = storage_path('framework/cache/htmlpurifier');
        File::ensureDirectoryExists($cacheDirectory);

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', $cacheDirectory);
        $config->set('HTML.DefinitionID', 'accore-rich-text');
        $config->set('HTML.DefinitionRev', 1);
        $config->set('HTML.Allowed', implode(',', [
            'a[href|target|rel|title]',
            'b', 'strong', 'i', 'em', 'u', 's', 'del', 'br', 'hr',
            'p[style|align]', 'div[style|align]', 'span[style]', 'mark[style]',
            'h1[style|align]', 'h2[style|align]', 'h3[style|align]',
            'blockquote[style]', 'pre', 'code',
            'ul', 'ol', 'li',
            'table[style|class]', 'thead', 'tbody', 'tr',
            'th[colspan|rowspan|style|align]', 'td[colspan|rowspan|style|align]',
            'img[src|alt|title|width|height|style|class]',
        ]));
        $config->set('CSS.AllowedProperties', [
            'background-color', 'color', 'height', 'max-width', 'text-align', 'width',
        ]);
        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
        ]);
        $config->set('Attr.AllowedFrameTargets', ['_blank']);
        $config->set('HTML.TargetBlank', true);

        if ($definition = $config->maybeGetRawHTMLDefinition()) {
            $definition->addElement('mark', 'Inline', 'Inline', 'Common', ['style' => 'Text']);
        }

        return trim((new HTMLPurifier($config))->purify($html));
    }
}
