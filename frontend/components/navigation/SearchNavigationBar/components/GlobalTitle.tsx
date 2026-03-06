"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navigationGroups, NavigationLink, getAllNavigationLinks, getNavigationGroup } from "@/lib/navigation-config";

interface GlobalTitleProps {
    titleOverride?: string;
}

export function GlobalTitle({ titleOverride }: GlobalTitleProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentLink: NavigationLink | undefined = useMemo(() => {
        if (!pathname) return undefined;
        return getAllNavigationLinks(navigationGroups)
            .find((l) => l.href === pathname);
    }, [pathname]);

    const currentGroupLabel = useMemo(() => {
        if (!pathname) return "";
        if (pathname === "/navigation") {
            const groupKey = searchParams.get("group");
            if (groupKey) {
                const group = getNavigationGroup(groupKey);
                return group?.label || "";
            }
        }
        const group = navigationGroups.find((g) =>
            getAllNavigationLinks([g]).some((l) => l.href === pathname)
        );
        return group?.label || "";
    }, [pathname, searchParams]);

    const screenTitle =
        titleOverride ||
        currentLink?.label ||
        currentGroupLabel ||
        "لوحة التحكم";

    return (
        <div className="top-global-title" aria-live="polite">
            {screenTitle}
        </div>
    );
}
