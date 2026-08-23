"use client";

import { catalogMessage } from "@/lib/i18n";
import { forwardRef, useState } from "react";
import { Icon, IconName } from "@/lib/icons";
import { getTextDirection } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    icon?: IconName;
    onClear?: () => void;
    containerClassName?: string;
}

function valueAsText(value: React.TextareaHTMLAttributes<HTMLTextAreaElement>["value"]): string {
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
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
    dir,
    style,
    ...props
}, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = useState("");
    const explicitDirection = dir === "rtl" || dir === "ltr" ? dir : null;
    const textValue = value === undefined ? uncontrolledValue : valueAsText(value);
    const textDirection = explicitDirection ?? getTextDirection(textValue);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (value === undefined) {
            setUncontrolledValue(event.target.value);
        }
        onChange?.(event);
    };

    return (
        <div className={`form-group ${containerClassName}`.trim()}>
            {label ? <label htmlFor={id} className="form-label">{label}</label> : null}
            <div className="input-wrapper" dir={textDirection}>
                <textarea
                    ref={ref}
                    id={id}
                    className={`input-direction-aware app-textarea ${icon ? "has-input-icon" : ""} ${className} ${error ? "has-error" : ""}`.trim()}
                    dir={textDirection}
                    style={style}
                    value={value}
                    onChange={handleInputChange}
                    {...props}
                />
                {icon ? (
                    <span className="input-icon input-icon-top" aria-hidden="true">
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
                        className="clear-btn clear-btn-top"
                        title={catalogMessage("common.general.clear")}
                    >
                        <Icon name="x" size={16} />
                    </button>
                ) : null}
            </div>
            {error ? <p className="input-error-message">{error}</p> : null}
        </div>
    );
});

Textarea.displayName = "Textarea";
