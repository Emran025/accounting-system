"use client";

import { ReactNode } from "react";

interface NavigationGridProps {
  children: ReactNode;
}

export function NavigationGrid({ children }: NavigationGridProps) {
  return (
    <div className="nav-grid">
      {children}
    </div>
  );
}
