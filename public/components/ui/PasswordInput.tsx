"use client";

import { useState, forwardRef } from "react";
import { getIcon } from "@/lib/icons"; // Assuming getIcon is available, or use Icon component

import { Label } from "./Label";
import { InputError } from "./input-error";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({
    label,
    error,
    className = "",
    containerClassName = "",
    value,
    onChange,
    id,
    placeholder,
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="form-group">
            {label && <Label htmlFor={id} className="mb-1 block text-gray-700">{label}</Label>}
            <div className={`input-wrapper ${containerClassName}`} style={{ position: "relative", width: "100%" }}>
                <input
                    ref={ref}
                    id={id}
                    type={showPassword ? "text" : "password"}
                    className={`${className} ${error ? "border-red-500 focus:border-red-500" : ""}`}
                    style={{
                        paddingLeft: "3rem", // Space for toggle
                        textAlign: "left",
                        direction: "ltr", // Passwords usually LTR
                    }}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    tabIndex={-1} // Prevent tabbing if it disrupts flow, or keep it.
                    style={{
                         position: "absolute",
                         left: "10px",
                         top: "50%",
                         transform: "translateY(-50%)",
                         background: "none",
                         border: "none",
                         cursor: "pointer",
                         color: "var(--text-light)",
                         padding: "5px",
                         justifyContent: "center",
                         alignItems: "center",
                         display: "flex"
                    }}
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                    {getIcon(showPassword ? "unlock" : "lock")} 
                </button>
            </div>
             <InputError message={error} />
        </div>
    );
});

PasswordInput.displayName = "PasswordInput";
