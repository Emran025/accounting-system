"use client";

import * as React from "react";
import { useState } from "react";

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

export function Tooltip({ content, children, delay = 200, className = "" }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        const id = setTimeout(() => setIsVisible(true), delay);
        setTimeoutId(id);
    };

    const handleMouseLeave = () => {
        if (timeoutId) clearTimeout(timeoutId);
        setIsVisible(false);
    };

    return (
        <div 
            className="relative inline-block" 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div 
                    className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-sm whitespace-nowrap ${className}`}
                    style={{
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%) marginBottom(0.5rem)",
                        marginBottom: "0.5rem"
                    }}
                >
                    {content}
                    <div 
                        className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
                        style={{
                            bottom: "-4px",
                            left: "50%",
                            marginLeft: "-4px"
                        }}
                    ></div>
                </div>
            )}
        </div>
    );
}
