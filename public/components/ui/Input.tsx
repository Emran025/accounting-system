"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { Icon, IconName } from "@/lib/icons";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: IconName;
    onClear?: () => void;
    containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    className = "",
    containerClassName = "",
    icon,
    onClear,
    value,
    onChange,
    type = "text",
    ...props
}, ref) => {
    const [isArabic, setIsArabic] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect text direction based on input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Check if starts with Arabic char
        const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        setIsArabic(arabicPattern.test(val)); // Simple check: contains Arabic? Or starts with? Usually starts with.
        
        if (onChange) {
            onChange(e);
        }
    };

    // Determine padding based on icon presence
    // In LTR: Icon usually on Left. In RTL: Icon usually on Right.
    // But Login page seems to force LTR and put icon on Left.
    // We will stick to the generic design: Icon on "Start"?
    // The previous code put icon at the bottom? No.
    
    return (
        <div className={`input-wrapper ${containerClassName}`} ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <input
                ref={ref}
                type={type}
                className={`${className}`}
                style={{
                    direction: isArabic ? "rtl" : "ltr",
                    textAlign: isArabic ? "right" : "left",
                    paddingLeft: icon ? "3rem" : "1rem", // Assuming generic style needs space for icon
                }}
                value={value}
                onChange={handleInputChange}
                {...props}
            />
            {icon && (
                <div className="input-icon" style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-light)",
                    pointerEvents: "none", // standard for icon
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
                        right: "10px", // Clear button on right?
                        top: "50%",
                        transform: "translateY(-50%)",
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
    );
});

Input.displayName = "Input";



