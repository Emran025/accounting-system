"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getIcon } from "@/lib/icons";

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                         */
/* ────────────────────────────────────────────────────────────── */

export interface BreadcrumbCrumb {
    label: string;
    href: string;
}

/** A sibling link for dropdown menus on each segment */
export interface SiblingLink {
    label: string;
    href: string;
}

interface BreadcrumbTrailProps {
    crumbs: BreadcrumbCrumb[];
    onNavigate: (href: string) => void;
    /** All navigable links – used for path-edit autocomplete */
    allLinks?: { label: string; href: string }[];
}

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                     */
/* ────────────────────────────────────────────────────────────── */

export function BreadcrumbTrail({
    crumbs,
    onNavigate,
    allLinks = [],
}: BreadcrumbTrailProps) {

    /* ── Editable mode state ─────────────────────────────────── */
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");
    const [suggestions, setSuggestions] = useState<{ label: string; href: string }[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    /** Build the display path from the crumbs, e.g. "الرئيسية > المبيعات > فواتير المبيعات" */
    const currentHref = crumbs.length > 0 ? crumbs[crumbs.length - 1].href : "/";

    /* ── Enter edit mode ─────────────────────────────────────── */
    const enterEditMode = useCallback(() => {
        setIsEditing(true);
        setEditValue(currentHref);
        setSuggestions([]);
        setSelectedSuggestion(-1);
    }, [currentHref]);

    /* ── Focus input on edit mode ────────────────────────────── */
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    /* ── Close edit mode on outside click ────────────────────── */
    useEffect(() => {
        if (!isEditing) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsEditing(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isEditing]);

    /* ── Filter suggestions as user types ────────────────────── */
    const handleInputChange = (value: string) => {
        setEditValue(value);
        setSelectedSuggestion(-1);
        if (value.trim().length === 0) {
            setSuggestions([]);
            return;
        }
        const lower = value.toLowerCase();
        const matches = allLinks.filter(
            (l) =>
                l.href.toLowerCase().includes(lower) ||
                l.label.toLowerCase().includes(lower)
        );
        setSuggestions(matches.slice(0, 8));
    };

    /* ── Keyboard handling ───────────────────────────────────── */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            setIsEditing(false);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedSuggestion((prev) =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
                onNavigate(suggestions[selectedSuggestion].href);
            } else if (editValue.startsWith("/")) {
                onNavigate(editValue);
            } else {
                // Try to find a matching link
                const match = allLinks.find(
                    (l) =>
                        l.label === editValue ||
                        l.href === editValue
                );
                if (match) onNavigate(match.href);
            }
            setIsEditing(false);
        }
    };

    /* ── Select suggestion ───────────────────────────────────── */
    const selectSuggestion = (href: string) => {
        onNavigate(href);
        setIsEditing(false);
    };

    /* ── Render ──────────────────────────────────────────────── */
    return (
        <div className="search-nav-left" ref={wrapperRef}>
            {/* ── Address Bar Container ──────────────────────── */}
            <div className="address-bar-container">
                {isEditing ? (
                    /* ─── Edit Mode: Text input with suggestions ── */
                    <div className="address-bar-edit-wrapper">
                        <div className="address-bar-input-row">
                            <span className="address-bar-edit-icon">
                                {getIcon("route")}
                            </span>
                            <input
                                ref={inputRef}
                                type="text"
                                className="address-bar-input"
                                value={editValue}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="اكتب مسار الصفحة أو اسمها..."
                                dir="ltr"
                                spellCheck={false}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                className="address-bar-go-btn"
                                aria-label="Navigate"
                                onClick={() => {
                                    if (editValue.startsWith("/")) {
                                        onNavigate(editValue);
                                    }
                                    setIsEditing(false);
                                }}
                            >
                                {getIcon("chevron-right")}
                            </button>
                        </div>

                        {/* ─── Suggestions dropdown ─── */}
                        {suggestions.length > 0 && (
                            <ul className="address-bar-suggestions">
                                {suggestions.map((s, i) => (
                                    <li
                                        key={s.href}
                                        className={`address-bar-suggestion-item ${i === selectedSuggestion ? "is-selected" : ""
                                            }`}
                                        onMouseDown={() => selectSuggestion(s.href)}
                                        onMouseEnter={() => setSelectedSuggestion(i)}
                                    >
                                        <span className="suggestion-label">{s.label}</span>
                                        <span className="suggestion-href">{s.href}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    /* ─── Display Mode: Breadcrumb segments ──── */
                    <nav
                        className="address-bar-breadcrumb"
                        aria-label="Breadcrumb"
                        onClick={(e) => {
                            // Click on the empty space (not on a crumb) to edit
                            if (e.target === e.currentTarget) {
                                enterEditMode();
                            }
                        }}
                    >
                        {crumbs.map((crumb, index) => (
                            <div key={crumb.href + crumb.label + index} className="address-bar-segment">
                                <button
                                    type="button"
                                    className={`address-bar-crumb ${index === crumbs.length - 1 ? "is-current" : ""
                                        }`}
                                    onClick={() => onNavigate(crumb.href)}
                                >
                                    {crumb.label}
                                </button>

                                {index < crumbs.length - 1 && (
                                    <span className="address-bar-separator">
                                        {getIcon("chevron-right")}
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Clickable empty area to enter edit mode */}
                        <button
                            type="button"
                            className="address-bar-edit-trigger"
                            onClick={enterEditMode}
                            aria-label="Edit path"
                            title="انقر لتعديل المسار"
                        />
                    </nav>
                )}
            </div>
        </div>
    );
}
