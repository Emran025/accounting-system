"use client";

import { ReactNode } from "react";
import { Icon, IconName } from "@/lib/icons";

export interface ActionBarAction {
  label: string;
  icon?: IconName;
  onClick: () => void;
  variant?: "primary" | "secondary" | "warning" | "danger" | "success" | "info";
}

interface FloatingActionBarProps {
  isVisible: boolean;
  message: ReactNode;
  actions: ActionBarAction[];
}

export function FloatingActionTableBar({ isVisible, message, actions }: FloatingActionBarProps) {
  if (!isVisible) return null;

  return (
    <div className="selection-actions animate-fade-in">
      <div className="selection-summary">
        <Icon name="check-circle" size={18} />
        <span className="summary-text">{message}</span>
      </div>
      <div className="action-buttons-group">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`btn-action btn-sm ${action.variant || "primary"}`}
            onClick={action.onClick}
          >
            {action.icon && <Icon name={action.icon} size={16} />}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
