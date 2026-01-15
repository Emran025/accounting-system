"use client";

import { ReactNode } from "react";
import { getCurrentDateTime, getRoleBadgeText, getRoleBadgeClass } from "@/lib/utils";
import { User } from "@/lib/auth";

interface PageHeaderProps {
  title: string;
  user?: User | null;
  showDate?: boolean;
  actions?: ReactNode;
  searchInput?: ReactNode;
}

export function PageHeader({
  title,
  user,
  showDate = true,
  actions,
  searchInput,
}: PageHeaderProps) {

  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {showDate && (
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {getCurrentDateTime()}
          </span>
        )}
      </div>

      <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
        {searchInput && <div style={{ flex: 1 }}>{searchInput}</div>}
        
        {actions}

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginInlineStart: "auto" }}>
            <span style={{ fontWeight: 600 }}>{user.full_name}</span>
            <span className={`badge ${getRoleBadgeClass(user.role)}`}>
              {getRoleBadgeText(user.role)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

