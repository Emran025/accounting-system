"use client";

import { useI18n, catalogMessage } from "@/lib/i18n";
import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/lib/icons";
import { getTextDirection } from "@/lib/utils";

export interface SelectOption {
    value: string | number;
    label: string;
    subtitle?: string;
    original?: any; // Keep the original object if needed
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string | number | null;
    paddingVertical?: number;
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
    /** Automatically focus this input on mount */
    autoFocus?: boolean;
    /** Called after a barcode exact-match or Enter-key auto-select so the parent can advance focus */
    onAutoSelect?: () => void;
    /** External ref for programmatic focus */
    inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    onSearch,
    placeholder = catalogMessage("common.general.search"),
    disabled = false,
    id,
    name,
    required = false,
    className = "",
    noResultsText = catalogMessage("common.general.noResults"),
    renderOption,
    paddingVertical,
    filterOption,
    autoFocus = false,
    onAutoSelect,
    inputRef: externalRef,
}: SearchableSelectProps) {
    const { t: i18n } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [inputValue, setInputValue] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = externalRef ?? internalRef;

    // Auto-focus when requested (after initial mount / data load)
    useEffect(() => {
        if (autoFocus) {
            const t = setTimeout(() => inputRef.current?.focus(), 80);
            return () => clearTimeout(t);
        }
    }, [autoFocus, inputRef]);

    // Get selected option label
    const selectedOption = Array.isArray(options)
        ? options.find((opt) => opt.value === value)
        : null;

    // Update input value when selection changes
    useEffect(() => {
        if (selectedOption) {
            setInputValue(selectedOption.label);
            setSearchTerm("");
        } else if (!value && !onSearch) {
            setInputValue("");
            setSearchTerm("");
        }
    }, [selectedOption, value, onSearch]);

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

    // ── Barcode exact-match auto-select ──────────────────────────────────
    useEffect(() => {
        if (!searchTerm || searchTerm.length < 3) return;
        if (value) return; // already selected

        const exactMatch = Array.isArray(options)
            ? options.find((opt) =>
                opt.original?.barcode &&
                opt.original.barcode.toString().trim() === searchTerm.trim()
            )
            : null;

        if (exactMatch) {
            onChange(exactMatch.value, exactMatch);
            setInputValue(exactMatch.label);
            setSearchTerm("");
            setIsOpen(false);
            if (onAutoSelect) {
                setTimeout(() => onAutoSelect(), 50);
            }
        }
    }, [searchTerm, options, value, onChange, onAutoSelect]);
    // ─────────────────────────────────────────────────────────────────────

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setSearchTerm(val);
        if (onSearch) {
            onSearch(val);
        }
        setIsOpen(val.trim().length > 0);
    };

    const handleInputFocus = () => {
        // Only open dropdown if there is an active search term typed
        if (searchTerm.trim().length > 0) {
            setIsOpen(true);
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // If an option is already selected or filtered options exist
            if (!value && filteredOptions.length > 0 && searchTerm.trim().length > 0) {
                const topOption = filteredOptions[0];
                handleOptionClick(topOption);
            }
            setIsOpen(false);
            if (onAutoSelect) {
                setTimeout(() => onAutoSelect(), 50);
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null, null);
        setInputValue("");
        setSearchTerm("");
        if (onSearch) onSearch("");
        inputRef.current?.focus();
    };

    // Should only display dropdown when search term is not empty and dropdown is open
    const isDropdownVisible = isOpen && searchTerm.trim().length > 0;
    const displayValue = isOpen ? searchTerm : inputValue;
    const textDirection = getTextDirection(displayValue);

    return (
        <div className={`searchable-select ${className}`} ref={containerRef} dir={textDirection}>
            <input
                ref={inputRef}
                type="text"
                id={id}
                name={name}
                value={isOpen ? searchTerm : inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                required={required && !value}
                style={{
                    paddingTop: paddingVertical ? (paddingVertical + "rem") : undefined,
                    paddingBottom: paddingVertical ? (paddingVertical + "rem") : undefined,
                    direction: textDirection,
                    textAlign: textDirection === "rtl" ? "right" : "left",
                    paddingLeft: "3rem",
                    paddingRight: (value && !isOpen) ? "2.5rem" : "1rem"
                }}
            />
            <div className="input-icon">
                <Icon name="search" size={18} />
            </div>
            {value && !isOpen && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="clear-btn"
                    title={i18n.catalog["common.general.clear"]}
                >
                    <Icon name="x" size={16} />
                </button>
            )}
            <div className={`options-list ${isDropdownVisible ? "active" : ""}`}>
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

