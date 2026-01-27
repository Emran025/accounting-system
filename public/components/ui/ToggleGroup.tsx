"use client";

import * as React from "react";
import { Toggle } from "./Toggle";

interface ToggleGroupProps {
    type: "single" | "multiple";
    value?: string | string[];
    onValueChange?: (value: any) => void;
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
}

const ToggleGroupContext = React.createContext<{
    type: "single" | "multiple";
    value?: string | string[];
    onValueChange?: (value: any) => void;
    variant?: "default" | "outline";
    size?: "default" | "sm" | "lg";
}>({ type: "single" });

export function ToggleGroup({ 
    type, 
    value, 
    onValueChange, 
    children, 
    className = "",
    variant = "default",
    size = "default"
}: ToggleGroupProps) {
    return (
        <ToggleGroupContext.Provider value={{ type, value, onValueChange, variant, size }}>
            <div className={`flex items-center gap-1 ${className}`}>
                {children}
            </div>
        </ToggleGroupContext.Provider>
    );
}

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
}

export function ToggleGroupItem({ value, children, className, ...props }: ToggleGroupItemProps) {
    const context = React.useContext(ToggleGroupContext);
    
    // Determine pressed state
    let pressed = false;
    if (context.type === "single") {
        pressed = context.value === value;
    } else if (Array.isArray(context.value)) {
        pressed = context.value.includes(value);
    }

    const handlePressedChange = (isPressed: boolean) => {
        if (!context.onValueChange) return;

        if (context.type === "single") {
            context.onValueChange(isPressed ? value : undefined);
        } else {
            const currentValues = (context.value as string[]) || [];
            if (isPressed) {
                context.onValueChange([...currentValues, value]);
            } else {
                context.onValueChange(currentValues.filter(v => v !== value));
            }
        }
    };

    return (
        <Toggle
            pressed={pressed}
            onPressedChange={handlePressedChange}
            variant={context.variant}
            size={context.size}
            className={className}
            {...props}
        >
            {children}
        </Toggle>
    );
}
