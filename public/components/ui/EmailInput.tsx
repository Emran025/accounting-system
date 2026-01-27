"use client";

import { TextInput } from "./TextInput";
import { InputProps } from "./Input";

interface EmailInputProps extends InputProps {
    label?: string;
    error?: string;
}

export function EmailInput(props: EmailInputProps) {
    return (
        <TextInput 
            type="email" 
            icon="mail" 
            {...props} 
            // Email is always LTR
            style={{direction: "ltr", textAlign: "left", ...props.style}} 
        />
    );
}
