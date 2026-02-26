"use client";

import * as React from "react";

interface InputErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
    message?: string;
}

export function InputError({ message, className = "", ...props }: InputErrorProps) {
    if (!message) return null;
    return (
        <p className={`text-sm font-medium text-red-500 ${className}`} {...props}>
            {message}
        </p>
    );
}
