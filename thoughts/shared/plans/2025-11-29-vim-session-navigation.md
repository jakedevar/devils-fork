# Vim-like Session Navigation Implementation Plan

## Overview
Implement Vim-style navigation shortcuts (`Ctrl+o` for back, `Ctrl+i` for forward) in the WUI to allow users to quickly jump between their session history, mimicking the jump list behavior in Vim.

## Current State Analysis
Currently, the application relies on browser history for navigation. Users can use the browser's back/forward buttons, but there are no explicit keyboard shortcuts for this within the application's hotkey system. The `Layout.tsx` component handles some global hotkeys but lacks these specific navigation commands.

## Desired End State
- Users can press `Ctrl+o` to go back in the browser history (previous session/page).
- Users can press `Ctrl+i` to go forward in the browser history (next session/page).
- These shortcuts are documented in the Help menu (`?`).

### Key Discoveries:
- `humanlayer-wui/src/components/Layout.tsx` is the central place for global hotkeys.
- `humanlayer-wui/src/components/HotkeyPanel.tsx` contains the list of shortcuts displayed in the help menu.
- `react-hotkeys-hook` is the library used for hotkey management.
- `react-router-dom`'s `useNavigate` hook can be used with `-1` and `1` for history navigation.

## What We're NOT Doing
- We are NOT implementing a custom "Jump List" stack separate from the browser history. We are leveraging the existing browser history stack.
- We are NOT modifying the behavior of `Cmd+[` or `Cmd+]` which are handled via a raw event listener in `Layout.tsx`.

## Implementation Approach
We will add the new hotkeys to `Layout.tsx` using `useHotkeys` and update the `HotkeyPanel.tsx` to display them.

## Phase 1: Implement Navigation Hotkeys

### Overview
Add `Ctrl+o` and `Ctrl+i` hotkeys to the global `Layout` component to trigger history navigation.

### Changes Required:

#### 1. Update `Layout.tsx`
**File**: `humanlayer-wui/src/components/Layout.tsx`
**Changes**: Add `useHotkeys` hooks for `ctrl+o` and `ctrl+i`.

```typescript
  // Vim-like navigation
  // Ctrl+o: Go back in history (Jumplist Back)
  useHotkeys('ctrl+o', () => navigate(-1), {
    preventDefault: true,
    enableOnFormTags: false,
    scopes: [HOTKEY_SCOPES.ROOT],
  })

  // Ctrl+i: Go forward in history (Jumplist Forward)
  useHotkeys('ctrl+i', () => navigate(1), {
    preventDefault: true,
    enableOnFormTags: false,
    scopes: [HOTKEY_SCOPES.ROOT],
  })
```

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `cd humanlayer-wui && bun run typecheck`
- [ ] Linting passes: `cd humanlayer-wui && bun run lint`

#### Manual Verification:
- [ ] Open the app, navigate to a session, then another session.
- [ ] Press `Ctrl+o` -> Should go back to the previous session.
- [ ] Press `Ctrl+i` -> Should go forward to the second session.

---

## Phase 2: Update Documentation

### Overview
Add the new shortcuts to the Hotkey Panel so users can discover them.

### Changes Required:

#### 1. Update `HotkeyPanel.tsx`
**File**: `humanlayer-wui/src/components/HotkeyPanel.tsx`
**Changes**: Add the new entries to `hotkeyData`.

```typescript
  // Global
  // ... existing global keys ...
  { category: 'Global', key: 'Ctrl+O', description: 'Go back (Jump list)' },
  { category: 'Global', key: 'Ctrl+I', description: 'Go forward (Jump list)' },
```

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `cd humanlayer-wui && bun run typecheck`

#### Manual Verification:
- [ ] Press `?` to open the Hotkey Panel.
- [ ] Verify "Ctrl+O" and "Ctrl+I" are listed under "Global" shortcuts.

---

## Testing Strategy

### Manual Testing Steps:
1. **Navigation Flow:**
   - Start at Home (Session List).
   - Click Session A.
   - Click Session B.
   - Press `Ctrl+o` -> Should go to Session A.
   - Press `Ctrl+o` -> Should go to Home.
   - Press `Ctrl+i` -> Should go to Session A.
   - Press `Ctrl+i` -> Should go to Session B.

2. **Input Safety:**
   - Open a session.
   - Click into the input box (Draft/Message input).
   - Type `Ctrl+o` or `Ctrl+i`.
   - Verify that navigation **does not** happen (due to `enableOnFormTags: false`).

## References
- Research: `thoughts/shared/research/2025-11-29-vim-session-navigation.md`
- Codebase: `humanlayer-wui/src/components/Layout.tsx`
