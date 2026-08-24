<?php

namespace App\Http\Controllers\Api\V2\Platform\Documentation;

use App\Http\Controllers\Api\V2\Shared\BaseApiController;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Serves the repository documentation tree to the authenticated Accore UI.
 *
 * The controller mirrors the documentation discovery contract used by Qayd:
 * Markdown/MDX resolution, recursive ordered sidebar construction, protected
 * sections, page metadata, and deterministic previous/next navigation.
 */
class DocumentationController extends Controller
{
    use BaseApiController;

    private const PRIVATE_SEGMENTS = ['Plans', 'testing'];
    private const HOME_DOCUMENT = 'DOCUMENTATION_INDEX';

    public function show(?string $path = null): JsonResponse
    {
        $docsPath = base_path('../docs');

        if (!File::isDirectory($docsPath)) {
            return $this->errorResponse('لم يتم العثور على مجلد التوثيق.', 404);
        }

        $requestedPath = $this->normalisePath($path);
        if ($requestedPath === null || $this->isPrivatePath($requestedPath)) {
            return $this->errorResponse('لا تتوفر صفحة التوثيق المطلوبة.', 404);
        }

        [$file, $resolvedPath] = $this->resolveDocument($docsPath, $requestedPath);
        if ($file === null || $resolvedPath === null) {
            return $this->errorResponse('لا تتوفر صفحة التوثيق المطلوبة.', 404);
        }

        $content = File::get($file);
        $sidebar = $this->getSidebar($docsPath);
        $sidebar = $this->ensureHomeLink($sidebar, $docsPath);
        $navigation = $this->buildNavigation($sidebar, $resolvedPath);
        $title = $this->extractTitle($content) ?? $this->formatLabel(basename($file));

        return $this->successResponse([
            'content' => $content,
            'title' => $title,
            'meta_title' => $title . ' | توثيق Accore ERP',
            'meta_description' => $this->extractMetaDescription($content),
            'sidebar' => $sidebar,
            'current_path' => $resolvedPath,
            'navigation' => $navigation,
        ]);
    }

    /** @return array{0: string|null, 1: string|null} */
    private function resolveDocument(string $docsPath, string $path): array
    {
        $base = $docsPath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
        $candidates = [
            $base,
            $base . '.mdx',
            $base . '.md',
            $base . DIRECTORY_SEPARATOR . 'README.md',
            $base . DIRECTORY_SEPARATOR . 'index.md',
            $base . DIRECTORY_SEPARATOR . 'README.mdx',
            $base . DIRECTORY_SEPARATOR . 'index.mdx',
        ];

        foreach ($candidates as $candidate) {
            if (!File::exists($candidate) || File::isDirectory($candidate)) {
                continue;
            }

            return [$candidate, $this->relativeDocumentPath($docsPath, $candidate)];
        }

        if ($path === self::HOME_DOCUMENT) {
            return [null, null];
        }

        return $this->resolveDocument($docsPath, self::HOME_DOCUMENT);
    }

    /** @return array<int, array<string, mixed>> */
    private function getSidebar(string $directory, ?string $baseDirectory = null): array
    {
        $baseDirectory ??= $directory;
        if (!File::isDirectory($directory)) {
            return [];
        }

        $items = [];
        foreach (File::files($directory) as $file) {
            $name = $file->getFilename();
            if (in_array($name, ['_category_.json', 'README.md', 'README.mdx', 'index.md', 'index.mdx'], true)) {
                continue;
            }

            $content = File::get($file->getPathname());
            $relativePath = $this->relativeDocumentPath($baseDirectory, $file->getPathname());
            $items[] = [
                'type' => 'link',
                'label' => $this->extractTitle($content) ?? $this->formatLabel($name),
                'href' => '/docs/' . $relativePath,
                'path' => $relativePath,
                'position' => $this->extractPosition($content, $name),
            ];
        }

        foreach (File::directories($directory) as $childDirectory) {
            $name = basename($childDirectory);
            if ($this->isPrivatePath($this->relativeDirectoryPath($baseDirectory, $childDirectory))) {
                continue;
            }

            $category = $this->readCategory($childDirectory);
            $indexFile = $this->findDirectoryIndex($childDirectory);
            $indexContent = $indexFile ? File::get($indexFile) : '';
            $categoryPath = $indexFile ? $this->relativeDocumentPath($baseDirectory, $indexFile) : null;

            $items[] = [
                'type' => 'category',
                'label' => $category['label'] ?? $this->extractTitle($indexContent) ?? $this->formatLabel($name),
                'href' => $categoryPath ? '/docs/' . $categoryPath : null,
                'path' => $categoryPath,
                'items' => $this->getSidebar($childDirectory, $baseDirectory),
                'position' => $category['position'] ?? $this->extractPosition('', $name),
            ];
        }

        usort($items, static function (array $left, array $right): int {
            $leftPosition = $left['position'] ?? 999;
            $rightPosition = $right['position'] ?? 999;
            return $leftPosition !== $rightPosition
                ? $leftPosition <=> $rightPosition
                : strnatcasecmp((string) ($left['label'] ?? ''), (string) ($right['label'] ?? ''));
        });

        return $items;
    }

    /** @param array<int, array<string, mixed>> $sidebar */
    private function ensureHomeLink(array $sidebar, string $docsPath): array
    {
        foreach ($sidebar as $item) {
            if (($item['path'] ?? null) === self::HOME_DOCUMENT) {
                return $sidebar;
            }
        }

        $homeFile = $docsPath . DIRECTORY_SEPARATOR . self::HOME_DOCUMENT . '.md';
        if (!File::exists($homeFile)) {
            return $sidebar;
        }

        array_unshift($sidebar, [
            'type' => 'link',
            'label' => $this->extractTitle(File::get($homeFile)) ?? 'مدخل التوثيق',
            'href' => '/docs/' . self::HOME_DOCUMENT,
            'path' => self::HOME_DOCUMENT,
            'position' => -1,
        ]);

        return $sidebar;
    }

    /** @param array<int, array<string, mixed>> $sidebar */
    private function buildNavigation(array $sidebar, string $currentPath): array
    {
        $flatSidebar = $this->flattenSidebar($sidebar);
        $currentIndex = array_search($currentPath, array_column($flatSidebar, 'path'), true);

        return [
            'prev' => $currentIndex !== false && $currentIndex > 0 ? $flatSidebar[$currentIndex - 1] : null,
            'next' => $currentIndex !== false && $currentIndex < count($flatSidebar) - 1 ? $flatSidebar[$currentIndex + 1] : null,
        ];
    }

    /** @param array<int, array<string, mixed>> $items
     *  @return array<int, array<string, mixed>>
     */
    private function flattenSidebar(array $items): array
    {
        $flat = [];
        foreach ($items as $item) {
            if (($item['type'] ?? null) === 'link') {
                $flat[] = $item;
                continue;
            }

            if (!empty($item['href'])) {
                $flat[] = $item;
            }
            $flat = [...$flat, ...$this->flattenSidebar($item['items'] ?? [])];
        }

        return $flat;
    }

    /** @return array<string, mixed> */
    private function readCategory(string $directory): array
    {
        $categoryFile = $directory . DIRECTORY_SEPARATOR . '_category_.json';
        if (!File::exists($categoryFile)) {
            return [];
        }

        return json_decode(File::get($categoryFile), true) ?: [];
    }

    private function findDirectoryIndex(string $directory): ?string
    {
        foreach (['README.md', 'index.md', 'README.mdx', 'index.mdx'] as $name) {
            $candidate = $directory . DIRECTORY_SEPARATOR . $name;
            if (File::exists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function normalisePath(?string $path): ?string
    {
        $path = trim((string) $path, " /\\\t\n\r\0\x0B");
        $path = preg_replace('/\.mdx?$/i', '', $path) ?? '';
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#/+#', '/', $path) ?? '';

        if ($path === '' || $path === 'index') {
            return self::HOME_DOCUMENT;
        }

        if (Str::contains($path, ['..', "\0"]) || Str::startsWith($path, '.')) {
            return null;
        }

        return $path;
    }

    private function isPrivatePath(string $path): bool
    {
        $segments = explode('/', str_replace('\\', '/', $path));
        return count(array_intersect($segments, self::PRIVATE_SEGMENTS)) > 0;
    }

    private function relativeDocumentPath(string $baseDirectory, string $path): string
    {
        $relative = Str::after($path, rtrim($baseDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
        $relative = preg_replace('/\.mdx?$/i', '', $relative) ?? $relative;
        return str_replace(DIRECTORY_SEPARATOR, '/', $relative);
    }

    private function relativeDirectoryPath(string $baseDirectory, string $directory): string
    {
        return str_replace(DIRECTORY_SEPARATOR, '/', Str::after($directory, rtrim($baseDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR));
    }

    private function extractTitle(string $content): ?string
    {
        if (preg_match('/^title:\s*(.+)$/mi', $content, $matches)) {
            return trim($matches[1], "\"' ");
        }
        if (preg_match('/^#\s+(.+)$/m', $content, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    private function extractPosition(string $content, string $filename): int
    {
        if (preg_match('/^(\d+)_/', $filename, $matches)) {
            return (int) $matches[1];
        }
        if (preg_match('/^sidebar_position:\s*(-?\d+)$/mi', $content, $matches)) {
            return (int) $matches[1];
        }

        return 999;
    }

    private function formatLabel(string $name): string
    {
        $name = preg_replace('/\.mdx?$/i', '', $name) ?? $name;
        $name = preg_replace('/^\d+_/', '', $name) ?? $name;
        return Str::title(str_replace(['_', '-'], ' ', $name));
    }

    private function extractMetaDescription(string $content): string
    {
        $inCode = false;
        $inFrontmatter = false;

        foreach (explode("\n", $content) as $index => $line) {
            $trimmed = trim($line);
            if ($index === 0 && $trimmed === '---') {
                $inFrontmatter = true;
                continue;
            }
            if ($inFrontmatter) {
                if ($trimmed === '---') {
                    $inFrontmatter = false;
                }
                continue;
            }
            if (Str::startsWith($trimmed, ['```', '~~~'])) {
                $inCode = !$inCode;
                continue;
            }
            if ($inCode || $trimmed === '' || Str::startsWith($trimmed, ['#', '|', '<', '- ', '* ']) || preg_match('/^\d+\.\s/', $trimmed)) {
                continue;
            }

            $plain = trim((string) preg_replace('/\s+/', ' ', preg_replace('/[*_`\[\]()#>]/', '', $trimmed)));
            if (mb_strlen($plain) > 30) {
                return Str::limit($plain, 155, '');
            }
        }

        return 'توثيق Accore ERP وإرشادات تشغيل النظام ووحداته.';
    }
}
