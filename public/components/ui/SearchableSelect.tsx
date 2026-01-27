"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/lib/icons";

export interface SelectOption {
    value: string | number;
    label: string;
    subtitle?: string;
    original?: any; // Keep the original object if needed
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string | number | null;
    onChange: (value: string | number | null, option: SelectOption | null) => void;
    onSearch?: (term: string) => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    required?: boolean;
    className?: string;
    noResultsText?: string;
    renderOption?: (option: SelectOption) => React.ReactNode;
    filterOption?: (option: SelectOption, searchTerm: string) => boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    onSearch,
    placeholder = "بحث...",
    disabled = false,
    id,
    name,
    required = false,
    className = "",
    noResultsText = "لا توجد نتائج",
    renderOption,
    filterOption,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [inputValue, setInputValue] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get selected option label
    const selectedOption = Array.isArray(options) 
        ? options.find((opt) => opt.value === value)
        : null;

    // Update input value when selection changes
    useEffect(() => {
        if (selectedOption) {
            setInputValue(selectedOption.label);
            setSearchTerm("");
        } else if (!value) {
            setInputValue("");
            setSearchTerm("");
        }
    }, [selectedOption, value]);

    // Filter options based on search (only if onSearch is not provided)
    const filteredOptions = onSearch 
        ? options 
        : Array.isArray(options)
            ? options.filter((opt) => {
                if (filterOption) return filterOption(opt, searchTerm);
                return opt.label.toLowerCase().includes(searchTerm.toLowerCase());
            })
            : [];

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setSearchTerm(val);
        if (onSearch) {
            onSearch(val);
        }
        if (!isOpen) setIsOpen(true);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        if (!selectedOption) {
            setSearchTerm(inputValue);
            if (onSearch) onSearch(inputValue);
        }
    };

    const handleOptionClick = useCallback(
        (option: SelectOption) => {
            onChange(option.value, option);
            setInputValue(option.label);
            setSearchTerm("");
            setIsOpen(false);
        },
        [onChange]
    );

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null, null);
        setInputValue("");
        setSearchTerm("");
        if (onSearch) onSearch("");
        inputRef.current?.focus();
    };

    return (
        <div className={`searchable-select ${className}`} ref={containerRef}>
            <input
                ref={inputRef}
                type="text"
                id={id}
                name={name}
                value={isOpen ? searchTerm : inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                required={required && !value}
            />
            <div className="input-icon">
                <Icon name="search" size={18} />
            </div>
            {value && !isOpen && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="clear-btn"
                    title="مسح"
                >
                    <Icon name="x" size={16} />
                </button>
            )}
            <div className={`options-list ${isOpen ? "active" : ""}`}>
                {filteredOptions.length === 0 ? (
                    <div className="no-results">{noResultsText}</div>
                ) : (
                    filteredOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`option-item ${value === option.value ? "selected" : ""}`}
                            onClick={() => handleOptionClick(option)}
                        >
                            {renderOption ? (
                                renderOption(option)
                            ) : (
                                <>
                                    <span className="option-name">{option.label}</span>
                                    {option.subtitle && (
                                        <span className="option-stock">{option.subtitle}</span>
                                    )}
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
            <input type="hidden" name={name} value={value || ""} required={required} />
        </div>
    );
}


