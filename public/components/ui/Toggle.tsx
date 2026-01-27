"use client";

import * as React from "react";

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
}

export function Toggle({ 
    className = "", 
    pressed, 
    onPressedChange, 
    variant = "default", 
    size = "default",
    onClick,
    children,
    ...props 
}: ToggleProps) {
    const [isPressed, setIsPressed] = React.useState(pressed || false);

    React.useEffect(() => {
        if (pressed !== undefined) {
            setIsPressed(pressed);
        }
    }, [pressed]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newState = !isPressed;
        if (pressed === undefined) {
            setIsPressed(newState);
        }
        if (onPressedChange) {
            onPressedChange(newState);
        }
        if (onClick) {
            onClick(e);
        }
    };

    const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus:ring-2 disabled:pointer-events-none disabled:opacity-50";
    
    // Using simple styles or CSS variables from globals.css
    const variantClass = variant === "outline" 
        ? "border border-input hover:bg-gray-100" 
        : "hover:bg-gray-100";
    
    const activeClass = isPressed 
        ? "bg-gray-200 text-gray-900" 
        : "bg-transparent text-gray-500";
        
    const sizeClass = size === "sm" ? "h-8 px-2" : size === "lg" ? "h-10 px-3" : "h-9 px-2.5";

    return (
        <button
            type="button"
            aria-pressed={isPressed}
            onClick={handleClick}
            className={`${baseClass} ${variantClass} ${activeClass} ${sizeClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
