# Roadmap

> CLI utility to health-check MCP servers.

## v1.0 — Foundation ✅
- [x] Initialize check
- [x] Tools list check
- [x] Resources list check
- [x] Optional tool call test
- [x] JSON output
- [x] CLI with --help, --test, --json

## v1.1 — Polish ✅
- [x] Configurable timeouts (`--timeout`)
- [x] Verbose mode (`--verbose`, `-v`) — full responses + tool schemas
- [x] Multiple test calls in one run (repeatable `--test`)
- [x] Prompts/list check
- [x] Response timing per step
- [x] Improved output formatting (aligned columns, timing)
- [x] SDK v1.29 API compatibility fix
- [ ] npm publish
- [ ] GitHub Actions CI

## v1.2 — Advanced
- [ ] Batch check (multiple servers from config file)
- [ ] Performance metrics (response time per step)
- [ ] Protocol compliance checks
- [ ] CI integration mode (markdown report)

---

Have an idea? [Open an issue](https://github.com/Launchery/mcp-health-check/issues)
