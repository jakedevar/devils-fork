package session

import (
	"log/slog"
	"os"
	"path/filepath"
)

// resolveCLICommand attempts to find the CLI command in the same directory as the executable
// before falling back to the raw command string (which relies on PATH).
func resolveCLICommand(cmd string) string {
	// If it's already an absolute path, return it
	if filepath.IsAbs(cmd) {
		return cmd
	}

	// Get current executable path
	exePath, err := os.Executable()
	if err != nil {
		slog.Warn("failed to get executable path", "error", err)
		return cmd
	}

	exeDir := filepath.Dir(exePath)
	siblingPath := filepath.Join(exeDir, cmd)

	// Check if binary exists in the same directory
	if _, err := os.Stat(siblingPath); err == nil {
		slog.Debug("found CLI command in executable directory", "path", siblingPath)
		return siblingPath
	}

	// Fall back to original command (will search PATH)
	return cmd
}