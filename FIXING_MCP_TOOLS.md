# Fixing MCP Tool & Linux Build Issues

**Date:** November 24, 2025
**Author:** Gemini CLI Agent

This document summarizes the investigation and resolution of the `MCP tool mcp__codelayer__request_permission ... not found` error encountered when running the CodeLayer application on Linux.

## The Issue

When attempting to run a prompt in the built CodeLayer application, the process failed with:
> `claude process failed: claude error: Error: MCP tool mcp__codelayer__request_permission (passed via --permission-prompt-tool) not found. Available MCP tools: none`

This indicated that the Claude process, orchestrated by the `hld` daemon, could not locate the specific Model Context Protocol (MCP) tool required for handling permissions.

## Root Cause Analysis

The investigation revealed a "perfect storm" of four distinct configuration and implementation mismatches:

1.  **Tool Name Mismatch:**
    *   **Expectation:** The `claudecode` configuration and session manager expected the tool to be named `request_permission`.
    *   **Reality:** The internal Go-based MCP server (`hld/mcp/server.go`) was advertising a tool named `request_approval`.

2.  **Server Name Mismatch:**
    *   **Expectation:** The session manager configured the MCP server with the name `codelayer`, leading Claude to look for `mcp__codelayer__...`.
    *   **Reality:**
        *   The Go server named itself `humanlayer-daemon`.
        *   The TypeScript CLI server (`hlyr/src/mcp.ts`) named itself `humanlayer-claude-local-approvals`.

3.  **Binary Name Mismatch (Linux Bundle):**
    *   **Expectation:** The `hld` daemon (on Linux) was compiled with a default CLI command of `humanlayer-nightly`.
    *   **Reality:** The build process (`Makefile`) for the Linux bundle produced a binary named `humanlayer`. As a result, `hld` tried to spawn a non-existent command.

4.  **Path Resolution Failure:**
    *   **Issue:** Even with the correct binary name, the `hld` daemon relied on the system `PATH` to find the `humanlayer` CLI.
    *   **Reality:** In a bundled application (like an AppImage or `.deb`), the `humanlayer` binary sits alongside `hld` in a private directory that is *not* in the system `PATH`. `hld` was failing to launch the MCP server simply because it couldn't find the executable.

## The Solution

A comprehensive fix was implemented addressing all four areas:

### 1. Standardized Names
*   **Renamed Tool:** Changed `request_approval` to `request_permission` in `hld/mcp/server.go` and all associated integration tests (`hld/daemon/*.go`).
*   **Renamed Server:** Updated both the Go server (`hld/mcp/server.go`) and the TypeScript server (`hlyr/src/mcp.ts`) to use the name `codelayer`. This ensures consistency with the `mcp__codelayer__` namespace.

### 2. Fixed Linux Build Configuration
*   **Updated Makefile:** Modified the `codelayer-nightly-bundle` and `wui-nightly-build` targets in the `Makefile`.
    *   Changed `DefaultCLICommand` from `humanlayer-nightly` to `humanlayer`.
    *   Fixed the build flags to strictly use `GOOS=linux GOARCH=amd64` and the correct Bun target (`bun-linux-x64-modern`) for Linux builds.

### 3. Implemented Robust Path Resolution
*   **Created `resolveCLICommand`:** Added a new helper function in `hld/session/resolve_cli.go`.
*   **Logic:** This function checks if the configured CLI command exists in the **same directory** as the running `hld` executable. If found, it uses that absolute path. If not, it falls back to the default behavior (searching `PATH`).
*   **Integration:** Updated `hld/session/manager.go` to use this resolver when configuring the MCP server in `LaunchSession`, `forkSession`, and `ContinueSession`.

## Verification

After applying these fixes and rebuilding with `make codelayer-nightly-bundle`, the `hld` daemon correctly:
1.  Locates the bundled `humanlayer` binary.
2.  Launches it as the `codelayer` MCP server.
3.  Advertises the correct `request_permission` tool.
4.  Allows Claude to successfully request permissions from the user interface.
