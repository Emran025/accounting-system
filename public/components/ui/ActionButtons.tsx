import React from 'react';
import { Icon, IconName } from '@/lib/icons';

export interface ActionButton {
    icon: IconName;
    title: string;
    onClick: () => void;
    variant?: 'view' | 'edit' | 'delete' | 'restore' | 'success' | 'warning' | 'primary' | 'secondary';
    disabled?: boolean;
    hidden?: boolean;
}

interface ActionButtonsProps {
    actions: ActionButton[];
    className?: string;
}

/**
 * Reusable ActionButtons component for table actions.
 * Consolidates the common pattern of icon-based action buttons.
 */
export function ActionButtons({ actions, className = "" }: ActionButtonsProps) {
    const visibleActions = actions.filter(action => !action.hidden);

    if (visibleActions.length === 0) return null;

    return (
        <div className={`action-buttons ${className}`}>
            {visibleActions.map((action, index) => (
                <button
                    key={index}
                    className={`icon-btn ${action.variant || 'view'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                    }}
                    title={action.title}
                    disabled={action.disabled}
                    type="button"
                >
                    <Icon name={action.icon} />
                </button>
            ))}
        </div>
    );
}
