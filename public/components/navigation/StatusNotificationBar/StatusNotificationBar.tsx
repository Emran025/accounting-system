"use client";

import { StatusType } from "./utils";
import { StatusIndicator } from "./components/StatusIndicator";
import { EnvironmentIndicator } from "./components/EnvironmentIndicator";

interface StatusNotificationBarProps {
    text?: string;
    type?: StatusType;
}

export function StatusNotificationBar({
    text = "Ready",
    type = "idle",
}: StatusNotificationBarProps) {
    return (
        <footer className={`status-notification-bar status-${type}`}>
            <StatusIndicator text={text} type={type} />
            <EnvironmentIndicator />
        </footer>
    );
}
