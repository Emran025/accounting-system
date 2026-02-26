"use client";

import { SearchableSelect, SelectOption } from "@/components/ui";
import { GlobalMenus } from "./components/GlobalMenus";
import { GlobalMeta } from "./components/GlobalMeta";
import { useMemo, useState } from "react";
import { NavigationGroup, navigationGroups, NavigationLink } from "@/lib/navigation-config";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { canAccess } from "@/lib/auth";

interface TopGlobalBarProps {
    onNavigate?: (href: string) => void;

    /**
     * Optional override for the displayed screen title.
     * When omitted, the title is derived from the navigation configuration.
     */
    titleOverride?: string;
}


interface SearchResultItem {
    link: NavigationLink;
    group: NavigationGroup;
}

export function TopGlobalBar({ onNavigate , titleOverride }: TopGlobalBarProps) {
    const pathname = usePathname();
    const [query, setQuery] = useState("");
    const { permissions } = useAuthStore();

    const router = useRouter();

    const allLinks: SearchResultItem[] = useMemo(() => {
        return navigationGroups.flatMap((group) => {
            const accessibleLinks = group.links.filter((link) =>
                canAccess(permissions, link.module, "view")
            );
            return accessibleLinks.map((link) => ({ link, group }));
        });
    }, [permissions]);

    const handleNavigate = (href: string) => {
        router.push(href);
        onNavigate?.(href);
    };

    const filteredResults: SearchResultItem[] = useMemo(() => {
        const trimmed = query.trim();
        if (!trimmed) return [];
        const q = trimmed.toLowerCase();

        return allLinks
            .filter(({ link, group }) => {
                return (
                    link.label.toLowerCase().includes(q) ||
                    link.description.toLowerCase().includes(q) ||
                    group.label.toLowerCase().includes(q)
                );
            })
            .slice(0, 8);
    }, [allLinks, query]);

    const searchOptions: SelectOption[] = useMemo(() => {
        return filteredResults.map((item) => ({
            value: item.link.href,
            label: item.link.label,
            subtitle: item.group.label,
            original: item,
        }));
    }, [filteredResults]);

    return (
        <header className="top-global-bar">
            {/* Left: Global menus */}
            <GlobalMenus />

            {/* Center: Search Field */}
            <div style={{ flex: 1, maxWidth: "600px" }}>
                <SearchableSelect
                    options={searchOptions}
                    value={null}
                    onChange={(val) => {
                        if (val) handleNavigate(val as string);
                    }}
                    paddingVertical={0.25}
                    onSearch={setQuery}
                    placeholder="بحث في القوائم..."
                    className="w-full"
                    noResultsText="لا توجد نتائج"
                />
            </div>

            {/* Right: User & session info */}
            <GlobalMeta />
        </header>
    );
}
