"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    navigationGroups,
    NavigationGroup,
    NavigationLink,
} from "@/lib/navigation-config";
import { useAuthStore } from "@/stores/useAuthStore";
import { canAccess } from "@/lib/auth";
import { BreadcrumbTrail } from "./components/BreadcrumbTrail";
import { NavigationControls } from "./components/NavigationControls";
import { GlobalTitle } from "./components/GlobalTitle";

interface SearchNavigationBarProps {
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

export function SearchNavigationBar({ onNavigate, titleOverride }: SearchNavigationBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { permissions } = useAuthStore();

    const allLinks: SearchResultItem[] = useMemo(() => {
        return navigationGroups.flatMap((group) => {
            const accessibleLinks = group.links.filter((link) =>
                canAccess(permissions, link.module, "view")
            );
            return accessibleLinks.map((link) => ({ link, group }));
        });
    }, [permissions]);

    const currentGroup = useMemo(() => {
        if (!pathname) return undefined;
        if (pathname === "/navigation") {
            const groupKey = searchParams.get("group");
            if (groupKey) {
                return navigationGroups.find((g) => g.key === groupKey);
            }
        }
        return navigationGroups.find((group) =>
            group.links.some((link) => link.href === pathname)
        );
    }, [pathname, searchParams]);

    const currentLink = useMemo(() => {
        if (!pathname) return undefined;
        return allLinks.find(({ link }) => link.href === pathname)?.link;
    }, [allLinks, pathname]);

    const crumbs = useMemo(() => {
        const base = [{ label: "الرئيسية", href: "/navigation" }];

        if (!currentGroup && !currentLink) {
            return base;
        }

        const items = [...base];

        if (currentGroup) {
            items.push({
                label: currentGroup.label,
                href: `/navigation?group=${currentGroup.key}`,
            });
        }

        if (currentLink) {
            items.push({
                label: currentLink.label,
                href: currentLink.href,
            });
        }

        return items;
    }, [currentGroup, currentLink]);


    const handleNavigate = (href: string) => {
        router.push(href);
        onNavigate?.(href);
    };

    const handleUp = () => {
        if (crumbs.length >= 2) {
            const parent = crumbs[crumbs.length - 2];
            handleNavigate(parent.href);
        } else {
            handleNavigate("/navigation");
        }
    };

    return (
        <div className="search-navigation-bar">
            {/* Right: Path Navigation Controls */}
            <NavigationControls onUp={handleUp} />
            {/* Left: Hamburger & Breadcrumbs */}
            <BreadcrumbTrail
                crumbs={crumbs}
                onNavigate={handleNavigate}
                allLinks={allLinks.map(({ link }) => ({ label: link.label, href: link.href }))}
            />
            {/* Center: Current screen title */}
            <GlobalTitle titleOverride={titleOverride} />
        </div>
    );
}
