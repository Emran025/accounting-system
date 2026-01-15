"use client";

import React from "react";

interface FilterSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

/**
 * Main container for a filter bar.
 * Uses flexbox with wrap and alignment for filter groups and actions.
 */
export function FilterSection({ children, className = "", ...props }: FilterSectionProps) {
    return <div className={`filter-section ${className}`} {...props}>{children}</div>;
}

interface FilterGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * Individual filter unit containing a label and its input(s).
 */
export function FilterGroup({ label, children, className = "", ...props }: FilterGroupProps) {
    return (
        <div className={`filter-group ${className}`} {...props}>
            {label && <label>{label}</label>}
            {children}
        </div>
    );
}

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    label?: string;
    className?: string;
}

/**
 * Specialized component for selecting a date range (From - To).
 */
export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    label,
    className = "",
}: DateRangePickerProps) {
    const content = (
        <div className={`date-range-group ${className}`}>
            <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
            />
            <span>إلى</span>
            <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
            />
        </div>
    );

    if (label) {
        return <FilterGroup label={label}>{content}</FilterGroup>;
    }

    return content;
}

/**
 * Container for action buttons within a FilterSection.
 */
export function FilterActions({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`filter-actions ${className}`}>{children}</div>;
}
