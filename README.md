# mcp-health-check

> CLI utility to health-check MCP servers. Verify initialize, list tools, resources, prompts, and test calls — in seconds.

**Problem:** You built an MCP server. Does it actually work? This tool spawns your server, runs the MCP handshake, lists tools, resources, and prompts, and optionally calls tools — all in one command.

**Who is this for:** Developers building or debugging MCP servers who need a quick sanity check.

## Quick Start

```bash
# Install
npm install -g mcp-health-check

# Check any MCP server
mcp-health-check node dist/index.js

# With tool test call
mcp-health-check node dist/index.js --test echo

# Multiple tool tests + verbose
mcp-health-check node dist/index.js --test echo --test add --verbose

# JSON output
mcp-health-check node dist/index.js --json

# Custom timeout
mcp-health-check python server.py --timeout 30000
```

## Example Output

```
🔍 MCP Health Check

  ✅ initialize       Server initialized successfully (234ms)
     {"name":"my-server","version":"1.0.0","capabilities":["tools"]}
  ✅ tools/list       Found 3 tool(s) (45ms)
  ✅ resources/list   Found 2 resource(s) (12ms)
  ✅ call: echo       Tool call succeeded (89ms)

  4 passed · 4 total
```

## What It Checks

| Step | What |
|------|------|
| `initialize` | MCP handshake — server responds to protocol init |
| `tools/list` | Server exposes tools |
| `resources/list` | Server exposes resources (optional) |
| `prompts/list` | Server exposes prompts (optional) |
| `call: <tool>` | Optional: call a specific tool with empty args |

## Usage

```
mcp-health-check <command> [args...] [options]
```

| Flag | Description |
|------|-------------|
| `--test <tool>` | Call a tool after initialization (repeatable) |
| `--timeout <ms>` | Timeout per operation in ms (default: 10000) |
| `--verbose`, `-v` | Show full responses and tool schemas |
| `--json` | Output results as JSON |
| `--help`, `-h` | Show help |

## As a Dev Dependency

```bash
npm install --save-dev mcp-health-check
```

```json
{
  "scripts": {
    "health-check": "mcp-health-check node dist/index.js"
  }
}
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Roadmap

See [ROADMAP.md](ROADMAP.md)

## License

MIT © Launchery
