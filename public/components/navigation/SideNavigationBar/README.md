# SideNavigationBar — UX Foundation Document

> **Scope**: This document defines the complete external user experience specification for the **SideNavigationBar**, the primary structural navigation component of the system shell. It replaces the current sidebar implementation and is intended for deployment into the testing environment first.
>
> **Canonical Name**: `SideNavigationBar`  
> **Shell Level**: Global / External  
> **Persistence**: Semi-persistent (collapsible, never hidden)

---

## Table of Contents

1. [Philosophy & Core Identity](#1-philosophy--core-identity)
2. [Structural Architecture](#2-structural-architecture)
3. [Section Definitions](#3-section-definitions)
4. [Interaction Model](#4-interaction-model)
5. [Visual Discipline](#5-visual-discipline)
6. [Icon & Color Identity System](#6-icon--color-identity-system)
7. [Collapse & Expand Behavior](#7-collapse--expand-behavior)
8. [Horizontal Resizability](#8-horizontal-resizability)
9. [Folder Opening & Card Projection](#9-folder-opening--card-projection)
10. [Recently Opened Screens](#10-recently-opened-screens)
11. [Data & Storage Strategy](#11-data--storage-strategy)
12. [Font Size Constraint (sm / md / lg)](#12-font-size-constraint-sm--md--lg)
13. [Keyboard Shortcut Templates](#13-keyboard-shortcut-templates)
14. [Relationship with Other Shell Bars](#14-relationship-with-other-shell-bars)
15. [Design Rationale & Strategic Justification](#15-design-rationale--strategic-justification)
16. [Current Implementation Inventory](#16-current-implementation-inventory)
17. [Implementation Roadmap for Testing Environment](#17-implementation-roadmap-for-testing-environment)
18. [Appendix: Naming Conventions](#18-appendix-naming-conventions)

---

## 1. Philosophy & Core Identity

The SideNavigationBar is the **structural backbone** of the entire navigation experience. However, it is not rigidly permanent — it is *collapsible without breaking the experience*. Even in its collapsed state, the sidebar remains present as a spatial anchor and provides a one-click re-expansion, preserving the user's sense of place within the system.

### File System Metaphor

The sidebar's architecture is built upon a **direct file system analogy**:

| Concept        | System Equivalent |
|----------------|-------------------|
| **Screens**    | Files             |
| **Modules**    | Folders           |
| **Sections**   | Drive Partitions  |

This metaphor is a strategic decision of significant importance for horizontally-expanding systems. SAP historically suffers from module fragmentation and the difficulty of mentally connecting disparate subsystems. This file-system model creates a **unified mental map** that allows the system to grow without becoming a labyrinth.

---

## 2. Structural Architecture

The SideNavigationBar is divided into **three always-collapsible sections**. This division is not decorative — it reflects **distinct cognitive states** of the user:

| Section          | Cognitive State                     | Purpose                                                         |
|------------------|-------------------------------------|-----------------------------------------------------------------|
| **Opened**       | "What I am working on right now"    | Displays recently opened and currently active screens           |
| **System Menu**  | "What constitutes the system"       | The full hierarchical tree of modules (folders) and screens     |
| **Favorites**    | "What I need to access quickly"     | User-pinned screens for immediate access                        |

### Section Collapsibility

- Each section header acts as a **toggle**. Clicking it collapses or expands the section's content.
- The collapsed/expanded state of each section is **persisted as a user behavioral preference** (stored client-side).
- All three sections are visible by default on first use; the user customizes their view over time.

---

## 3. Section Definitions

### 3.1 Opened Section

Displays screens the user has accessed during the current session or recently. This serves as an alternative to redundant navigation buttons:

- **Purpose**: Reduces repetitive round-trips to the System Menu tree for power users who cycle between a limited number of screens.
- **Behavior**: Screens appear in reverse-chronological order of access. Clicking a screen navigates to it directly.
- **Capacity**: Displays the last *N* screens (configurable, default: 10). Older entries roll off silently.
- **Relationship to tree**: Does not replace or diminish the System Menu. New users rely on the tree; experienced users shift to Opened and Favorites.

### 3.2 System Menu Section

The full hierarchical navigation tree. Modules (folders) contain screens (files), potentially nested to multiple levels.

- **Structure**: Mirrors the `navigationGroups` configuration — each group is a top-level folder containing its child screen links.
- **Expansion behavior**: Clicking a folder toggles its child items. Only one branch may be expanded at a time (accordion behavior), or multiple — this is a **configurable preference**.
- **Active state**: The currently open screen is visually distinguished by a subtle color depth shift (see [Visual Discipline](#5-visual-discipline)).
- **Permission filtering**: Screens and folders the user does not have permission to access are **not rendered** at all (not grayed out, not locked — simply absent).

### 3.3 Favorites Section

User-curated list of pinned screens for quick access.

- **Adding to favorites**: Right-click context menu on any screen item → "Add to Favorites", or a dedicated star/pin icon on hover.
- **Removing from favorites**: Same context menu → "Remove from Favorites".
- **Ordering**: Favorites are displayed in the order the user added them. Drag-to-reorder is a future enhancement.
- **Storage**: Stored client-side as a behavioral preference (see [Data & Storage Strategy](#11-data--storage-strategy)).

---

## 4. Interaction Model

### 4.1 Single Click on a Screen (File)

Navigates the user to that screen. If the sidebar is expanded, it may optionally **auto-collapse** (configurable preference) to maximize workspace area, while keeping the expand button clearly visible.

### 4.2 Single Click on a Module (Folder)

Toggles the folder open/closed in the tree, revealing or hiding its child screens. This is **tree-level navigation only** — it does not navigate the main workspace.

### 4.3 Long-Press on a Module (Folder)

Triggers a **Card Projection** into the main workspace area (see [Folder Opening & Card Projection](#9-folder-opening--card-projection)). The folder's contents are presented as descriptive cards rather than a flat list, transforming the folder from a "transit gateway" into an "explanatory space."

### 4.4 Right-Click Context Menu

Available on both folders and screens:

|    Item               | Available On       | Action                             |
|-----------------------|--------------------|------------------------------------|
| Open                  | Screens            | Navigate to the screen             |
| Open in New Tab       | Screens            | Open in browser tab (if supported) |
| Add to Favorites      | Screens & Folders  | Pin to Favorites section           |
| Remove from Favorites | Favorites items    | Unpin from Favorites               |
| Collapse All          | Folders            | Collapse all expanded tree nodes   |
| Expand All            | Folders            | Expand all child nodes             |

---

## 5. Visual Discipline

The visual language of the SideNavigationBar follows strict rules to maintain consistency across thousands of screens:

### 5.1 No Borders, No Border-Radius

- **No borders** are applied to the sidebar, its items, or selected/active elements.
- **No border-radius** on sidebar elements.
- Interaction states (hover, active, selected) are expressed exclusively through **color, transparency, and shadow**.

### 5.2 Color-Depth Differentiation

When a folder is open, its children are visually distinguished from sibling folders and the parent through a **very subtle color gradient shift**:

- The open folder has a slightly deeper background tone than its siblings.
- Child items within the open folder have a marginally lighter tone than the folder header.
- **No explicit indicators** (arrows, dots, lines) are used — differentiation is achieved purely through **color depth and spatial indentation**.

### 5.3 Typography

- **Font**: Unified across all shell bars. The same font family and weight is used consistently.
- **Font size**: Small and consistent (`--sidebar-font-size`), matching other shell bar text sizes.
- **Exception**: The current screen name (displayed in the TopGlobalBar, not the sidebar) uses a larger font.

### 5.4 Item Height Rhythm

- The height of each item in the SideNavigationBar **matches the height of items in other shell bars** (TopGlobalBar, SearchNavigationBar, StatusNotificationBar).
- This creates a **uniform visual rhythm** — a consistent beat across the entire shell that reduces cognitive noise.

### 5.5 Workspace Background

- The main workspace background is calm and muted.
- A floating, indirect system logo may appear as a subtle watermark — never dominant, never distracting.

---

## 6. Icon & Color Identity System

One of the critical challenges in large-scale enterprise systems is **visual homogeneity** — when hundreds of screens and folders blur together into an indistinguishable mass, cognitive load increases and learning slows.

### 6.1 Core Principle

**Every screen and every folder has its own unique, expressive icon**, designed within a unified icon library and directly tied to the identity and function of that screen or folder.

### 6.2 Icons as Cognitive Tools

Icons are **not decoration** — they are perceptual tools. Combined with deliberate, subtle color coding, each folder or screen forms a **fixed visual fingerprint** in the user's memory.

This approach is inspired by Visual Studio Code's Extensions view, where color and icon become part of **visual memory**, not mere UI ornamentation.

### 6.3 Color Rules for Identity

The coloring system is governed by strict constraints:

| Rule | Description |
|------|-------------|
| **No state colors for identity** | Colors are not used to represent state (hover, active, error) in identity context. They change only during interaction. |
| **No conflict with system states** | Identity colors must never overlap with state colors (success green, warning amber, error red). |
| **Consistency across contexts** | The icon and color for a screen or folder remain **identical** wherever they appear: in the sidebar tree, in card projections, in search results, in the Opened section, and in breadcrumbs. |

### 6.4 Color Palette per Module

Each navigation group (module/folder) maintains its own gradient palette (currently defined in `NavigationCard.tsx`'s `iconGradients`). These must be carried forward into the SideNavigationBar with subtle tinting:

| Module | Primary Color | Use |
|--------|--------------|-----|
| System & Admin | `#3b82f6` → `#1d4ed8` | Blue |
| Sales & CRM | `#10b981` → `#059669` | Emerald |
| Purchases | `#10b981` → `#059669` | Emerald variant |
| Finance | `#f59e0b` → `#d97706` | Amber |
| HR | `#8b5cf6` → `#7c3aed` | Violet |
| Inventory | `#06b6d4` → `#0891b2` | Cyan |
| Manufacturing | `#64748b` → `#475569` | Slate |
| Projects | `#8b5cf6` → `#7c3aed` | Violet variant |

In the sidebar, these colors appear as **very subtle tinting** on the icon or a thin colored accent — never as full backgrounds that would create visual noise.

---

## 7. Collapse & Expand Behavior

### 7.1 Unified Collapse Behavior

The collapse/expand mechanism is **unified across the entire system** — every collapsible element behaves identically, reducing the user's learning curve.

### 7.2 Collapse Modes

|         Mode              |                    Description                     |
|---------------------------|----------------------------------------------------|
|   **Expanded (default)**  | Full sidebar with icons + labels + section headers |
| **Collapsed (icon-only)** | Narrow strip showing only icons. Hover on an icon reveals a tooltip with the label. |

### 7.3 Persistence

- The collapsed/expanded state is **saved as a user preference** (client-side `localStorage` or equivalent).
- On desktop: The preference is restored on every session.
- On mobile: The sidebar defaults to hidden with a hamburger toggle. Mobile state does not affect the desktop preference.

### 7.4 Auto-Collapse on Screen Navigation

When the user navigates to a **screen** (not a folder), the sidebar may **auto-collapse** to preserve workspace area. This behavior is:

- **Configurable**: The user can enable/disable auto-collapse in their preferences.
- **Non-destructive**: The expand button remains clearly visible at all times.
- **Context-aware**: Even while collapsed, the sidebar continues to indicate the user's current location through icon highlighting.

### 7.5 Relationship to Other Bars

All other shell bars (TopGlobalBar, SearchNavigationBar, StatusNotificationBar) are **fixed and non-collapsible**. The SideNavigationBar is the **only bar that can collapse**. This is intentional:

- **Historical lesson from SAP**: Completely hiding the sidebar in certain contexts led to user isolation — inability to backtrack or navigate quickly. This design corrects that mistake.
- **Functional rationale**: The tree can grow large and reduce content space, especially on data-dense screens. Collapsing solves this without severing the user's sense of position.
- **Even collapsed, the sidebar remains present** as a spatial reference and always-available expand trigger.

---

## 8. Horizontal Resizability

### 8.1 Width Adjustment

The sidebar width is **horizontally resizable by the user**, similar to SAP's approach:

- A **reserved default space** is allocated for the sidebar, with a draggable edge handle.
- The user can widen the sidebar to accommodate long module/screen names without breaking the layout.
- A **minimum width** constraint prevents the sidebar from becoming too narrow to be functional.
- A **maximum width** constraint prevents the sidebar from consuming too much workspace.

### 8.2 Width Persistence

The user's preferred width is stored as a behavioral preference and restored across sessions.

---

## 9. Folder Opening & Card Projection

### 9.1 Concept

When a folder (module) is opened via **long-press** from the sidebar, its contents are not displayed as a flat table in the workspace. Instead, they are projected as **descriptive cards** within the workspace area.

### 9.2 Card Content

Each card represents a screen or sub-folder and contains:

|     Element      |                        Description                          |
|------------------|-------------------------------------------------------------|
|     **Icon**     | The screen/folder's identity icon (consistent with sidebar) |
|     **Name**     | The screen/folder label                                     |
|  **Description** | A brief explanation of the screen's purpose                 |
| **Color header** | The module's identity gradient (from the palette)           |
|    **Action**    | A clear CTA to navigate to the screen                       |

### 9.3 Rationale

This decision is foundational because it shifts the user from **"data management"** mode to **"task management"** mode:

- **New users** learn visually — they see what each screen does before entering it, avoiding the labyrinth effect.
- **Expert users** bypass this entirely via Favorites, Recently Opened, or keyboard shortcuts.
- The system **does not force a single behavior** but maintains a consistent language and structure.

### 9.4 Sequential Navigation

Even when cards are displayed in the workspace, the sidebar **retains its full tree navigation** — the user can continue navigating sequentially from the sidebar without interruption.

---

## 10. Recently Opened Screens

### 10.1 Purpose

The "Opened" section (see [Section 3.1](#31-opened-section)) is not merely a convenience feature — it is a **direct solution to the concern of repetitive navigation**. Instead of flooding the interface with additional navigation buttons, the system relies on a **natural behavior pattern** that reflects actual usage.

### 10.2 Behavior

- Screens are listed in **reverse-chronological order** of access.
- The list has a **configurable maximum capacity** (default: 10 items).
- Duplicate entries are **consolidated** — revisiting a screen moves it to the top rather than creating a new entry.
- The list is **session-scoped** by default but can optionally persist across sessions.

---

## 11. Data & Storage Strategy

### 11.1 Two-Tier Data Separation

One of the most significant technical decisions is the **clear separation between two types of data**:

| Data Type | Examples | Storage | Update Frequency |
|-----------|----------|---------|-----------------|
| **Sovereign Data** | Permissions, access rights, what the user is allowed to see | Server-side, centrally managed | On login, or periodic refresh (e.g., hourly) |
| **Behavioral Data** | Shortcuts, shortcut templates, recently opened screens, favorites, font size, collapse preferences, sidebar width | Client-side (`localStorage` / settings files) | Immediate, on user action |

### 11.2 Rationale

- **Performance**: The current system queries permissions on every screen open, causing noticeable delay. Sovereign data should be fetched once and cached.
- **Security**: Behavioral preferences do not grant new permissions — they only create shortcuts to already-permitted paths. Storing them locally is safe.
- **Responsiveness**: The user gets an **instant experience** without waiting for server roundtrips for every preference read.
- **Inspiration**: This model is inspired by VS Code's approach, applied cautiously to suit an enterprise ERP environment within the Next.js framework.

### 11.3 Zustand Integration

The current codebase already uses `useUIStore` (Zustand-based) for sidebar state. The new SideNavigationBar should extend this store with:

```typescript
interface SideNavigationState {
  // Collapse state
  sideNavCollapsed: boolean;
  setSideNavCollapsed: (collapsed: boolean) => void;

  // Section collapse states
  openedSectionCollapsed: boolean;
  systemMenuSectionCollapsed: boolean;
  favoritesSectionCollapsed: boolean;
  toggleSection: (section: 'opened' | 'systemMenu' | 'favorites') => void;

  // Sidebar width
  sideNavWidth: number;
  setSideNavWidth: (width: number) => void;

  // Recently opened screens
  recentScreens: string[];
  addRecentScreen: (path: string) => void;
  clearRecentScreens: () => void;

  // Favorites
  favoriteScreens: string[];
  addFavorite: (path: string) => void;
  removeFavorite: (path: string) => void;

  // Auto-collapse preference
  autoCollapseOnNavigate: boolean;
  setAutoCollapseOnNavigate: (enabled: boolean) => void;
}
```

---

## 12. Font Size Constraint (sm / md / lg)

### 12.1 Problem

A common concern in enterprise systems is that supporting visual comfort may lead to element bloating, layout breakage, or loss of information density.

### 12.2 Solution: Three Controlled Tiers

The system offers **exactly three font size presets** — no more, no less:

| Tier |      Label       |                   Use Case                     |
|------|------------------|------------------------------------------------|
| `sm` |      Small       | Maximum information density, experienced users |
| `md` | Medium (default) | Balanced readability and density               |
| `lg` |       Large      | Visual comfort, accessibility                  |

### 12.3 Constraints

- The three tiers preserve the **relative proportions** between all elements — scaling is uniform, not per-element.
- This prevents individual drift that would lead to "broken" interfaces.
- The system **acknowledges human differences** but does not allow them to create design chaos.
- Applies consistently across all shell bars and page content.

---

## 13. Keyboard Shortcut Templates

### 13.1 Problem

Keyboard shortcuts can become a cognitive burden, especially for new users. Unbounded customization leads to confusion.

### 13.2 Solution: Named Practice Templates

Instead of open-ended individual shortcuts, the system uses **named shortcut templates** (presets):

- Each template represents a familiar usage pattern from other platforms (e.g., "VS Code-style", "SAP-style", "Standard Office").
- The user selects a template and is immediately productive with familiar bindings.
- **Expert customization** is still available: users can modify individual bindings within a template, subject to conflict detection.

### 13.3 Advanced Shortcut Management

A dedicated settings screen (opened as a full navigation or new window, similar to VS Code's Extensions/Settings panels) allows:

- **Recording shortcuts** by physically pressing the key combination.
- **Manual entry** of shortcut combinations.
- **Search** across all shortcuts.
- **Conflict detection and resolution**.
- **Reset to template defaults**.

---

## 14. Relationship with Other Shell Bars

The SideNavigationBar is one of four global shell-level bars. For completeness, the other three are briefly described here:

|        Bar     |      Canonical Name     | Persistence | Role |
|----------------|-------------------------|-------------|------|
| **Side bar**   |    `SideNavigationBar`  | Semi-persistent (collapsible) | Structural navigation: tree, favorites, recently opened |
| **Top bar**    |     `TopGlobalBar`      | Permanent, fixed | System ceiling: global menus, current screen name, user account, session timer |
| **Search bar** |  `SearchNavigationBar`  | Permanent, fixed | Breadcrumb path, multi-layer search, back/forward/up navigation, sidebar toggle |
| **Bottom bar** | `StatusNotificationBar` | Permanent, fixed | System status, operation results, notifications |

### Key Integration Points

- The **SearchNavigationBar** contains the toggle button for the SideNavigationBar, so the user always has access to expand/collapse the sidebar regardless of context.
- The **TopGlobalBar** displays the current screen name in a larger font, centrally positioned — serving as the user's mental anchor. The sidebar reinforces this by highlighting the corresponding tree item.
- The **StatusNotificationBar** displays operation results. The sidebar does not duplicate this information.

---

## 15. Design Rationale & Strategic Justification

### 15.1 Why the File System Metaphor?

The file-system metaphor (screens = files, modules = folders) is a **strategically critical decision** for systems that expand horizontally and functionally. SAP today suffers from module sprawl and the difficulty of mentally connecting its subsystems. Adopting this model creates a **unified cognitive map** that allows the system to scale without becoming a maze.

### 15.2 Why Semi-Persistence?

The decision to make the sidebar collapsible — but never fully hidden — distinguishes mature systems from indecisive ones:

- **SAP's historical approach**: Forced permanence (sidebar always visible), or sometimes complete hiding — both extremes have proven problematic.
- **Modern apps' approach**: Often excessive hiding, which removes spatial context.
- **This system's middle ground**: Collapse with instant re-expansion, with preserved preferences. This reflects a nuanced understanding of user diversity — from administrative staff to operational users to power users.

### 15.3 Why Invest in Shortcuts, Multi-Layer Search, and Interactive Paths?

These tools are unimportant in small systems. They become **critical** when the system exceeds thousands of screens. What this design does is **prepare the system early for the "post-complexity" phase** — a phase that most legacy ERP systems were never built for.

### 15.4 Why VS Code as an Inspiration?

Adopting the philosophy of environments like Visual Studio Code is not about mimicking their appearance. It is about borrowing their ability to **keep users in a focused state for hours** — a historical weakness of most classical ERP systems.

---

## 16. Current Implementation Inventory

### 16.1 Components to be Replaced

| Component | File | Role | Status |
|-----------|------|------|--------|
| `Sidebar` | `components/layout/Sidebar.tsx` | Main layout sidebar with link-based nav | **Replace** |
| `ModuleSidebar` | `components/layout/ModuleSidebar.tsx` | Module-level sidebar with permission filtering | **Replace** |
| `NavigationSidebar` | `components/navigation/NavigationSidebar.tsx` | Navigation page group selector | **Replace** |
| `NavigationCard` | `components/navigation/NavigationCard.tsx` | Card component for folder projection | **Reuse & Enhance** |
| `NavigationGrid` | `components/navigation/NavigationGrid.tsx` | Grid layout for projected cards | **Reuse & Enhance** |

### 16.2 Existing State Management

- `useUIStore` (Zustand): Currently manages `sidebarCollapsed` and `moduleSidebarCollapsed`.
- `useAuthStore` (Zustand): Manages `permissions`, `user`, `logout`.
- `localStorage`: Used for `moduleSidebarCollapsed` flag (legacy, to be consolidated into Zustand).

### 16.3 Layout Components Affected

- `MainLayout.tsx`: Uses `Sidebar` component, manages content area shifting.
- Both share the pattern: `<div className="main-container"> <Sidebar/> <main className="content"> {children} </main> </div>`

### 16.4 CSS Impact Areas (in `globals.css`)

Current sidebar styles that will be superseded:
- `.sidebar` and variants (lines ~104–260)
- `.sidebar-toggle-btn` and variants (lines ~2288–2340)
- `.sidebar-overlay` (lines ~2422–2440)
- `.sidebar-nav-btn` and variants (lines ~3201–3320)
- Mobile responsive overrides (lines ~2484–2540)

---

## 17. Implementation Roadmap for Testing Environment

### Phase 1: Foundation (New Component Shell)

1. Create `SideNavigationBar.tsx` in `components/navigation/`.
2. Extend `useUIStore` with the new state interface (Section 11.3).
3. Implement the three-section structure (Opened, System Menu, Favorites).
4. Apply the visual discipline rules: no borders, no radius, color-depth differentiation.
5. Wire up to `navigation-config.ts` for tree data.
6. Permission filtering via `canAccess` from `lib/auth.ts`.

### Phase 2: Interaction Layer

7. Implement section collapse/expand with persistence.
8. Implement sidebar collapse/expand (icon-only mode).
9. Implement auto-collapse on screen navigation (configurable).
10. Add right-click context menu.
11. Implement Recently Opened tracking.
12. Implement Favorites add/remove.

### Phase 3: Advanced Features

13. Horizontal resizability with drag handle.
14. Long-press folder → Card Projection into workspace.
15. Keyboard shortcut integration.
16. Font size tier switching (sm/md/lg).

### Phase 4: Layout Integration

17. Create a new `TestLayout.tsx` that uses `SideNavigationBar` instead of the old `Sidebar`/`ModuleSidebar`.
18. Wire up test routes to `TestLayout`.
19. Ensure the SearchNavigationBar toggle button controls the new SideNavigationBar.
20. Validate responsive behavior (mobile overlay, desktop collapse).

### Phase 5: Polish & Migration

21. Visual regression testing.
22. Performance profiling (no per-screen permission queries).
23. User preference migration from old `localStorage` keys.
24. Documentation update.
25. Gradual rollout: test environment → staging → production.

---

## 18. Appendix: Naming Conventions

Given the possibility of **page-level bars** (internal bars within individual screens) in future phases, clear and unambiguous naming for the global shell-level bars is essential. The following names are adopted as **official terminology** in all documentation, code, and architectural discussions:

| Canonical Name | Description |
|----------------|-------------|
| `SideNavigationBar` | The primary sidebar responsible for system structure (folders, screens, favorites, recently opened). |
| `TopGlobalBar` | The permanent top bar representing the system ceiling, containing global menus, current screen name, and session information. |
| `SearchNavigationBar` | The bar below the top bar, housing the breadcrumb path, multi-layer search, and navigation controls. |
| `StatusNotificationBar` | The permanent bottom bar dedicated to system status and notifications. |

---

> **Document Status**: Draft — Comprehensive Foundation  
> **Intended Audience**: UX designers, frontend engineers, architects  
> **Next Step**: Implementation in testing environment (Phase 1–5 above)  
> **Last Updated**: 2026-02-24
