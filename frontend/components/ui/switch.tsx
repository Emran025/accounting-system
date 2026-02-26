"use client";

import { forwardRef, useState, useEffect } from "react";
import { Label } from "./Label";

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
    const [isRtl, setIsRtl] = useState(true);

    useEffect(() => {
        // Detect direction on mount and when it might change
        const dir = window.getComputedStyle(document.documentElement).direction;
        setIsRtl(dir === 'rtl');
    }, []);

    // Logic for thumb position:
    // LTR: Unchecked (OFF) = Left (0px), Checked (ON) = Right (20px)
    // RTL: Unchecked (OFF) = Right (20px), Checked (ON) = Left (0px)
    const getTransform = () => {
        if (isRtl) {
            return checked ? "translateX(0)" : "translateX(20px)";
        }
        return checked ? "translateX(20px)" : "translateX(0)";
    };

    return (
        <Label 
            className={`switch-container ${disabled ? "disabled" : ""} ${className}`} 
            style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                cursor: disabled ? "not-allowed" : "pointer",
                gap: "0.75rem",
                userSelect: "none"
            }}
        >
            <div className="switch-track" style={{
                position: "relative",
                width: "44px",
                height: "24px",
                backgroundColor: checked ? "var(--primary-color, #3b82f6)" : "#d1d5db",
                borderRadius: "12px",
                transition: "background-color 0.2s ease",
                flexShrink: 0
            }}>
                <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={checked} 
                    onChange={onChange} 
                    disabled={disabled}
                    ref={ref}
                    style={{ 
                        position: "absolute", 
                        opacity: 0, 
                        width: 0, 
                        height: 0,
                        margin: 0
                    }}
                    {...props}
                />
                <div 
                    className="switch-thumb"
                    style={{
                        position: "absolute",
                        top: "2px",
                        left: "2px", // Base position is always left
                        width: "20px",
                        height: "20px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        transition: "transform 0.2s ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transform: getTransform()
                    }}
                ></div>
            </div>
            {label && <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>}
        </Label>
    );
});

Switch.displayName = "Switch";
