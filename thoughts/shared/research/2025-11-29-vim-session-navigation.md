---
date: 2025-11-29T09:11:17-08:00
researcher: Gemini CLI Agent
git_commit: 33d13ecb77c922a9c58860f6d204bdaa822a1f5f
branch: jakes-branch
repository: humanlayer
topic: "Implementing Vim-like Session Navigation (Ctrl+o/Ctrl+i)"
tags: [research, codebase, navigation, keybindings, ui]
status: complete
last_updated: 2025-11-29
last_updated_by: Gemini CLI Agent
---

# Research: Implementing Vim-like Session Navigation (Ctrl+o/Ctrl+i)

**Date**: 2025-11-29 09:11:17 PST
**Researcher**: Gemini CLI Agent
**Git Commit**: 33d13ecb77c922a9c58860f6d204bdaa822a1f5f
**Branch**: jakes-branch
**Repository**: humanlayer

## Research Question
Examine the codebase and determine what it would take to implement a Vim-like command that is initiated with `Ctrl+o` (back) and `Ctrl+i` (forward) to return the user to their last visited session.

## Summary
The `humanlayer-wui` application relies on standard browser-based history for navigation. Because opening a session typically creates a new entry in the browser's history stack, implementing `Ctrl+o` and `Ctrl+i` can be achieved by mapping these shortcuts to the browser's back and forward actions.

The most appropriate location to implement this is the global `Layout.tsx` component, which already handles application-wide keyboard shortcuts using `react-hotkeys-hook`.

## Detailed Findings

### 1. Input Handling & Keybindings
The application uses the `react-hotkeys-hook` library for managing keyboard shortcuts.
- **Location**: `humanlayer-wui/src/components/Layout.tsx`
- **Mechanism**: The `useHotkeys` hook is used to bind keys to callback functions.
- **Global Scope**: The `Layout` component wraps the entire application (defined in `router.tsx`), making it the ideal place for global navigation shortcuts.
- **Current Usage**: Existing shortcuts like `g>s` (Go to Settings) are already defined here.

### 2. Session Navigation & Routing
Navigation is handled by `react-router-dom` using a hash router (`createHashRouter`).
- **Location**: `humanlayer-wui/src/router.tsx`
- **Behavior**: Navigating to a session (e.g., clicking a session in the list) uses `navigate('/sessions/:id')`. By default, this **pushes** a new entry onto the history stack.
- **Reference**: `humanlayer-wui/src/pages/SessionTablePage.tsx` demonstrates this standard navigation pattern.
- **Implication**: Since visiting a session pushes to history, "Last Visited Session" effectively corresponds to "Back" in the browser history.

### 3. State Management
- **Store**: `humanlayer-wui/src/AppStore.ts` (Zustand) manages the *active* session state (`activeSessionDetail`).
- **History**: The store does **not** maintain a custom, persistent stack of visited session IDs. It relies on the browser's built-in history stack for navigation.
- **Jump List**: A true Vim "Jump List" records specific "jump locations". Since the app relies on browser history, `Ctrl+o` would act more like a standard "Back" button, which includes all navigation events (e.g., visiting Settings), not just session-to-session jumps.

## Implementation Plan

To implement this feature, you would modify `humanlayer-wui/src/components/Layout.tsx`.

### Code Reference: `humanlayer-wui/src/components/Layout.tsx`

You would need to add the following logic:

```typescript
import { useNavigate } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'

export const Layout = () => {
  const navigate = useNavigate()

  // ... existing hooks ...

  // Vim-like navigation
  // Ctrl+o: Go back in history (Jumplist Back)
  useHotkeys('ctrl+o', () => navigate(-1), {
    preventDefault: true,
    enableOnFormTags: false // Don't trigger while typing in inputs
  })

  // Ctrl+i: Go forward in history (Jumplist Forward)
  useHotkeys('ctrl+i', () => navigate(1), {
    preventDefault: true,
    enableOnFormTags: false
  })

  // ... rest of the component
}
```

## Architecture Documentation
- **Frontend Routing**: Hash-based (`/#/sessions/123`).
- **Keybindings**: Decentralized using `react-hotkeys-hook`, but global shortcuts are centralized in `Layout.tsx`.
- **Navigation State**: Relies on `window.history` (via `react-router-dom`).

## Open Questions
- **Strict Session History**: If the requirement is to *only* cycle through sessions (skipping Settings, Home, etc.), the browser history approach will be insufficient. In that case, a custom stack (array of session IDs) would need to be implemented in `AppStore.ts`, pushing IDs on visit and tracking an index pointer. The shortcuts would then navigate this custom stack instead of `navigate(-1)`.

## Related Research
- None currently available in `thoughts/shared/research/`.
