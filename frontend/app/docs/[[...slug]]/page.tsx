import fs from "node:fs";
import path from "node:path";
import DocumentationViewer from "@/components/documentation/DocumentationViewer";

const documentationRoot = path.resolve(process.cwd(), "..", "docs");
const privateSegments = new Set(["Plans", "testing"]);

function collectDocumentationPaths(directory: string, relative = ""): string[][] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || privateSegments.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;

    if (entry.isDirectory()) return collectDocumentationPaths(fullPath, nextRelative);
    if (!entry.isFile() || !/\.mdx?$/i.test(entry.name)) return [];

    const withoutExtension = nextRelative.replace(/\.mdx?$/i, "");
    return [withoutExtension.split(path.sep)];
  });
}

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug?: string[] }> {
  return [{ slug: [] }, ...collectDocumentationPaths(documentationRoot).map((slug) => ({ slug }))];
}

export default async function DocumentationPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <DocumentationViewer initialPath={slug.join("/")} />;
}
