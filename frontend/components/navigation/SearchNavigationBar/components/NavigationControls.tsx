"use client";

import { useRouter } from "next/navigation";
import { getIcon } from "@/lib/icons";
import { useUIStore } from "@/stores/useUIStore";

interface NavigationControlsProps {
    onUp: () => void;
}

export function NavigationControls({ onUp }: NavigationControlsProps) {
    const router = useRouter();
    const { toggleSideNav } = useUIStore();

    return (
        <div className="search-nav-controls">
            {/* Sidebar toggle */}
            <button
                type="button"
                className="search-nav-icon-btn"
                aria-label="Toggle sidebar"
                onClick={toggleSideNav}
            >
                {getIcon("panel-right")}
            </button>
            <button
                type="button"
                className="search-nav-icon-btn"
                aria-label="Forward"
                onClick={() => router.forward()}
            >
                {getIcon("arrow-right")}
            </button>
            <button
                type="button"
                className="search-nav-icon-btn"
                aria-label="Back"
                onClick={() => router.back()}
            >
                {getIcon("arrow-left")}
            </button>
            <button
                type="button"
                className="search-nav-icon-btn"
                aria-label="Up one level"
                onClick={onUp}
            >
                {getIcon("arrow-up")}
            </button>
        </div>
    );
}
