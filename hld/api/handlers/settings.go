package handlers

import (
	"context"
	"log/slog"
	"time"

	"github.com/humanlayer/humanlayer/hld/api"
	"github.com/humanlayer/humanlayer/hld/store"
)

// SettingsHandlers handles user settings endpoints
type SettingsHandlers struct {
	store store.ConversationStore
}

// NewSettingsHandlers creates a new settings handler
func NewSettingsHandlers(store store.ConversationStore) *SettingsHandlers {
	return &SettingsHandlers{
		store: store,
	}
}

// GetUserSettings retrieves user settings
func (h *SettingsHandlers) GetUserSettings(ctx context.Context, req api.GetUserSettingsRequestObject) (api.GetUserSettingsResponseObject, error) {
	settings, err := h.store.GetUserSettings(ctx)
	if err != nil {
		slog.Error("Failed to retrieve user settings", "error", err)
		return api.GetUserSettings500JSONResponse{
			InternalErrorJSONResponse: api.InternalErrorJSONResponse{
				Error: api.ErrorDetail{
					Code:    "HLD-5001",
					Message: "Failed to retrieve user settings",
				},
			},
		}, nil
	}

	return api.GetUserSettings200JSONResponse{
		Data: api.UserSettings{
			AdvancedProviders:       settings.AdvancedProviders,
			OptInTelemetry:          settings.OptInTelemetry,
			AlwaysBypassPermissions: settings.AlwaysBypassPermissions,
			CreatedAt:               settings.CreatedAt,
			UpdatedAt:               settings.UpdatedAt,
		},
	}, nil
}

// UpdateUserSettings updates user settings
func (h *SettingsHandlers) UpdateUserSettings(ctx context.Context, req api.UpdateUserSettingsRequestObject) (api.UpdateUserSettingsResponseObject, error) {
	// Get current settings
	current, err := h.store.GetUserSettings(ctx)
	if err != nil {
		slog.Error("Failed to get current settings", "error", err)
		return api.UpdateUserSettings500JSONResponse{
			InternalErrorJSONResponse: api.InternalErrorJSONResponse{
				Error: api.ErrorDetail{
					Code:    "HLD-5002",
					Message: "Failed to retrieve current settings",
				},
			},
		}, nil
	}

	// Apply updates
	if req.Body.AdvancedProviders != nil {
		current.AdvancedProviders = *req.Body.AdvancedProviders
	}
	if req.Body.OptInTelemetry != nil {
		current.OptInTelemetry = req.Body.OptInTelemetry
	}
	if req.Body.AlwaysBypassPermissions != nil {
		current.AlwaysBypassPermissions = *req.Body.AlwaysBypassPermissions

		// If enabling always bypass, clear expiration for any active sessions that have bypass enabled
		if current.AlwaysBypassPermissions {
			// TODO: Add a more efficient store method for this if needed
			sessions, err := h.store.ListSessions(ctx)
			if err != nil {
				slog.Error("Failed to list sessions for updating bypass permissions", "error", err)
				// Continue anyway to save user settings
			} else {
				for _, session := range sessions {
					// Check if session has bypass enabled and has an expiration
					if session.DangerouslySkipPermissions && session.DangerouslySkipPermissionsExpiresAt != nil {
						// Clear the expiration
						var nilTime *time.Time
						update := store.SessionUpdate{
							DangerouslySkipPermissionsExpiresAt: &nilTime,
						}
						if err := h.store.UpdateSession(ctx, session.ID, update); err != nil {
							slog.Error("Failed to update session bypass expiration", "session_id", session.ID, "error", err)
						} else {
							slog.Info("Cleared bypass expiration for session due to global setting change", "session_id", session.ID)
						}
					}
				}
			}
		}
	}

	// Save updated settings
	err = h.store.UpdateUserSettings(ctx, *current)
	if err != nil {
		slog.Error("Failed to update user settings", "error", err)
		return api.UpdateUserSettings500JSONResponse{
			InternalErrorJSONResponse: api.InternalErrorJSONResponse{
				Error: api.ErrorDetail{
					Code:    "HLD-5003",
					Message: "Failed to update settings",
				},
			},
		}, nil
	}

	// Return updated settings
	updated, err := h.store.GetUserSettings(ctx)
	if err != nil {
		slog.Error("Failed to retrieve updated settings", "error", err)
		return api.UpdateUserSettings500JSONResponse{
			InternalErrorJSONResponse: api.InternalErrorJSONResponse{
				Error: api.ErrorDetail{
					Code:    "HLD-5004",
					Message: "Failed to retrieve updated settings",
				},
			},
		}, nil
	}

	return api.UpdateUserSettings200JSONResponse{
		Data: api.UserSettings{
			AdvancedProviders:       updated.AdvancedProviders,
			OptInTelemetry:          updated.OptInTelemetry,
			AlwaysBypassPermissions: updated.AlwaysBypassPermissions,
			CreatedAt:               updated.CreatedAt,
			UpdatedAt:               updated.UpdatedAt,
		},
	}, nil
}
