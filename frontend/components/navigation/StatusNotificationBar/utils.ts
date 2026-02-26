"use client";

export type StatusType = "idle" | "info" | "success" | "warning" | "error";

export function getStatusIcon(type: StatusType): string {
    switch (type) {
        case "success":
            return "check";
        case "warning":
            return "alertTriangle";
        case "error":
            return "alert";
        case "info":
            return "activity";
        case "idle":
        default:
            return "clock";
    }
}
