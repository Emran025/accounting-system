"use client";

import { ReactNode } from "react";
import { Pagination } from "./Pagination";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  dataLabel?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
}

export function TableLoding<T>({
  columns = []
}: {
  columns: Column<T>[];
}) {
  return (
    <tr>
      <td colSpan={columns?.length}>
        <div className="empty-state" style={{ textAlign: "center" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem", marginBottom: "1rem" }}></i>
          <div>جاري التحميل...</div>
        </div>
      </td>
    </tr>
  );
};

export function TableEmpty<T>({
  emptyMessage = "لا توجد بيانات",
  columns = []
}: {
  emptyMessage: String,
  columns: Column<T>[];
}) {
  return <tr>
    <td colSpan={columns?.length}>
      <div className="empty-state" style={{ textAlign: "center" }}>
        <i className="fas fa-folder-open" style={{ fontSize: "2.5rem", marginBottom: "1rem", opacity: 0.5 }}></i>
        <div>{emptyMessage}</div>
      </div>
    </td>
  </tr>
};

export function TableHeader<T>({
  columns
}: {
  columns: Column<T>[];
}) {
  return <thead>
    <tr>
      {columns.map((col) => (
        <th key={col.key} className={col.className}>
          {col.header}
        </th>
      ))}
    </tr>
  </thead>
}
export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "لا توجد بيانات",
  pagination,
  isLoading = false,
}: TableProps<T>) {

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table>
          <TableHeader columns={columns} />
          <tbody>
            {isLoading ?
              <TableLoding columns={columns} />
              : data.length === 0 ? (
                <TableEmpty emptyMessage={emptyMessage} columns={columns} />
              ) : (
                data.map((item, index) => (
                  <tr key={keyExtractor(item, index)}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={col.className}
                        data-label={col.dataLabel || col.header}
                      >
                        {col.render
                          ? col.render(item, index)
                          : (item as Record<string, unknown>)[col.key] as ReactNode}
                      </td>
                    ))}
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}

