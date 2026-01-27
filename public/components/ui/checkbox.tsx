"use client";

import * as React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export function Checkbox({
    label,
    className = "",
    disabled,
    ...props
}: CheckboxProps) {
    return (
        <label 
            className={`action-checkbox ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{ display: "inline-flex" }} // Ensure it behaves like the others
        >
            <input 
                type="checkbox" 
                disabled={disabled} 
                className="w-4 h-4 accent-blue-600"
                {...props} 
            />
            {label && <span className="mr-2">{label}</span>}
        </label>
    );
}
