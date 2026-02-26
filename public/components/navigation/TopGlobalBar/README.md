# TopGlobalBar — UX Foundation Document

> **Scope**: This document defines the complete external user experience specification for the **TopGlobalBar**, representing the "system ceiling" and containing global context, primary brand anchors, and session information.
>
> **Canonical Name**: `TopGlobalBar`  
> **Shell Level**: Global / External  
> **Persistence**: Permanent, fixed

---

## Table of Contents

1. [Philosophy & Core Identity](#1-philosophy--core-identity)
2. [Structural Architecture](#2-structural-architecture)
3. [Component Definitions](#3-component-definitions)
4. [Visual Discipline](#4-visual-discipline)
5. [Relationship with Other Shell Bars](#5-relationship-with-other-shell-bars)

---

## 1. Philosophy & Core Identity

The **TopGlobalBar** operates as the permanent highest layer of the user interface. It is the "system ceiling." It anchors the user globally, providing the most critical contextual answers: *What system am I in? What screen am I on? Who am I logged in as?* 

It differs from other navigation elements because it rarely changes state during normal operational workflows, serving instead as a steadfast orienting reference.

---

## 2. Structural Architecture

The Bar is structurally divided into logical groupings:

| Grouping | Component | Purpose |
|----------|-----------|---------|
| **System Menus & Branding** | `GlobalMenus` | Houses system-level dropdown menus (File, Edit, View, Help) and occasional branding elements. |
| **Contextual Anchor** | `GlobalTitle` / Title Area | Displays the prominent name of the currently active screen or module. |
| **Session & User Data** | `GlobalMeta` | Displays user profile info, session timers, branch/company context, and global settings toggles. |

---

## 3. Component Definitions

### 3.1 GlobalMenus

Mirrors traditional desktop application "File/Edit/View" paradigms, scaled for a modern web-based enterprise system.
- Provides access to highest-level system settings, layout resets, and help documentation.
- Serves as the ultimate fallback for navigation if contextual paths fail.

### 3.2 GlobalTitle (or Main Screen Header)

- **Behavior**: Dynamically updates to reflect the active screen in the workspace.
- **Rationale**: While breadcrumbs (in `SearchNavigationBar`) show the path, this element answers "Where am I right now?" via a prominent visual anchor.

### 3.3 GlobalMeta

Provides critical meta-information regarding the current environment and authentication state.
- **User Profile**: Account settings, roles, logout.
- **Context Indicators**: Active financial year, active branch, or assigned entity, ensuring the user is never performing data entry in the wrong administrative context.

---

## 4. Visual Discipline

- **Prominence**: Uses subtle contrast differentiating it from the application canvas. 
- **Typography**: The current screen name uses a noticeably larger font size compared to the standard `--sidebar-font-size`, ensuring it reads as the page's prominent title equivalent within the shell hierarchy.
- **Consistency**: Standardized height that aligns seamlessly with the fixed metrics of the entire screen layout grid.

---

## 5. Relationship with Other Shell Bars

- **SideNavigationBar**: The TopGlobalBar is unaffected by the sidebar's collapse state. It spans the full width of the screen.
- **SearchNavigationBar**: Sits immediately below. The TopGlobalBar establishes the current screen identity; the search bar details the path to it.
- **StatusNotificationBar**: The TopGlobalBar handles user input/meta-state (Top), whereas the Status bar handles system output state (Bottom).

---

> **Document Status**: Draft — Comprehensive Foundation  
> **Intended Audience**: UX designers, frontend engineers, architects 
