"use client";

import { useState, useRef, forwardRef } from "react";
import { Icon, IconName } from "@/lib/icons";
import { isArabic as checkIsArabic } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    icon?: IconName;
    onClear?: () => void;
    containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
    className = "",
    containerClassName = "",
    label,
    error,
    id,
    icon,
    onClear,
    value,
    onChange,
    ...props
}, ref) => {
    const [isArabic, setIsArabic] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect text direction based on input
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setIsArabic(checkIsArabic(val));

        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className={`form-group ${containerClassName}`} style={{ width: "100%" }}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            <div className="input-wrapper" ref={containerRef} style={{ position: "relative", width: "100%" }}>
                <textarea
                    ref={ref}
                    id={id}
                    className={`searchable-select ${className} ${error ? "border-red-500 focus:border-red-500" : ""}`}
                    style={{
                        minHeight: "80px",
                        resize: "vertical",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        paddingLeft: icon ? "3rem" : "1rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "#fff",
                        direction: isArabic ? "rtl" : "ltr",
                        textAlign: isArabic ? "right" : "left",
                    }}
                    value={value}
                    onChange={handleInputChange}
                    {...props}
                />

                {icon && (
                    <div className="input-icon" style={{
                        position: "absolute",
                        left: "10px",
                        top: "1rem",
                        color: "var(--text-light)",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <Icon name={icon} size={18} />
                    </div>
                )}

                {value && onClear && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="clear-btn"
                        title="مسح"
                        style={{
                            position: "absolute",
                            right: "10px",
                            top: "1rem",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-light)"
                        }}
                    >
                        <Icon name="x" size={16} />
                    </button>
                )}
            </div>

            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
});

Textarea.displayName = "Textarea";