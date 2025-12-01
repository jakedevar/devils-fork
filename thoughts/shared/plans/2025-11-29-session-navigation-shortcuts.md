# Session Navigation Shortcuts & Jumplist Implementation Plan

## Overview

This plan implements a Vim-like "Jumplist" navigation system for sessions, allowing users to jump back and forth between visited sessions specifically, ignoring other pages (like Settings or Home). It also reassigns the navigation shortcuts from `ctrl+o`/`ctrl+i` to `shift+h`/`shift+l`.

## Current State Analysis

- **Shortcuts:** `ctrl+o` and `ctrl+i` are currently mapped to browser history navigation (`navigate(-1/1)`).
- **Navigation:** The application tracks all navigation events in a single browser history stack. There is no dedicated history for session visits.
- **State:** `AppStore.ts` manages global state but lacks navigation history.
- **Session View:** `SessionDetailPage.tsx` renders individual sessions.

## Desired End State

- **Shortcuts:** `shift+h` jumps to the previously visited session. `shift+l` jumps forward in the session history.
- **Behavior:** Navigation is restricted to the "Session Jumplist". Visiting a non-session page does not affect this list (unless we decide to track it, but the request specifies "last visited session").
- **History Logic:**
    - Visiting a session adds it to the stack.
    - Navigating back/forward moves a pointer in the stack.
    - Visiting a new session while "back" in the stack truncates the future history.

### Key Discoveries:
- `Layout.tsx` defines the current hotkeys.
- `AppStore.ts` is the best place for the global history stack.
- `SessionDetailPage.tsx` is where we capture session visits.

## What We're NOT Doing

- We are NOT replacing the browser's native back/forward button behavior (those will still work as expected).
- We are NOT tracking every single UI state change (like opening modals) in this jumplist, only session IDs.

## Implementation Approach

We will modify the Zustand store to maintain a `sessionHistory` array and a `sessionHistoryIndex`. We'll then hook into the session detail view to populate this history, and update the main layout to consume it via new hotkeys.

## Phase 1: AppStore Updates

### Overview
Add state and actions to `AppStore.ts` to manage the session history stack.

### Changes Required:

#### 1. Update `AppStore.ts`
**File**: `humanlayer-wui/src/AppStore.ts`
**Changes**:
- Add `sessionHistory: string[]` to state.
- Add `sessionHistoryIndex: number` to state.
- Add `pushSessionVisit(sessionId: string)` action.
    - Should deduplicate if `sessionId` is same as current tip.
    - Should truncate future history if `sessionHistoryIndex` is not at the end.
- Add `jumplistBack()` action -> returns `string | null` (sessionId).
- Add `jumplistForward()` action -> returns `string | null` (sessionId).

```typescript
// Interface updates
interface StoreState {
  // ... existing state
  /* Session Jumplist */
  sessionHistory: string[]
  sessionHistoryIndex: number
  pushSessionVisit: (sessionId: string) => void
  jumplistBack: () => string | null
  jumplistForward: () => string | null
}

// Implementation
// ... inside create<StoreState> ...
sessionHistory: [],
sessionHistoryIndex: -1,

pushSessionVisit: (sessionId: string) => set(state => {
  const { sessionHistory, sessionHistoryIndex } = state
  
  // If empty, just add it
  if (sessionHistory.length === 0) {
    return { sessionHistory: [sessionId], sessionHistoryIndex: 0 }
  }

  // If same as current, do nothing
  if (sessionHistory[sessionHistoryIndex] === sessionId) {
    return state
  }

  // Truncate future history if we are in the middle
  const newHistory = sessionHistory.slice(0, sessionHistoryIndex + 1)
  
  // Add new session
  newHistory.push(sessionId)
  
  return { 
    sessionHistory: newHistory, 
    sessionHistoryIndex: newHistory.length - 1 
  }
}),

jumplistBack: () => {
  const state = get()
  if (state.sessionHistoryIndex > 0) {
    const newIndex = state.sessionHistoryIndex - 1
    set({ sessionHistoryIndex: newIndex })
    return state.sessionHistory[newIndex]
  }
  return null
},

jumplistForward: () => {
  const state = get()
  if (state.sessionHistoryIndex < state.sessionHistory.length - 1) {
    const newIndex = state.sessionHistoryIndex + 1
    set({ sessionHistoryIndex: newIndex })
    return state.sessionHistory[newIndex]
  }
  return null
},
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `npm run typecheck` (or `tsc --noEmit`)
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] None yet (functionality not exposed).

---

## Phase 2: Session Integration

### Overview
Hook into the session view to track visits.

### Changes Required:

#### 1. Update `SessionDetailPage.tsx`
**File**: `humanlayer-wui/src/pages/SessionDetailPage.tsx`
**Changes**:
- Call `pushSessionVisit(sessionId)` in the `useEffect` that runs when `sessionId` changes.

```typescript
const pushSessionVisit = useStore(state => state.pushSessionVisit)

useEffect(() => {
  if (sessionId) {
    fetchActiveSessionDetail(sessionId)
    pushSessionVisit(sessionId) // <--- Add this
  }
  // ...
}, [sessionId, fetchActiveSessionDetail, clearActiveSessionDetail, pushSessionVisit])
```

### Success Criteria:

#### Automated Verification:
- [x] Build passes.

#### Manual Verification:
- [ ] Use React DevTools or console logging to verify `sessionHistory` updates in the store as you navigate between sessions.

---

## Phase 3: Shortcut Updates

### Overview
Reassign hotkeys and connect them to the new jumplist actions.

### Changes Required:

#### 1. Update `Layout.tsx`
**File**: `humanlayer-wui/src/components/Layout.tsx`
**Changes**:
- Remove existing `ctrl+o` / `ctrl+i` hooks.
- Add `ctrl+o` hook calling `jumplistBack()`.
- Add `ctrl+i` hook calling `jumplistForward()`.
- Use `navigate` to go to the returned session ID.

```typescript
const jumplistBack = useStore(state => state.jumplistBack)
const jumplistForward = useStore(state => state.jumplistForward)

// Ctrl+O: Jumplist Back
useHotkeys(
  'ctrl+o',
  () => {
    const prevSessionId = jumplistBack()
    if (prevSessionId) {
      navigate(`/sessions/${prevSessionId}`)
    }
  },
  {
    preventDefault: true,
    enableOnFormTags: false,
    scopes: [HOTKEY_SCOPES.ROOT],
  },
  [jumplistBack, navigate],
)

// Ctrl+I: Jumplist Forward
useHotkeys(
  'ctrl+i',
  () => {
    const nextSessionId = jumplistForward()
    if (nextSessionId) {
      navigate(`/sessions/${nextSessionId}`)
    }
  },
  {
    preventDefault: true,
    enableOnFormTags: false,
    scopes: [HOTKEY_SCOPES.ROOT],
  },
  [jumplistForward, navigate],
)
```

### Success Criteria:

#### Automated Verification:
- [x] Build passes.

#### Manual Verification:
- [ ] Visit Session A -> Session B -> Session C.
- [ ] Press `Ctrl+O`: Should go to Session B.
- [ ] Press `Ctrl+O`: Should go to Session A.
- [ ] Press `Ctrl+I`: Should go to Session B.
- [ ] Press `Ctrl+I`: Should go to Session C.
- [ ] Navigate manually to Session D.
- [ ] Press `Ctrl+O`: Should go to Session C.

## Testing Strategy

### Manual Testing Steps:
1.  Open the app.
2.  Click on 3 different sessions in sequence.
3.  Use `Shift+H` to traverse back.
4.  Use `Shift+L` to traverse forward.
5.  Go back to the middle of the stack, then click a *new* session.
6.  Verify forward history is truncated (pressing `Shift+L` should do nothing).

## Migration Notes
- No data migration needed (in-memory state only).
