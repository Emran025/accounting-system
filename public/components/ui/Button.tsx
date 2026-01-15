"use client";

import React from "react";
import Link from "next/link";
import { Icon, IconName } from "@/lib/icons";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info";
    size?: "sm" | "md" | "lg";
    icon?: IconName | React.ReactNode;
    iconPosition?: "left" | "right";
    isLoading?: boolean;
    href?: string;
    className?: string;
}

export function Button({
    children,
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "left",
    isLoading = false,
    href,
    className = "",
    disabled,
    ...props
}: ButtonProps) {
    const baseClasses = "btn";
    const variantClasses = `btn-${variant}`;
    const sizeClasses = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
    
    const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();

    const iconElement = typeof icon === "string" ? <Icon name={icon as IconName} /> : icon;

    const content = (
        <>
            {isLoading && <span className="btn-spinner"></span>}
            {!isLoading && icon && iconPosition === "left" && iconElement}
            {children}
            {!isLoading && icon && iconPosition === "right" && iconElement}
        </>
    );

    if (href) {
        // If it's an external link or a specific case where we want <a>, 
        // but for app routing we use Link.
        const isExternal = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
        
        if (isExternal) {
            return (
                <a href={href} className={combinedClasses} target="_blank" rel="noopener noreferrer">
                    {content}
                </a>
            );
        }

        return (
            <Link href={href} className={combinedClasses}>
                {content}
            </Link>
        );
    }

    return (
        <button
            className={combinedClasses}
            disabled={disabled || isLoading}
            {...props}
        >
            {content}
        </button>
    );
}
