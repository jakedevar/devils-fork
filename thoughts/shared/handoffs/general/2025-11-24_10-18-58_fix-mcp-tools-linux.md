---
date: 2025-11-24T10:18:58+00:00
researcher: Gemini
git_commit: f86efc8a63304817799ab90220da3fb72fabb59b
branch: jakes-branch
repository: humanlayer
topic: "Fix MCP Tool Not Found Error on Linux"
tags: [fix, mcp, linux, build, path-resolution]
status: complete
last_updated: 2025-11-24
last_updated_by: Gemini
type: implementation_strategy
---

# Handoff: Fix MCP Tool Issues on Linux

## Task(s)
- **Fix "MCP tool not found" error:** Completed.
    - The error `MCP tool mcp__codelayer__request_permission ... not found` was blocking usage on Linux.
    - Diagnosed mismatches in tool names (`request_approval` vs `request_permission`), server names (`humanlayer-daemon` vs `codelayer`), and binary names (`humanlayer-nightly` vs `humanlayer`).
    - Diagnosed path resolution failure where `hld` could not find the bundled `humanlayer` CLI.
    - Implemented fixes across Go (`hld`), TypeScript (`hlyr`), and Build (`Makefile`).

## Critical References
- `FIXING_MCP_TOOLS.md`: A comprehensive summary document I created in the root directory detailing the issue, root causes, and specific fixes.
- `hld/session/manager.go`: Core logic for injecting the MCP server configuration.
- `hld/mcp/server.go`: Go implementation of the internal MCP server.
- `hlyr/src/mcp.ts`: TypeScript implementation of the CLI-based MCP server.

## Recent changes
- `hld/session/resolve_cli.go`: Created new file with `resolveCLICommand` helper to find sibling binaries.
- `hld/session/manager.go:1687,1944`: Integrated `resolveCLICommand` to fix path resolution for the MCP server command.
- `hld/mcp/server.go`: Renamed tool to `request_permission` and server to `codelayer`.
- `hlyr/src/mcp.ts`: Renamed server to `codelayer`.
- `Makefile`: Updated `codelayer-nightly-bundle` and `wui-nightly-build` targets to use `humanlayer` binary name and correct Linux build flags.
- `hld/daemon/*.go`: Updated integration tests to use `request_permission`.

## Learnings
- **Path Resolution in Bundles:** The `hld` daemon, when running from a bundle (like a `.deb` or AppImage), needs explicit logic to find its sibling `humanlayer` CLI binary, as the bundle's `bin` directory is not in the system `PATH`. I implemented `resolveCLICommand` to check the executable's directory first.
- **Tool Name Consistency:** There was a drift between the Go implementation (`request_approval`) and the Claude/TS expectation (`request_permission`). These must be kept in sync.
- **Linux Build Specifics:** The `Makefile` had incorrect defaults for Linux builds (using `humanlayer-nightly` command config but building `humanlayer` binary).

## Artifacts
- `FIXING_MCP_TOOLS.md`: Summary of the fix.
- `hld/session/resolve_cli.go`: New source file.

## Action Items & Next Steps
- **Verify Fix:** Run the bundled application (rebuild with `make codelayer-nightly-bundle`) and confirm the "MCP tool not found" error is gone when running a prompt.
- **Merge:** Review and merge the changes in `jakes-branch` to the main branch.

## Other Notes
- The `hld` daemon logs are useful for verifying if the correct command path is being resolved. Look for "injected codelayer MCP server" debug logs.
