"use client";

import { ReactNode, useState } from "react";
import { Icon } from "@/lib/icons";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  dataLabel?: string;
}

interface ExpandableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  renderExpandedRow: (item: T) => ReactNode;
  onExpand?: (item: T, isExpanded: boolean) => void;
  expandedRowId?: string | number | null; // Controlled expansion
  onExpandedRowChange?: (id: string | number | null) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  expandable?: boolean;
  isExpandable?: (item: T) => boolean;
}

export function ExpandableTable<T>({
  data,
  columns,
  keyExtractor,
  renderExpandedRow,
  onExpand,
  expandedRowId: controlledExpandedId,
  onExpandedRowChange,
  isLoading = false,
  emptyMessage = "لا توجد بيانات",
  expandable = true,
  isExpandable,
}: ExpandableTableProps<T>) {
  const [internalExpandedId, setInternalExpandedId] = useState<string | number | null>(null);

  const isControlled = controlledExpandedId !== undefined;
  const currentExpandedId = isControlled ? controlledExpandedId : internalExpandedId;

  const toggleExpand = (item: T) => {
    if (isExpandable && !isExpandable(item)) return;

    const id = keyExtractor(item);
    const isExpanded = currentExpandedId === id;
    const newId = isExpanded ? null : id;

    if (!isControlled) {
      setInternalExpandedId(newId);
    }
    
    if (onExpandedRowChange) {
      onExpandedRowChange(newId);
    }

    if (onExpand) {
      onExpand(item, !isExpanded);
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
              {expandable && <th style={{ width: "40px" }}></th>}
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
                <td colSpan={columns.length + (expandable ? 1 : 0)} className="empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                const isExpanded = currentExpandedId === id;

                return (
                  <>
                    <tr 
                      key={id} 
                      className={isExpanded ? "expanded" : ""}
                    >
                      {expandable && (
                        <td>
                          {(isExpandable ? isExpandable(item) : true) && (
                            <button
                              className="expand-btn"
                              onClick={() => toggleExpand(item)}
                              title={isExpanded ? "طي" : "توسيع"}
                            >
                               <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={16} />
                            </button>
                          )}
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
                    {isExpanded && (
                      <tr className="expanded-row-content">
                        <td colSpan={columns.length + 1}>
                          <div className="expanded-content-wrapper">
                            {renderExpandedRow(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
