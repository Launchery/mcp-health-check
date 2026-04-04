# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-04

### Added
- CLI: `mcp-health-check <command> [args...]`
- Checks: initialize, tools/list, resources/list, optional tool call
- JSON output mode (`--json`)
- Human-readable output with pass/warn/fail icons
- Exit code: 0 if all pass, 1 if any fail
