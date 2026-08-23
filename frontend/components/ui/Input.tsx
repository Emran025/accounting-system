"use client";

import { catalogMessage } from "@/lib/i18n";
import { forwardRef, useState } from "react";
import { Icon, IconName } from "@/lib/icons";
import { getTextDirection } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: IconName;
    onClear?: () => void;
    containerClassName?: string;
}

function valueAsText(value: React.InputHTMLAttributes<HTMLInputElement>["value"]): string {
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    className = "",
    containerClassName = "",
    icon,
    onClear,
    value,
    onChange,
    type = "text",
    dir,
    style,
    ...props
}, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = useState("");
    const explicitDirection = dir === "rtl" || dir === "ltr" ? dir : null;
    const textValue = value === undefined ? uncontrolledValue : valueAsText(value);
    const textDirection = explicitDirection ?? getTextDirection(textValue);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (value === undefined) {
            setUncontrolledValue(event.target.value);
        }
        onChange?.(event);
    };

    return (
        <div className={`input-wrapper ${containerClassName}`.trim()} dir={textDirection}>
            <input
                ref={ref}
                type={type}
                className={`input-direction-aware ${icon ? "has-input-icon" : ""} ${className}`.trim()}
                dir={textDirection}
                style={style}
                value={value}
                onChange={handleInputChange}
                {...props}
            />
            {icon ? (
                <span className="input-icon" aria-hidden="true">
                    <Icon name={icon} size={18} />
                </span>
            ) : null}
            {valueAsText(value) && onClear ? (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onClear();
                    }}
                    className="clear-btn"
                    title={catalogMessage("common.general.clear")}
                >
                    <Icon name="x" size={16} />
                </button>
            ) : null}
        </div>
    );
});

Input.displayName = "Input";
