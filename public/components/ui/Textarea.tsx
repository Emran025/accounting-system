"use client";

import { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
    className = "",
    label,
    error,
    id,
    ...props
}, ref) => {
    return (
        <div className="form-group">
            {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <textarea
                ref={ref}
                id={id}
                className={`searchable-select ${className} ${error ? "border-red-500 focus:border-red-500" : ""}`}
                style={{
                    minHeight: "80px",
                    resize: "vertical",
                    padding: "0.75rem 1rem",
                    width: "100%",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "#fff",
                    // Use system font or global font
                }}
                {...props}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
});

Textarea.displayName = "Textarea";