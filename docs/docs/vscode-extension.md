---
sidebar_position: 8
---

# VS Code Extension

Sheriff provides a VS Code extension that brings the Sheriff UI directly into your editor.

## Features

- Visual config editor with syntax highlighting
- Interactive module graph visualization
- Dependency matrix view
- Tag management UI
- Context menu integration (right-click folders)
- Per-workspace settings persistence

## Installation

```bash
yarn vscode:package
```

Then install the `.vsix` via Command Palette: "Extensions: Install from VSIX..." and select `dist/apps/sheriff-vscode/sheriff-vscode.vsix`.

## Usage

**Command Palette**: `Cmd/Ctrl+Shift+P` → "Sheriff: Open UI"

**Context Menu**: Right-click any folder → "Open Sheriff from Here"

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `sheriff.defaultEntryFile` | `src/main.ts` | Default entry file path |
| `sheriff.rememberLastFolder` | `true` | Remember last used folder |

## Development

```bash
yarn vscode:build    # Build all (UI + API + extension)
```

Press `F5` in VS Code to launch the Extension Development Host.

### Debugging

- **Extension**: Set breakpoints, press `F5`
- **API logs**: View → Output → "Sheriff"
- **Webview console**: "Developer: Toggle Developer Tools" in Extension Host

## Architecture

```mermaid
graph TD
    A[VS Code Command] --> B[Extension Activation]
    B --> C[Start API Server]
    B --> D[Open Webview Panel]
    C --> E[Minimal Express Server]
    D --> F[Angular UI]
    F --> |HTTP Requests| E
    E --> G[@softarc/sheriff-core]
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension fails to start | Check Output panel → "Sheriff", ensure Node.js in PATH |
| UI doesn't load | Verify server started in logs, check firewall |
| Styling broken | Rebuild with `yarn vscode:package` |
