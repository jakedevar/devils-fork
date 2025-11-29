---
date: 2025-11-29T10:39:34-08:00
researcher: Gemini
git_commit: f86efc8a63304817799ab90220da3fb72fabb59b
branch: ctrl-o
repository: humanlayer
topic: "Session Search Implementation Research"
tags: [research, codebase, session-search, telescope, cmdk, wui]
status: complete
last_updated: 2025-11-29
last_updated_by: Gemini
---

# Research: Session Search Implementation

**Date**: 2025-11-29 10:39:34 PST
**Researcher**: Gemini
**Git Commit**: f86efc8a63304817799ab90220da3fb72fabb59b
**Branch**: ctrl-o
**Repository**: humanlayer

## Research Question
Research what it would take to implement a session search feature that:
1. Is initiated with two quick spacebar presses.
2. Pops up a modal (Telescope-style) with a 300ms debounce.
3. Searches through active and archived sessions using fuzzy finding (grouped by type).
4. Resembles `telescope.nvim`.

## Summary
The codebase is well-prepared for this feature. The frontend (`humanlayer-wui`) already has the necessary libraries (`cmdk` for the UI, `react-hotkeys-hook` for shortcuts, and a custom `fuzzy-search` utility). The backend (`hld`) supports fetching all sessions (active and archived) via the existing `GET /sessions` endpoint when no filter is applied.

Implementing this will primarily involve frontend work: creating a new `CommandPalette` component using `cmdk`, implementing the double-space trigger, and integrating it into the main `Layout`.

## Detailed Findings

### Frontend Components (`humanlayer-wui`)
- **UI Library**: The project has `cmdk` installed (`^1.1.1`), which is the industry standard for building "Command Palette" interfaces in React. This perfectly matches the "Telescope" requirement.
- **Layout**: `src/components/Layout.tsx` is the main application wrapper where the global modal and keyboard listener should be placed.
- **Fuzzy Search**: A custom utility exists at `src/lib/fuzzy-search.ts` (Superhuman-inspired), which supports scoring and highlighting. `cmdk` also has built-in filtering, but the custom utility might offer better control if needed.
- **Keyboard Shortcuts**: `react-hotkeys-hook` is used throughout the app. While it doesn't natively support "double tap", this can be implemented with a custom hook tracking key timestamps.

### Backend API (`hld`)
- **List Sessions**: The `ListSessions` handler in `hld/api/handlers/sessions.go` supports a `filter` parameter.
    - When `filter` is empty/nil, it returns **ALL** sessions (active, archived, draft).
    - This matches the requirement to search everything.
- **Search Endpoint**: There is an existing `GET /sessions/search`, but it uses SQL `LIKE` and explicitly *excludes* archived sessions. It is not suitable for this requirement without modification.
    - **Recommendation**: Fetch all sessions using `GET /sessions` (leaves only) and perform fuzzy search on the client side. This is faster for the "Telescope" feel and allows custom grouping without backend changes.

### Data Access
- **Client**: `src/lib/daemon/http-client.ts` has a `getSessionLeaves` method.
    - Calling `getSessionLeaves()` (with no arguments) sends no filter to the backend, which correctly retrieves all sessions.
- **Hook**: `src/hooks/useSessions.ts` currently fetches sessions. A new hook or a modification to this one might be needed to ensure *all* sessions are cached for the search, not just the current view's filtered list.

## Code References

- **Main Layout**: `humanlayer-wui/src/components/Layout.tsx` - Place the `<CommandPalette />` here.
- **Session Handler**: `hld/api/handlers/sessions.go:225` (`ListSessions`) - Backend logic confirming empty filter returns all sessions.
- **Fuzzy Search Utility**: `humanlayer-wui/src/lib/fuzzy-search.ts` - Existing utility for scoring/highlighting.
- **Daemon Client**: `humanlayer-wui/src/lib/daemon/http-client.ts:202` (`getSessionLeaves`) - Method to fetch data.

## Implementation Plan

1.  **Create Component**: `src/components/CommandPalette.tsx` using `cmdk`.
    -   Use `<Command.Dialog>` for the modal.
    -   Use `<Command.Group>` for "Sessions" and "Archived".
2.  **Data Fetching**:
    -   In the component, call `daemonClient.getSessionLeaves()` on mount (or when opened).
    -   Filter the data into two arrays: `active` and `archived`.
3.  **Trigger Logic**:
    -   In `Layout.tsx` (or a custom hook `useDoubleSpace.ts`), listen for `keydown` on `Space`.
    -   Check `Date.now() - lastPressTime < 300`.
    -   Prevent default behavior if double-press detected.
4.  **Styling**:
    -   Style `cmdk` components to match `telescope.nvim` (dark mode, specific borders, file icons).
    -   Use `src/App.css` or Tailwind classes.

## Open Questions
-   **Performance**: If the user has thousands of sessions, fetching all of them on every modal open might be slow.
    -   *Mitigation*: Cache the list and re-fetch only on open if dirty, or use `stale-while-revalidate`. The current `ListSessions` is reasonably fast but fetches full session metadata.
