"use client";

import { forwardRef } from "react";

import { Label } from "./label";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
    className = "",
    label,
    checked,
    onChange,
    disabled = false,
    ...props
}, ref) => {
    return (
        <Label className={`inline-flex items-center cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`} style={{ gap: "0.75rem" }}>
            <div className="relative">
                <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={checked} 
                    onChange={onChange} 
                    disabled={disabled}
                    ref={ref}
                    {...props}
                />
                <div 
                    className={`block w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-blue-600" : "bg-gray-200"}`}
                ></div>
                <div 
                    className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-full rtl:-translate-x-full" : ""}`}
                    style={{
                        transform: checked ? "translateX(1.25rem)" : "translateX(0)",
                        // RTL support needs manual handling or class-based handling
                        // Standard Tailwind RTL often uses translate-x logic differently or needs direction aware
                    }}
                >
                    {/* RTL override usually needed: 
                        If RTL, checked should move LEFT (negative X).
                        If LTR, checked moves RIGHT (positive X).
                        We'll rely on CSS or a simple style override if direction is rtl. 
                    */}
                </div>
            </div>
            {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
        </Label>
    );
});

Switch.displayName = "Switch";
