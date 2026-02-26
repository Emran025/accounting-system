"use client";

import { useEffect, useState } from "react";
import { getIcon } from "@/lib/icons";
import { useAuthStore } from "@/stores/useAuthStore";

function formatElapsed(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
        .toString()
        .padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${hrs}:${mins}`;//${secs}`;
}

export function GlobalMeta() {
    const { user } = useAuthStore();

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        // Session timer + current clock
        const interval = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
            setNow(new Date());
        }, 1000);
        setNow(new Date());
        return () => clearInterval(interval);
    }, []);

    const formattedTime =
        now?.toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
            //second: "2-digit",
        }) ?? "--:--:--";

    return (
        <div className="top-global-meta">
            <div className="top-global-user">
                <div className="top-global-user-icon">
                    {getIcon("user")}
                </div>
                <div className="top-global-user-text">
                    <span className="top-global-user-name">
                        {user?.full_name || user?.username || "Guest"}
                    </span>
                    {/* <span className="top-global-user-role">
                        {user?.role || "No active role"}
                    </span> */}
                </div>
                <button
                    type="button"
                    className="top-global-icon-btn"
                    aria-label="Settings"
                >
                    {getIcon("settings")}
                </button>
            </div>

            <div className="top-global-session">
                <div className="top-global-session-item">
                    <span className="top-global-session-icon">
                        {getIcon("clock")}
                    </span>
                    <span className="top-global-session-label">
                        Session
                    </span>
                    <span className="top-global-session-value">
                        {formatElapsed(elapsedSeconds)}
                    </span>
                </div>
                <div className="top-global-session-item">
                    <span className="top-global-session-icon">
                        {getIcon("calendar")}
                    </span>
                    <span className="top-global-session-label">
                        Time
                    </span>
                    <span className="top-global-session-value">
                        {formattedTime}
                    </span>
                </div>
            </div>
        </div>
    );
}

