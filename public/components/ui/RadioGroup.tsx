"use client";

import * as React from "react";

interface RadioGroupProps {
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
    className?: string;
    children: React.ReactNode;
}

const RadioGroupContext = React.createContext<{
    name?: string;
    value?: string;
    onChange?: (value: string) => void;
} | undefined>(undefined);

export function RadioGroup({ value, onValueChange, name, className = "", children }: RadioGroupProps) {
    return (
        <RadioGroupContext.Provider value={{ name, value, onChange: onValueChange }}>
            <div className={`grid gap-2 ${className}`}>
                {children}
            </div>
        </RadioGroupContext.Provider>
    );
}

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    label?: string;
}

import { Label } from "./Label";

export function RadioGroupItem({ value, label, className = "", ...props }: RadioGroupItemProps) {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context?.value === value;

    const handleChange = () => {
        if (context?.onChange) {
            context.onChange(value);
        }
    };

    return (
        <Label className={`flex items-center space-x-2 space-x-reverse cursor-pointer ${className}`}>
            <div className="relative flex items-center">
                <input
                    type="radio"
                    name={context?.name}
                    value={value}
                    checked={isChecked}
                    onChange={handleChange}
                    className="checkbox-input sr-only"
                    {...props}
                />
                <div 
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isChecked ? "border-blue-600" : "border-gray-400"}`}
                >
                    {isChecked && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                </div>
            </div>
            {label && <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</span>}
        </Label>
    );
}
