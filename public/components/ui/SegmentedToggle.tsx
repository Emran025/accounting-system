"use client";

import React from "react";

export interface ToggleOption {
  value: string;
  label: string;
}

interface SegmentedToggleProps {
  label?: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A reusable segmented control component for switching between different types or modes.
 */
export function SegmentedToggle({
  label,
  options,
  value,
  onChange,
  className = "",
}: SegmentedToggleProps) {
  return (
    <div className={`segmented-toggle-container ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <span className="stat-label">{label}</span>}
      <div className="discount-type-toggle">
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "active" : ""}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
