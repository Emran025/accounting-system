"use client";

interface EnvironmentIndicatorProps {
    env?: string;
}

export function EnvironmentIndicator({
    env = "Test Environment",
}: EnvironmentIndicatorProps) {
    return (
        <div className="status-notification-right">
            <span className="status-notification-env">{env}</span>
        </div>
    );
}
