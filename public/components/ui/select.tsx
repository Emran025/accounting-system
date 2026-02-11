"use client";

import { forwardRef } from "react";
import { Icon } from "@/lib/icons"; // Assuming generic Icon component exists

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: { value: string | number; label: string }[];
    placeholder?: string;
    containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    className = "",
    label,
    error,
    id,
    options,
    children,
    placeholder,
    containerClassName = "",
    ...props
}, ref) => {
    return (
        <div className={`form-group ${containerClassName}`} style={{ marginBottom: 0, width: "auto" }}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <select
                    ref={ref}
                    id={id}
                    className={`searchable-select appearance-none ${className} ${error ? "border-red-500 focus:border-red-500" : ""}`}
                    style={{
                        width: "auto",
                        minWidth: "200px",
                        padding: "0.75rem 1rem 0.75rem 2.5rem", // Larger padding on the left for the chevron in RTL
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        backgroundImage: "none", // Remove default background icon to use our custom Icon component
                        transition: "all 0.2s ease",
                        ...props.style
                    }}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {children ? children : (
                        options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))
                    )}
                </select>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
});

Select.displayName = "Select";