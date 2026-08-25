import { describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/api");

vi.mock("@/lib/i18n", () => ({
    catalogMessage: (key: string, values?: Record<string, unknown>) => values ? `${key}:${Object.values(values).join(":")}` : key,
    getActiveLocale: () => "en-US",
}));

import { createApiRequestHeaders } from "@/lib/api";

describe("API locale propagation", () => {
    it("sends the selected application locale through standard and explicit request headers", () => {
        expect(createApiRequestHeaders()).toMatchObject({
            "Accept-Language": "en-US",
            "X-Accore-Locale": "en-US",
        });
    });

    it("lets the browser supply a multipart boundary for media uploads", () => {
        const headers = createApiRequestHeaders({ body: new FormData() });

        expect(headers).not.toHaveProperty("Content-Type");
        expect(headers).toMatchObject({
            "Accept-Language": "en-US",
            "X-Accore-Locale": "en-US",
        });
    });
});
