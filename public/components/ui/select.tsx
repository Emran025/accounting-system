"use client";

import { forwardRef } from "react";
import { Icon } from "@/lib/icons"; // Assuming generic Icon component exists

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    className = "",
    label,
    error,
    id,
    options,
    children,
    ...props
}, ref) => {
    return (
        <div className="form-group">
            {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <select
                    ref={ref}
                    id={id}
                    className={`searchable-select appearance-none ${className} ${error ? "border-red-500 focus:border-red-500" : ""}`}
                    style={{
                        width: "100%",
                        padding: "0.75rem 2.5rem 0.75rem 1rem", // Extra padding for chevron
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        ...props.style
                    }}
                    {...props}
                >
                   {children ? children : (
                       options?.map((opt) => (
                           <option key={opt.value} value={opt.value}>
                               {opt.label}
                           </option>
                       ))
                   )}
                </select>
                <div 
                    className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {/* Custom Chevron if needed, or rely on CSS background image if defined in globals */}
                    <Icon name="chevronDown" size={16} />
                </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
});

Select.displayName = "Select";