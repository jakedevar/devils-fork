---
date: 2025-12-01 12:00:00 -0800
researcher: jakedevar
git_commit: 290e9a5a
branch: devils-fork
repository: humanlayer
topic: "Permanent Bypass Permissions Setting"
tags: [research, settings, bypass-mode, permissions, implementation]
status: complete
last_updated: 2025-12-01
last_updated_by: jakedevar
---

# Research: Permanent Bypass Permissions Setting

**Date**: 2025-12-01 12:00:00 -0800
**Researcher**: jakedevar
**Git Commit**: 290e9a5a
**Branch**: devils-fork
**Repository**: humanlayer

## Research Question
What would it take to enable a setting in the settings menu and enable the bypass mode permanently with a setting change?

## Summary
The goal was to add a global setting that forces "Bypass Permissions" (dangerously skip permissions) to be enabled by default for all new sessions. This required changes across the full stack: database migration, API update, backend logic, and frontend UI.

## Detailed Findings

### Bypass Mode Logic
- **Existing Logic**: "Bypass mode" corresponds to the `dangerouslySkipPermissions` flag on a `Session`.
- **Implementation**: It is checked in `hld/approval/manager.go` to auto-approve tool calls.
- **Trigger**: It is set during session creation or updated via `updateSessionSettings` RPC.

### Settings UI
- **Location**: `humanlayer-wui/src/components/SettingsDialog.tsx`.
- **State**: Managed via `useStore` in `humanlayer-wui/src/AppStore.ts`.
- **Backend API**: `/user-settings` endpoint (GET/PATCH) handled by `hld/api/handlers/settings.go`.

### Settings Storage/Backend
- **Storage**: `user_settings` table in SQLite (`hld/store/sqlite.go`).
- **Schema**: Previously had `advanced_providers` and `opt_in_telemetry`.
- **Migration**: Added migration 23 to add `always_bypass_permissions` BOOLEAN column.

## Implementation Details

### Backend
1.  **Migration**: Added `always_bypass_permissions` to `user_settings` table.
2.  **API**: Updated `openapi.yaml` to include `always_bypass_permissions` in `UserSettings` schema. Regenerated server and SDK code.
3.  **Handlers**: Updated `HandleLaunchSession` in `hld/rpc/handlers.go` to fetch `UserSettings`. If `AlwaysBypassPermissions` is true, it overrides the session config to set `DangerouslySkipPermissions = true`.

### Frontend
1.  **Store**: Updated `AppStore.ts` to include `alwaysBypassPermissions` in `userSettings` state and synchronization logic.
2.  **UI**: Added a `Switch` component in `SettingsDialog.tsx` labeled "Always Bypass Permissions" with a warning description.
3.  **Indicator**: Updated `AutoAcceptIndicator.tsx` to display a **red glowing infinity symbol** instead of the shield icon when the permanent bypass setting is active, providing clear visual feedback.

## Code References
-   `hld/store/sqlite.go`: Migration 23 and updated CRUD for user settings.
-   `hld/rpc/handlers.go`: Logic to apply global setting to new sessions.
-   `humanlayer-wui/src/components/SettingsDialog.tsx`: New toggle UI.
-   `humanlayer-wui/src/components/internal/SessionDetail/AutoAcceptIndicator.tsx`: Updated icon logic.
-   `hld/api/openapi.yaml`: API schema definition.

## Open Questions
-   Does the user expect this to apply to *existing* active sessions immediately upon toggling? Currently, it only applies to *new* sessions launched after the setting is enabled. To apply it to existing sessions, we would need to broadcast an update or iterate through all active sessions, which was deemed out of scope for "enabling the mode permanently" (interpreted as a default preference).