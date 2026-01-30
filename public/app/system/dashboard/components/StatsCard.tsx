import { ReactNode } from "react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    colorClass?: "sales" | "products" | "alert" | "total" | "default";
    onClick?: () => void;
    isLoading?: boolean;
}

export function StatsCard({ 
    title, 
    value, 
    icon, 
    colorClass = "default", 
    onClick,
    isLoading = false 
}: StatsCardProps) {
    return (
        <div 
            className={`stat-card ${onClick ? "interactive" : ""}`} 
            onClick={onClick}
        >
            <div className={`stat-icon ${colorClass}`}>
                {icon}
            </div>
            <div className={`stat-info ${colorClass}`}>
                <h3>{title}</h3>
                <p>
                    {isLoading ? (
                        <span className="loading-dots">...</span>
                    ) : (
                        value
                    )}
                </p>
            </div>
            {/* Background decoration for visual interest */}
            <div className={`stat-decoration ${colorClass}`}></div>
        </div>
    );
}
