# SearchNavigationBar — UX Foundation Document

> **Scope**: This document defines the complete external user experience specification for the **SearchNavigationBar**, the secondary structural navigation component housing breadcrumbs, global search, and shell-level navigation controls.
>
> **Canonical Name**: `SearchNavigationBar`  
> **Shell Level**: Global / External  
> **Persistence**: Permanent, fixed

---

## Table of Contents

1. [Philosophy & Core Identity](#1-philosophy--core-identity)
2. [Structural Architecture](#2-structural-architecture)
3. [Component Definitions](#3-component-definitions)
4. [Interaction Model](#4-interaction-model)
5. [Visual Discipline](#5-visual-discipline)
6. [Relationship with Other Shell Bars](#6-relationship-with-other-shell-bars)

---

## 1. Philosophy & Core Identity

The **SearchNavigationBar** acts as the primary tool for spatial orientation and rapid context switching within the system. While the `SideNavigationBar` provides the map, the `SearchNavigationBar` shows the user exactly where they are on that map (via breadcrumbs) and provides the fastest route to anywhere else (via global search).

It sits below the `TopGlobalBar` and provides the immediate context for the workspace below it. It is an immutable structural element spanning the full width of the viewable area.

---

## 2. Structural Architecture

The `SearchNavigationBar` is divided into discrete functional zones, managing path visualization, navigation controls, and powerful search capabilities:

| Functional Zone | Component | Purpose |
|-----------------|-----------|---------|
| **Path tracking** | `BreadcrumbTrail` | Visualizes the user's current nested location within the system hierarchy. |
| **Search capability** | `SearchableSelect` / SearchInput | Multi-layer search (commands, screens, data) enabling non-linear navigation. |
| **Controls** | `NavigationControls` | Houses actions like sidebar toggle, backwards/forwards navigation, and up-level shifts. |

---

## 3. Component Definitions

### 3.1 BreadcrumbTrail

Provides a hierarchical trail reflecting the user's current location relative to the system's root structure.
- **Behavior**: Each node in the trail represents a folder/module or screen. Users can click any node to traverse upward in the hierarchy.
- **Visuals**: Uses subtle icon indicators matching the `SideNavigationBar` identity system to reinforce visual memory.

### 3.2 NavigationControls

Provides navigational commands.
- **Sidebar Toggle**: Always available. Toggles the `SideNavigationBar` between expanded and collapsed states.
- **History Navigation**: "Back" and "Forward" buttons matching standard browser experiences, contextualized for the SAP-aligned environment.
- **Global Context**: May include title indicators or global context switches if appropriately integrated.

### 3.3 Search System

The search implementation is an omni-search:
- Captures screens, modules, and optionally data entities (e.g., specific invoices or employees).
- Enhances workflow speed for expert users who bypass the tree navigation entirely.

---

## 4. Interaction Model

- **Clicking Breadcrumbs**: Triggers lateral or upward navigation in the workspace.
- **Search Focus**: Activating search might overlay a command palette. Search results feature the same color coding and icons as the `SideNavigationBar` for rapid visual recognition.
- **Sidebar Toggle**: Instantly animates the `SideNavigationBar` without refreshing the page context. 

---

## 5. Visual Discipline

Consistent with other global shell bars:
- **No borders or border-radius** on the bar itself. Interaction states rely on background dimming or highlighted text.
- **Height Rhythm**: Matches the fixed metric established across the shell, ensuring no vertical drift.
- **Typography constraints**: Relies on specific font-size tokens (`sm`, `md`, `lg`) responding consistently to the user's visual preferences.

---

## 6. Relationship with Other Shell Bars

- **SideNavigationBar**: The `SearchNavigationBar` contains its toggle button.
- **TopGlobalBar**: Sits immediately below it. While the top bar indicates the "current active screen name", the search bar indicates the path taken to reach it.
- **StatusNotificationBar**: Unrelated; resides at the bottom.

---

> **Document Status**: Draft — Comprehensive Foundation  
> **Intended Audience**: UX designers, frontend engineers, architects 
