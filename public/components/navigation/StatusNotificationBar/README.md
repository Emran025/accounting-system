# StatusNotificationBar — UX Foundation Document

> **Scope**: This document defines the complete external user experience specification for the **StatusNotificationBar**, the permanent system floor responsible for operations feedback, environment status, and non-intrusive notifications.
>
> **Canonical Name**: `StatusNotificationBar`  
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

The **StatusNotificationBar** represents the "system floor." Borrowing deeply from enterprise desktop applications and IDEs (like VS Code), it is designed to communicate system state and operation results *without interrupting the user's workflow*.

It prevents the need for disruptive modal dialogs or floating toast notifications that block the workspace by providing a dedicated, permanent zone for reporting success, failure, background processing, and environment details.

---

## 2. Structural Architecture

The bar maintains a rigid, horizontal strip format at the very bottom of the viewport, segmented logically:

| Zone | Component | Purpose |
|------|-----------|---------|
| **Feedback Area** | `StatusIndicator` | Shows transient messages (e.g., "Saved successfully", "Validation Error"). |
| **System Info** | `EnvironmentIndicator` | Shows static technical context (e.g., "Testing Environment", "API connected"). |
| **Background Tasks**| (Future Implementation) | Displays progress of long-running async tasks (e.g., bulk payroll processing). |

---

## 3. Component Definitions

### 3.1 StatusIndicator

The primary vehicle for non-blocking feedback.
- **Behavior**: Updates dynamically upon operation completion. Reverts to a "Ready" state after a short period.
- **Color Coding**: Utilizes strict semantic colors (Success = Green, Warning = Amber, Error = Red) only for the duration of the message, ensuring errors are highly visible but do not visually clutter the interface permanently.

### 3.2 EnvironmentIndicator

A permanently visible badge or text element clarifying the current server or database target.
- **Rationale**: In complex enterprise setups, users (and testers) must immediately know if they are connected to Production vs. Staging, preventing catastrophic accidental data modifications.

---

## 4. Interaction Model

- **Click to Expand**: In the event of a complex error, clicking an error message in the status bar might open a drawer or log view detailing the issue, rather than popping a blocking modal.
- **Hover States**: Hovering over truncated text reveals the full message or technical stack trace if permitted by user role.

---

## 5. Visual Discipline

- **Height Constraint**: The bar is deliberately very thin to maximize workspace real estate.
- **Typography constraints**: Uses the smallest legible font size (`sm` tier mapping) uniformly, recognizing its role as secondary/tertiary information.
- **No overlapping layers**: Floating "Toast" notifications should eventually be deprecated in favor of this bar to prevent hiding layout components.
- **No borders or border-radius** on the bar itself, maintaining the uniform design language of the shell.

---

## 6. Relationship with Other Shell Bars

- **SideNavigationBar**: The StatusNotificationBar serves as the footer and spans either the full width of the screen or the remaining space next to the sidebar.
- **SearchNavigationBar**: Unrelated.
- **TopGlobalBar**: The Status bar shows system output (Bottom), mirroring the input/meta-state configuration (Top).

---

> **Document Status**: Draft — Comprehensive Foundation  
> **Intended Audience**: UX designers, frontend engineers, architects 
