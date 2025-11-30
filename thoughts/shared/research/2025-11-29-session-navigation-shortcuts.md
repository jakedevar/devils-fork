---
date: 2025-11-29 13:54:30 -0800
researcher: Gemini
git_commit: 99bea5206564ab04bffec4c0cc8afb798e201386
branch: jakes-branch
repository: humanlayer
topic: "Session Navigation Shortcuts (Ctrl+O/I)"
tags: [research, codebase, humanlayer-wui, shortcuts, navigation]
status: complete
last_updated: 2025-11-29
last_updated_by: Gemini
---

# Research: Session Navigation Shortcuts (Ctrl+O/I)

**Date**: 2025-11-29 13:54:30 -0800
**Researcher**: Gemini
**Git Commit**: 99bea5206564ab04bffec4c0cc8afb798e201386
**Branch**: jakes-branch
**Repository**: humanlayer

## Research Question
1. What would it take to modify the ctrl+o and ctrl+i commands to jump to the last visited session? Rather than just going backwards and forwards?
2. Can we reassign the ctrl+o to shift+h and the ctrl+i command to shift+l?

## Summary
The keyboard shortcuts `ctrl+o` and `ctrl+i` are currently defined in `humanlayer-wui/src/components/Layout.tsx`. They are mapped to standard browser history navigation (`navigate(-1)` and `navigate(1)`).

To change them to "jump to last visited session", you would need to implement a custom session history stack in `AppStore.ts`, as the application currently tracks *all* navigation history mixed together (browser behavior) but does not maintain a distinct list of visited sessions for navigation purposes.

Reassigning the keys to `shift+h` and `shift+l` is a straightforward modification in `Layout.tsx`.

## Detailed Findings

### Keyboard Shortcuts Implementation
The shortcuts are implemented using `react-hotkeys-hook` in the main layout component.

- **File:** `humanlayer-wui/src/components/Layout.tsx`
- **Current Implementation:**
  ```typescript
  // Ctrl+o: Go back in history (Jumplist Back)
  useHotkeys('ctrl+o', () => navigate(-1), ...)

  // Ctrl+i: Go forward in history (Jumplist Forward)
  useHotkeys('ctrl+i', () => navigate(1), ...)
  ```
- **Reassignment:** To change the keys, you simply update the first string argument of `useHotkeys` (e.g., change `'ctrl+o'` to `'shift+h'`).

### Navigation Logic
Currently, the navigation relies entirely on `react-router-dom`'s `useNavigate`.
- `navigate(-1)`: Simulates the browser "Back" button.
- `navigate(1)`: Simulates the browser "Forward" button.

This means if a user navigates from `Session A` -> `Settings` -> `Session B`, pressing "Back" (`ctrl+o`) will take them to `Settings`, not `Session A`.

### Session Tracking (Last Visited Session)
The application does *not* currently track a history of visited sessions for navigation purposes.
- **File:** `humanlayer-wui/src/AppStore.ts`
- **Current State:**
    - `recentNavigations`: Tracks *when* a user left a session (to suppress notifications), but not *where* they went or the sequence.
    - There is no `visitedSessions` stack.

## Implementation Plan

To implement "Jump to Last Visited Session" (Jumplist behavior similar to Vim):

1.  **Update Store (`AppStore.ts`):**
    - Add `sessionHistory: string[]` (stack of session IDs).
    - Add `sessionHistoryIndex: number` (current position in stack).
    - Add action `pushSessionVisit(sessionId: string)`: Called when entering a session view.
    - Add action `jumpBack()`: Decrements index and returns session ID.
    - Add action `jumpForward()`: Increments index and returns session ID.

2.  **Update Navigation (`Layout.tsx` or Session Component):**
    - Call `pushSessionVisit` whenever the user lands on a session page.

3.  **Update Shortcuts (`Layout.tsx`):**
    - Change hotkeys to `shift+h` / `shift+l`.
    - Update callbacks to use the new `jumpBack()` / `jumpForward()` actions and then `navigate(\"/sessions/${id}\")`.

## Code References
- `humanlayer-wui/src/components/Layout.tsx:106-126` - Current shortcut definitions for `ctrl+o` and `ctrl+i`.
- `humanlayer-wui/src/AppStore.ts` - Global state management where the session history stack would need to be added.

## Architecture Documentation
The Web UI uses a standard React Router setup wrapped in a global Zustand store (`AppStore`) for state. Navigation is currently delegated to the browser's history API via React Router. Implementing custom navigation logic ("Jumplist") requires managing a parallel history stack within the Zustand store.
