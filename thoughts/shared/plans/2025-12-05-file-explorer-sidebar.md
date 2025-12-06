# File Explorer Sidebar Prototype Implementation Plan

## Overview

We will implement a read-only ("Level 1") file explorer sidebar for the `humanlayer-wui` application. This sidebar will allow users to visualize the file system structure relevant to their current context. It will dynamically switch its root directory based on the user's state: defaulting to the current session's working directory when in a chat, and falling back to the user's home directory in other views (like the session list).

## Current State Analysis

-   **Application**: Tauri + React + Vite (`humanlayer-wui`).
-   **File System Access**: `@tauri-apps/plugin-fs` is available and used in `useFileBrowser.ts`.
-   **Session Data**: Available in `AppStore.ts` (`activeSessionDetail.session.workingDir`).
-   **Layout**: `Layout.tsx` is a single-column flex layout.
-   **Missing**: Recursive tree UI component, sidebar container, context-aware root path logic.

## Desired End State

-   **UI**: A sidebar on the left side of the application, toggleable via a button or hotkey (future).
-   **Content**: A recursive tree view of files and folders.
    -   Folders can be expanded/collapsed.
    -   Files show icons.
-   **Context Awareness**:
    -   **Session View**: Root = `session.workingDir`.
    -   **Home/List View**: Root = User's Home Directory (`~`).
-   **Prototype Scope (Level 1)**: Read-only visualization. No file operations (create/delete/rename) or git status yet.

### Key Discoveries:
-   `activeSessionDetail.session.workingDir` in `AppStore.ts` holds the session path.
-   `useFileBrowser` hook logic can be adapted for the tree data fetching.
-   `lucide-react` icons (`Folder`, `File`, `ChevronRight`, `ChevronDown`) are available.

## What We're NOT Doing

-   **File Operations**: No creating, deleting, renaming, or moving files.
-   **File Opening**: Clicking a file will not yet open it in an editor.
-   **Git Integration**: No git status indicators.
-   **Advanced Filtering**: No `.gitignore` parsing for this prototype (though we might do basic node_modules hiding if easy).

## Implementation Approach

We will build this in two clean phases. First, we'll build the standalone logic and UI components ("Bottom-Up"). Then, we'll integrate them into the global layout ("Top-Down"). This minimizes disruption to the existing app until the components are ready.

## Phase 1: Core Components & State

### Overview
Create the reusable `FileTree` component and the necessary hooks to manage the directory state (expanded folders, fetching contents).

### Changes Required:

#### 1. File Explorer Hook
**File**: `humanlayer-wui/src/hooks/useFileTree.ts`
**Changes**: Create a hook that handles:
-   Fetching directory contents using `@tauri-apps/plugin-fs`.
-   Sorting (folders first, then files).
-   Managing `expanded` state for directories.

#### 2. File Tree Component
**File**: `humanlayer-wui/src/components/FileExplorer/FileTree.tsx`
**Changes**:
-   Recursive component.
-   Props: `path`, `level` (for indentation).
-   Renders `Folder` or `File` icons.
-   Handles click to toggle expansion.

### Success Criteria:

#### Automated Verification:
-   [ ] New files created: `ls humanlayer-wui/src/hooks/useFileTree.ts humanlayer-wui/src/components/FileExplorer/FileTree.tsx`
-   [ ] Linting passes: `make -C humanlayer-wui lint` (or `cd humanlayer-wui && npm run lint`)
-   [ ] Type checking passes: `cd humanlayer-wui && npm run typecheck`

#### Manual Verification:
-   (Since this is a component phase, manual verification happens in Phase 2 when it's visible, or via a temporary test harness if needed. We will assume integration in Phase 2 for visual check).

---

## Phase 2: Layout Integration

### Overview
Integrate the `FileTree` into the main application layout and implement the context-aware root path logic.

### Changes Required:

#### 1. Store/Context for Explorer State
**File**: `humanlayer-wui/src/AppStore.ts` (or new slice)
**Changes**: Add `isFileExplorerOpen` boolean to the store to toggle the sidebar.

#### 2. Layout Refactor
**File**: `humanlayer-wui/src/components/Layout.tsx`
**Changes**:
-   Wrap the `<main>` content in a horizontal flex container.
-   Add the `<aside>` sidebar element.
-   Implement the logic to determine `rootPath`:
    ```typescript
    const activeSession = useStore(state => state.activeSessionDetail?.session);
    const rootPath = activeSession?.workingDir || homeDir();
    ```
-   Render `<FileTree path={rootPath} />` inside the sidebar.

#### 3. Styling
**File**: `humanlayer-wui/src/components/FileExplorer/styles.css` (or inline Tailwind)
**Changes**: Ensure the sidebar has a resize handle (optional) or fixed width, and matches the app theme.

### Success Criteria:

#### Automated Verification:
-   [ ] App builds successfully: `cd humanlayer-wui && npm run build`

#### Manual Verification:
-   [ ] Launch the app.
-   [ ] Verify sidebar appears.
-   [ ] Verify "Session View" shows the session's working directory.
-   [ ] Verify "Home View" shows the user's home directory.
-   [ ] Verify folders expand/collapse.
