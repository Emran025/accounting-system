"use client";

import { Input, InputProps } from "./Input";
import { Label } from "./label";
import { InputError } from "./input-error";

interface TextInputProps extends InputProps {
    label?: string;
    error?: string;
}

export function TextInput({ label, error, className, ...props }: TextInputProps) {
    return (
        <div className="form-group">
            {label && <Label htmlFor={props.id} className="mb-1 block text-gray-700">{label}</Label>}
            <Input 
                className={`${className || ""} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`} 
                {...props} 
            />
            <InputError message={error} />
        </div>
    );
}
