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
            className={`action-checkbox ${className} ${disabled ? "disabled" : ""}`}
        >
            <input 
                type="checkbox" 
                disabled={disabled} 
                {...props} 
            />
            {label && <span>{label}</span>}
        </label>
    );
}
