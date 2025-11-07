# Pydoclint VS Code Extension

A VS Code extension that integrates **pydoclint** to provide real-time diagnostics on Python docstring quality with inline error display and Problems panel integration.

## Features

- 🔍 **Real-time diagnostics**: Docstring validation while typing
- 📝 **Inline errors**: Display issues directly in the editor  
- 🚨 **Problems panel**: Full integration with VS Code's diagnostic system
- ⚙️ **Configuration**: Support for `pyproject.toml` files and VS Code settings
- 🎯 **Multiple styles**: Google, NumPy, and Sphinx docstring conventions

## Requirements

- Python 3.8+ installed
- `pydoclint` package installed in your Python environment

## Extension Settings

This extension contributes the following settings:

- `pydoclint.enabled`: Enable/disable pydoclint diagnostics (default: `true`)
- `pydoclint.style`: Docstring style to validate - `google`, `numpy`, or `sphinx` (default: `google`)
- `pydoclint.configFile`: Path to pydoclint configuration file (default: `pyproject.toml`)
- `pydoclint.ignoreVirtualEnv`: If true, files located inside common virtual environment folders (e.g. `venv`, `.venv`, `env`, `.env`) will be ignored (default: `true`)
- `pydoclint.ignorePaths`: Array of glob patterns to ignore (minimatch syntax). If non-empty, these patterns are evaluated first; matched files are skipped. Example: `["**/site-packages/**", "**/.venv/**"]` (default: `[]`)

Priority note: If `pydoclint.ignorePaths` contains patterns, they are tested first. If none match and `pydoclint.ignoreVirtualEnv` is true, the extension falls back to detecting common virtual environment folders.

## Commands

- **Pydoclint: Check Current File**: Manually check the current Python file
- **Pydoclint: Check Workspace**: Check all Python files in the workspace

## Installation

1. Install the extension from the VS Code marketplace
2. Ensure `pydoclint` is installed in your Python environment:
   ```bash
   pip install pydoclint
   ```
3. Open a Python file - the extension will automatically activate

## Configuration Example

Add to your `pyproject.toml`:

```toml
[tool.pydoclint]
style = "google"
require-return-section-when-returning-nothing = false
arg-type-hints-in-signature = true
arg-type-hints-in-docstring = false
check-return-types = false
check-class-attributes = false
```

Alternatively, configure the extension in your VS Code `settings.json`:

```json
{
   "pydoclint.ignoreVirtualEnv": true,
   "pydoclint.ignorePaths": [
      "**/site-packages/**",
      "**/.venv/**",
      "**/venv/**"
   ]
}
```

## Architecture

This extension uses the **Language Server Protocol (LSP)** for optimal VS Code integration:

- **Language Server**: TypeScript/Node.js server that communicates with pydoclint
- **Client Extension**: VS Code extension that manages diagnostics and UI
- **Problem Matcher**: Native integration with VS Code's problem system
