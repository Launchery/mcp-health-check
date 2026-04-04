# mcp-health-check

> CLI utility to health-check MCP servers. Verify initialize, list tools, test calls — in seconds.

**Problem:** You built an MCP server. Does it actually work? This tool spawns your server, runs the MCP handshake, lists tools and resources, and optionally calls a tool — all in one command.

**Who is this for:** Developers building or debugging MCP servers who need a quick sanity check.

## Quick Start

```bash
# Install
npm install -g mcp-health-check

# Check any MCP server
mcp-health-check node dist/index.js

# With tool test call
mcp-health-check node dist/index.js --test echo

# JSON output
mcp-health-check node dist/index.js --json
```

## Example Output

```
🔍 MCP Health Check Results

  ✅ initialize: Server initialized successfully
     {"name":"my-server","version":"1.0.0"}
  ✅ tools/list: Found 3 tool(s)
     [{"name":"echo"},{"name":"add"},{"name":"search"}]
  ⚠️ resources/list: No resources registered

  2/3 checks passed
```

## What It Checks

| Step | What |
|------|------|
| `initialize` | MCP handshake — server responds to protocol init |
| `tools/list` | Server exposes tools |
| `resources/list` | Server exposes resources (optional) |
| `tool call` | Optional: call a specific tool with empty args |

## Usage

```
mcp-health-check <command> [args...] [--test <tool-name>] [--json]
```

| Flag | Description |
|------|-------------|
| `--test <tool>` | Call a tool after initialization |
| `--json` | Output results as JSON |
| `--help` | Show help |

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

## Roadmap

See [ROADMAP.md](ROADMAP.md)

## License

MIT © Launchery
