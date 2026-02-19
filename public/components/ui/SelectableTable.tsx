"use client";

import { ReactNode, useState, useRef, useCallback } from "react";
import { Icon } from "@/lib/icons";
import { Checkbox } from "./checkbox";
import { Label } from "./Label";

export interface SelectableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string; // Align with Table's Column
  dataLabel?: string;
}

interface SelectableTableProps<T> {
  data: T[];
  columns: SelectableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  selectedIds: (string | number)[];
  onSelectionChange: (selectedIds: (string | number)[]) => void;
  selectionMode?: boolean;
  onRowLongPress?: (item: T) => void;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  isRowSelectable?: (item: T) => boolean;
}

const LONG_PRESS_DURATION = 500;

export function SelectableTable<T>({
  data,
  columns,
  keyExtractor,
  selectedIds,
  onSelectionChange,
  selectionMode = false,
  onRowLongPress,
  onRowClick,
  isLoading = false,
  emptyMessage = "لا توجد بيانات",
  isRowSelectable,
}: SelectableTableProps<T>) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const pressStartPos = useRef<{ x: number; y: number } | null>(null);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent, item: T) => {
    // Only track if long press handler exists
    if (!onRowLongPress && !selectionMode) return;

    const pos = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };

    pressStartPos.current = pos;

    longPressTimer.current = setTimeout(() => {
      // Trigger long press
      if (onRowLongPress) {
        onRowLongPress(item);
      }
    }, LONG_PRESS_DURATION);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePressMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!pressStartPos.current || !longPressTimer.current) return;

    const pos = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };

    const distance = Math.sqrt(
      Math.pow(pos.x - pressStartPos.current.x, 2) +
      Math.pow(pos.y - pressStartPos.current.y, 2)
    );

    if (distance > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleRowClick = (item: T) => {
    const id = keyExtractor(item);

    if (selectionMode) {
      if (isRowSelectable && !isRowSelectable(item)) return;

      // Toggle selection
      const isSelected = selectedIds.includes(id);
      let newSelected;
      if (isSelected) {
        newSelected = selectedIds.filter(sid => sid !== id);
      } else {
        newSelected = [...selectedIds, id];
      }
      onSelectionChange(newSelected);
    } else {
      if (onRowClick) {
        onRowClick(item);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <div className="empty-state" style={{ textAlign: "center", padding: "1rem" }}>
          <div className="loading-spinner"></div>
          <div>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {selectionMode && (
                <th className="checkbox-header" style={{ width: "40px" }}>
                  <Checkbox
                    className="minimal"
                    checked={data.length > 0 && data.every(item => !isRowSelectable || !isRowSelectable(item) || selectedIds.includes(keyExtractor(item))) && data.some(item => !isRowSelectable || isRowSelectable(item))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const selectableIds = data
                          .filter(item => !isRowSelectable || isRowSelectable(item))
                          .map(item => keyExtractor(item));
                        onSelectionChange(selectableIds);
                      } else {
                        onSelectionChange([]);
                      }
                    }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectionMode ? 1 : 0)} className="empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={id}
                    className={`selectable-row ${isSelected ? "selected" : ""}`}
                    onClick={() => handleRowClick(item)}
                    onMouseDown={(e) => handlePressStart(e, item)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onMouseMove={handlePressMove}
                    onTouchStart={(e) => handlePressStart(e, item)}
                    onTouchEnd={handlePressEnd}
                    onTouchMove={handlePressMove}
                    style={{
                      opacity: isRowSelectable && !isRowSelectable(item) ? 0.5 : 1,
                      cursor: isRowSelectable && !isRowSelectable(item) ? "not-allowed" : "pointer",
                      pointerEvents: isRowSelectable && !isRowSelectable(item) ? "none" : "auto"
                    }}
                  >
                    {selectionMode && (
                      <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                        {(!isRowSelectable || isRowSelectable(item)) ? (
                          <Checkbox
                            className="minimal"
                            checked={isSelected}
                            onChange={() => handleRowClick(item)}
                          />
                        ) : (
                          <div style={{ height: "22px" }} />
                        )
                        }
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render
                          ? col.render(item)
                          : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
