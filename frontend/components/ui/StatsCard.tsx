import { ReactNode } from "react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    colorClass?: "sales" | "products" | "alert" | "total" | "default";
    onClick?: () => void;
    isLoading?: boolean;
    hight?: number;
}

export function StatsCard({
    title,
    value,
    icon,
    colorClass = "default",
    onClick,
    isLoading = false,
    hight = 100
}: StatsCardProps) {
    return (
        <div
            className={`stat-card ${colorClass} ${onClick ? "interactive" : ""}`}
            onClick={onClick}
            style={{ height: `${hight}px` }}
        >
            {/* Shimmer highlight */}
            <div className="stat-shimmer" />

            {/* Icon bubble */}
            <div className="stat-icon-wrap">
                <div className="stat-icon-inner">
                    {icon}
                </div>
            </div>

            {/* Text content */}
            <div className="stat-body">
                <span className="stat-label">{title}</span>
                <span className="stat-value">
                    {isLoading ? (
                        <span className="loading-dots">...</span>
                    ) : (
                        value
                    )}
                </span>
            </div>

            {/* Decorative orbs */}
            <div className="stat-orb stat-orb-1" />
            <div className="stat-orb stat-orb-2" />
        </div>
    );
}
