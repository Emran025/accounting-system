"use client";

import { getIcon } from "@/lib/icons";
import { StatusType, getStatusIcon } from "../utils";

interface StatusIndicatorProps {
    text: string;
    type: StatusType;
}

export function StatusIndicator({ text, type }: StatusIndicatorProps) {
    const iconName = getStatusIcon(type);

    return (
        <div className="status-notification-left">
            <span className="status-notification-icon">
                {getIcon(iconName)}
            </span>
            <span className="status-notification-text">{text}</span>
        </div>
    );
}
