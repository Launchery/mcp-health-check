# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-06

### Added
- `--timeout <ms>` flag for configurable per-operation timeouts (default: 10000ms)
- `--verbose` / `-v` flag to show full responses and tool input schemas
- Repeatable `--test` flag for multiple tool test calls in one run
- `prompts/list` check (auto-detected, silent unless verbose)
- Response timing displayed per step
- Improved output formatting with aligned columns and summary

### Fixed
- Updated to MCP SDK v1.29 API (`StdioClientTransport` now takes command/args directly)
- Fixed `client.connect()` return type (void in newer SDK)

## [1.0.0] - 2026-04-04

### Added
- CLI: `mcp-health-check <command> [args...]`
- Checks: initialize, tools/list, resources/list, optional tool call
- JSON output mode (`--json`)
- Human-readable output with pass/warn/fail icons
- Exit code: 0 if all pass, 1 if any fail
