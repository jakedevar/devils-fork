# CodeLayer Setup Plan

## Status
- **Dependencies:** Installed (Bun, System libs).
- **Setup:** Completed (`make setup`).
- **Configuration:** Fixed global hotkey conflict (changed to `Ctrl+Alt+H`).
- **Model Selection:** Identified logic in `ModelSelector.tsx` and `types.go`.

## Launch Instruction
To start the full CodeLayer development environment (Daemon + Web UI), run the following command in your terminal:

```bash
make codelayer-dev
```

This will:
1. Start the `hld` daemon in the background.
2. Launch the `humanlayer-wui` desktop application.
3. Allow you to interact with Claude Code via the GUI.

## Notes
- The application is in a pre-release state.
- Logs are located in `~/.humanlayer/logs/`.
- If you encounter issues, check the logs or use `make dev-status` to check the environment.
