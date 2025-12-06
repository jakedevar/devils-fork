---
date: 2025-12-05 22:14:32 PST
researcher: Gemini
git_commit: deb54a7572deaa46401d3f88e82ce7a5b309c7c2
branch: jakes-branch
repository: devils-fork
topic: "Feasibility of Adding a File Explorer Sidebar"
tags: [research, codebase, frontend, tauri, ui]
status: complete
last_updated: 2025-12-05
last_updated_by: Gemini
---

# Research: Feasibility of Adding a File Explorer Sidebar

**Date**: 2025-12-05 22:14:32 PST
**Researcher**: Gemini
**Git Commit**: deb54a7572deaa46401d3f88e82ce7a5b309c7c2
**Branch**: jakes-branch
**Repository**: devils-fork

## Research Question
"How hard would it be to add a file explorer to the side of this app. like a neovim configuration would have"

## Summary
Adding a file explorer sidebar is **highly feasible** and of **low-to-medium difficulty**. The application (`humanlayer-wui`) is built with Tauri and React, and it already has the necessary dependencies (`@tauri-apps/plugin-fs`) and logic (`useFileBrowser.ts`) to read the file system. The main tasks would be refactoring the global layout to accommodate a sidebar and creating a recursive tree view component.

## Detailed Findings

### Frontend Application Structure
- **Application**: `humanlayer-wui` is the active frontend application.
- **Tech Stack**: React, Vite, Tauri, Tailwind CSS.
- **Entry Point**: `src/main.tsx` initializes the app.
- **Router**: `src/router.tsx` defines the routes.

### Layout Integration
- **File**: [`humanlayer-wui/src/components/Layout.tsx`](https://github.com/humanlayer/humanlayer/blob/deb54a7572deaa46401d3f88e82ce7a5b309c7c2/humanlayer-wui/src/components/Layout.tsx)
- **Current State**: The layout is a single `flex-col` container:
  ```tsx
  <div className="h-screen flex flex-col bg-background text-foreground">
    <main className="flex-1 flex flex-col p-4 overflow-hidden">
      {/* content */}
    </main>
    {/* status bar */}
  </div>
  ```
- **Required Change**: To add a sidebar, the structure needs to change to:
  ```tsx
  <div className="h-screen flex flex-col ...">
    <div className="flex-1 flex overflow-hidden"> {/* New wrapper */}
      <aside className="w-64 border-r ..."> {/* Sidebar */}
        <FileExplorer />
      </aside>
      <main className="flex-1 flex flex-col ...">
        {/* content */}
      </main>
    </div>
    {/* status bar */}
  </div>
  ```
  This is a straightforward CSS/Tailwind refactor.

### File System Capabilities
- **Existing Logic**: [`humanlayer-wui/src/hooks/useFileBrowser.ts`](https://github.com/humanlayer/humanlayer/blob/deb54a7572deaa46401d3f88e82ce7a5b309c7c2/humanlayer-wui/src/hooks/useFileBrowser.ts)
  - This hook demonstrates that the app can already:
    1. Import `readDir` from `@tauri-apps/plugin-fs`.
    2. Expand `~` to the user's home directory.
    3. List files and directories.
  - **Reusability**: The logic here is excellent for a flat list (autocomplete style), but a sidebar file explorer typically needs a recursive or lazy-loaded tree structure. A new hook (e.g., `useFileTree`) would likely be needed, but it can copy 90% of the logic from `useFileBrowser`.

### UI Components
- **Existing**: `humanlayer-wui/src/components/internal/SessionDetail/components/FileMentionNode.tsx` is a small component for rendering file icons in the editor.
- **Missing**: There is no generic "Tree View" or "File Explorer" component.
- **Work Required**: You would need to build a `FileTree` component that:
  - Takes a `path` prop.
  - Lists contents using `readDir`.
  - Renders child `FileTree` components for directories (recursive or interactive expansion).
  - Handles "active" state (highlighting the selected file).

## Architecture Documentation

### Current Patterns
- **State Management**: Zustand stores are used (e.g., `useStore` in `AppStore.ts`). A `useFileExplorerStore` might be useful to track the open/closed state of folders and the currently selected file.
- **Styling**: Tailwind CSS is pervasive. The new sidebar should use standard utility classes (`w-64`, `border-r`, `bg-secondary/10`) to match the existing aesthetic.
- **Icons**: `lucide-react` is already installed and used (e.g., `FolderIcon`, `FileIcon` in `FileMentionNode.tsx`).

## Implementation Plan (Estimated)
1.  **Create Store**: `useFileExplorerStore` (toggle sidebar, track current path).
2.  **Create Component**: `components/FileExplorer/FileTreeItem.tsx` (recursive).
3.  **Update Layout**: Modify `Layout.tsx` to include the sidebar.
4.  **Connect**: Use `readDir` to populate the tree.

## Open Questions
- **Performance**: For very large directories (like `node_modules`), the `readDir` call might need pagination or careful handling, though standard Tauri FS performance is usually good enough for UI lists.
- **Git Integration**: A "neovim-like" explorer often shows git status (modified, new). This would require additional logic to check `git status` for each file, which is significantly more complex than just listing files.
