# Session Search Implementation Plan

## Overview

Implement a "Telescope-style" command palette to search and navigate between sessions. The feature will be triggered by pressing the `F` key, presenting a modal that fuzzy-searches through both active and archived sessions using `cmdk`.

## Current State Analysis

- **Frontend**: The project uses `cmdk` for command palettes and has a custom `fuzzy-search` utility.
- **Backend**: The `GET /sessions` endpoint (via `daemonClient.getSessionLeaves()`) returns all sessions when no filter is applied, which suits our need to search everything.
- **Trigger**: `react-hotkeys-hook` is used, which makes binding the `F` key straightforward.

## Desired End State

- **Trigger**: Pressing `F` opens the modal.
- **UI**: A centralized modal using `cmdk` that resembles `telescope.nvim` (dark theme, file-like aesthetic).
- **Search**:
  - Searches **all** sessions (active, archived, drafts).
  - Uses client-side fuzzy search (`src/lib/fuzzy-search.ts`) on title, summary, and query.
  - Groups results into "Sessions" and "Archived".
- **Navigation**: Selecting a session navigates to its detail view.

## What We're NOT Doing

- We are NOT implementing server-side fuzzy search for this iteration (client-side filtering of the full list is sufficient for now).
- We are NOT adding new backend endpoints.
- We are NOT implementing complex double-tap logic; a single keypress is sufficient and simpler.

## Implementation Approach

1.  **Phase 1: Core Component**: Build the `SessionSearch` component using `cmdk`.
2.  **Phase 2: Trigger & Integration**: Bind the `F` key in `Layout` to open the modal.
3.  **Phase 3: Logic & Data Connection**: Connect data fetching and implement the fuzzy search logic.

## Phase 1: Core Component (`SessionSearch.tsx`)

### Overview
Create the visual component using `cmdk`. It will handle the rendering of the dialog, input field, and grouped results.

### Changes Required:

#### 1. Create `src/components/SessionSearch.tsx`
**File**: `src/components/SessionSearch.tsx`
**Changes**: New component using `cmdk`.

```tsx
import { Command } from 'cmdk'
import { Dialog, DialogContent } from '@/components/ui/dialog'
// ... imports
```

### Success Criteria:

#### Automated Verification:
- [x] Component compiles without errors: `npm run typecheck`
- [x] Linter passes: `npm run lint`

#### Manual Verification:
- [ ] Component renders correctly in Storybook (if applicable) or temporary route.

---

## Phase 2: Trigger & Integration

### Overview
Implement the `F` key trigger using `react-hotkeys-hook` and place the component in the global layout.

### Changes Required:

#### 1. Update `src/components/Layout.tsx`
**File**: `src/components/Layout.tsx`
**Changes**:
- Import `SessionSearch`.
- Add state for `isSearchOpen`.
- Use `useHotkeys('f', ...)` to toggle the state.
- Ensure `enableOnFormTags` is `false` (default) so typing "f" in an input doesn't trigger it.

### Success Criteria:

#### Automated Verification:
- [x] Type check passes.

#### Manual Verification:
- [ ] Pressing `F` opens the modal.
- [ ] Pressing `F` inside an input field types the letter "f" instead of opening the modal.

---

## Phase 3: Logic & Data Connection

### Overview
Connect the component to `daemonClient` to fetch all sessions and implement the fuzzy search logic.

### Changes Required:

#### 1. Update `src/components/SessionSearch.tsx`
**File**: `src/components/SessionSearch.tsx`
**Changes**:
- Add `useEffect` to fetch `daemonClient.getSessionLeaves()` on mount/open.
- Use `fuzzySearch` utility to filter `sessions` based on input.
- Group results into "Sessions" (active) and "Archived".

### Success Criteria:

#### Automated Verification:
- [x] Type check passes.

#### Manual Verification:
- [ ] Modal populates with real session data.
- [ ] Typing filters the list accurately.
- [ ] Clicking a result navigates to the session.
- [ ] "Archived" sessions appear in their own group.

---

## Testing Strategy

### Manual Testing Steps:
1.  **Trigger**: Press `F`. Verify modal opens. Click inside an input and press `F`. Verify modal does *not* open.
2.  **Search**: Type a known session title. Verify it appears. Type a partial query. Verify fuzzy match.
3.  **Navigation**: Click a result. Verify URL changes to `/sessions/:id`.
4.  **Grouping**: Verify active and archived sessions are separated.
