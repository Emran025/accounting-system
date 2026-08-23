import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("shared content-aware input direction", () => {
  it("uses the first strong Unicode letter while preserving an explicit technical direction", () => {
    const utility = source("lib/utils.ts");
    const input = source("components/ui/Input.tsx");
    const textarea = source("components/ui/Textarea.tsx");

    expect(utility).toContain("first strong Unicode letter");
    expect(input).toContain("const explicitDirection");
    expect(input).toContain("const textDirection = explicitDirection ?? getTextDirection(textValue)");
    expect(input).toContain("dir={textDirection}");
    expect(textarea).toContain("const explicitDirection");
    expect(textarea).toContain("const textDirection = explicitDirection ?? getTextDirection(textValue)");
    expect(textarea).toContain("dir={textDirection}");
  });

  it("applies direction to the control wrapper so decorations move with the typed language", () => {
    const input = source("components/ui/Input.tsx");
    const textarea = source("components/ui/Textarea.tsx");
    const select = source("components/ui/SearchableSelect.tsx");
    const styles = source("app/globals.css");

    expect(input).toContain('className={`input-wrapper ${containerClassName}`.trim()} dir={textDirection}');
    expect(textarea).toContain('className="input-wrapper" dir={textDirection}');
    expect(select).toContain('className={`searchable-select ${className}`} ref={containerRef} dir={textDirection}');
    expect(styles).toContain(".input-direction-aware");
    expect(styles).toContain("inset-inline-start");
    expect(styles).toContain("inset-inline-end");
  });
});
