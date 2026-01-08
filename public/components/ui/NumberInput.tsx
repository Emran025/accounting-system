"use client";

import { Icon } from "@/lib/icons";
import React from "react";

interface NumberInputProps {
    value: string | number;
    onChange: (value: string) => void;
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    label?: string;
    required?: boolean;
    readOnly?: boolean;
    className?: string;
    placeholder?: string;
    suffix?: string;
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    id,
    label,
    required,
    readOnly,
    className = "",
    placeholder,
    suffix
}: NumberInputProps) {
    const handleIncrement = () => {
        if (readOnly) return;
        const current = parseFloat(String(value)) || 0;
        const next = current + step;
        if (max !== undefined && next > max) return;
        onChange(String(next));
    };

    const handleDecrement = () => {
        if (readOnly) return;
        const current = parseFloat(String(value)) || 0;
        const next = current - step;
        if (min !== undefined && next < min) return;
        onChange(String(next));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) {
            if (min !== undefined) onChange(String(min));
            return;
        }
        if (min !== undefined && val < min) val = min;
        if (max !== undefined && val > max) val = max;
        onChange(String(val));
    };

    return (
        <div className={`number-input-container ${className}`}>
            {label && <label htmlFor={id}>{label}</label>}
            <div className={`number-input-wrapper ${readOnly ? "readonly" : ""}`}>
                {!readOnly && (
                    <button
                        type="button"
                        className="number-input-btn decrement"
                        onClick={handleDecrement}
                        disabled={min !== undefined && parseFloat(String(value)) <= min}
                        tabIndex={-1}
                    >
                        <Icon name="minus" />
                    </button>
                )}
                <div className="input-field-with-suffix">
                    <input
                        type="number"
                        id={id}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={handleBlur}
                        min={min}
                        max={max}
                        step={step}
                        required={required}
                        readOnly={readOnly}
                        placeholder={placeholder}
                        className="no-spinner"
                    />
                    {suffix && <span className="input-suffix">{suffix}</span>}
                </div>
                {!readOnly && (
                    <button
                        type="button"
                        className="number-input-btn increment"
                        onClick={handleIncrement}
                        disabled={max !== undefined && parseFloat(String(value)) >= max}
                        tabIndex={-1}
                    >
                        <Icon name="plus" />
                    </button>
                )}
            </div>
        </div>
    );
}
