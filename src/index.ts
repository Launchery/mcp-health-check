#!/usr/bin/env node

/**
 * mcp-health-check v1.1.0
 *
 * CLI utility to verify that an MCP server is working correctly.
 * Spawns the server as a child process, runs initialize + tools/list + resources/list,
 * and optionally calls tools.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface CheckResult {
  step: string;
  status: "pass" | "fail" | "warn";
  message: string;
  durationMs?: number;
  data?: unknown;
}

interface HealthCheckOptions {
  timeout: number;
  verbose: boolean;
  testTools: string[];
  jsonOutput: boolean;
}

async function runHealthCheck(
  command: string,
  args: string[],
  options: HealthCheckOptions
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  let transport: StdioClientTransport | null = null;

  try {
    // Step 1: Spawn + Initialize
    transport = new StdioClientTransport({
      command,
      args,
      stderr: "pipe",
    });

    const client = new Client(
      { name: "mcp-health-check", version: "1.1.0" },
      { capabilities: {} }
    );

    const initStart = Date.now();
    try {
      await withTimeout(client.connect(transport), options.timeout, "initialize");
      const durationMs = Date.now() - initStart;

      const serverVersion = client.getServerVersion();
      const serverCaps = client.getServerCapabilities();

      results.push({
        step: "initialize",
        status: "pass",
        message: "Server initialized successfully",
        durationMs,
        data: {
          name: serverVersion?.name,
          version: serverVersion?.version,
          capabilities: serverCaps ? Object.keys(serverCaps) : [],
        },
      });
    } catch (e) {
      results.push({
        step: "initialize",
        status: "fail",
        message: `Initialize failed: ${(e as Error).message}`,
        durationMs: Date.now() - initStart,
      });
      return results;
    }

    // Step 2: List tools
    const toolsStart = Date.now();
    try {
      const toolsResult = await withTimeout(client.listTools(), options.timeout, "tools/list");
      const tools = toolsResult.tools || [];
      const durationMs = Date.now() - toolsStart;
      results.push({
        step: "tools/list",
        status: tools.length > 0 ? "pass" : "warn",
        message:
          tools.length > 0
            ? `Found ${tools.length} tool(s)`
            : "No tools registered",
        durationMs,
        data: tools.map((t) => ({
          name: t.name,
          description: t.description
            ? t.description.length > 80
              ? t.description.slice(0, 77) + "..."
              : t.description
            : undefined,
        })),
      });

      if (options.verbose) {
        for (const t of tools) {
          results.push({
            step: `  tool: ${t.name}`,
            status: "pass",
            message: t.description || "(no description)",
            data: { inputSchema: t.inputSchema },
          });
        }
      }
    } catch (e) {
      results.push({
        step: "tools/list",
        status: "fail",
        message: `Tools list failed: ${(e as Error).message}`,
        durationMs: Date.now() - toolsStart,
      });
    }

    // Step 3: List resources
    const resStart = Date.now();
    try {
      const resourcesResult = await withTimeout(client.listResources(), options.timeout, "resources/list");
      const resources = resourcesResult.resources || [];
      const durationMs = Date.now() - resStart;
      results.push({
        step: "resources/list",
        status: resources.length > 0 ? "pass" : "warn",
        message:
          resources.length > 0
            ? `Found ${resources.length} resource(s)`
            : "No resources registered",
        durationMs,
        data: resources.slice(0, 10).map((r) => ({
          uri: r.uri,
          name: r.name,
        })),
      });
    } catch (e) {
      results.push({
        step: "resources/list",
        status: "warn",
        message: `Resources not supported or failed: ${(e as Error).message}`,
        durationMs: Date.now() - resStart,
      });
    }

    // Step 4: List prompts
    const promptStart = Date.now();
    try {
      const promptsResult = await withTimeout(client.listPrompts(), options.timeout, "prompts/list");
      const prompts = promptsResult.prompts || [];
      const durationMs = Date.now() - promptStart;
      results.push({
        step: "prompts/list",
        status: prompts.length > 0 ? "pass" : "warn",
        message:
          prompts.length > 0
            ? `Found ${prompts.length} prompt(s)`
            : "No prompts registered",
        durationMs,
        data: prompts.slice(0, 10).map((p) => ({
          name: p.name,
          description: p.description?.slice(0, 80),
        })),
      });
    } catch (e) {
      // prompts/list is optional, skip silently unless verbose
      if (options.verbose) {
        results.push({
          step: "prompts/list",
          status: "warn",
          message: `Prompts not supported or failed: ${(e as Error).message}`,
          durationMs: Date.now() - promptStart,
        });
      }
    }

    // Step 5: Optional test tool calls
    for (const testTool of options.testTools) {
      const callStart = Date.now();
      try {
        const callResult = await withTimeout(
          client.callTool({ name: testTool, arguments: {} }),
          options.timeout,
          `tool call: ${testTool}`
        );
        const durationMs = Date.now() - callStart;
        const content = callResult.content || [];
        results.push({
          step: `call: ${testTool}`,
          status: "pass",
          message: "Tool call succeeded",
          durationMs,
          data: options.verbose
            ? content
            : Array.isArray(content) && content.length > 0 && typeof (content as Array<{text?: string}>)[0]?.text === "string"
              ? (content as Array<{text: string}>)[0].text.slice(0, 200)
              : Array.isArray(content) ? content.slice(0, 3) : content,
        });
      } catch (e) {
        results.push({
          step: `call: ${testTool}`,
          status: "fail",
          message: `Tool call failed: ${(e as Error).message}`,
          durationMs: Date.now() - callStart,
        });
      }
    }

    // Cleanup
    await client.close();
  } catch (e) {
    results.push({
      step: "spawn",
      status: "fail",
      message: `Failed to spawn server: ${(e as Error).message}`,
    });
  } finally {
    // StdioClientTransport handles process cleanup
  }

  return results;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(`
mcp-health-check v1.1.0 — Verify your MCP server is working

Usage:
  mcp-health-check <command> [args...] [options]

Options:
  --test <tool>       Call a tool after initialization (repeatable)
  --timeout <ms>      Timeout per operation in ms (default: 10000)
  --verbose, -v       Show full responses and tool schemas
  --json              Output results as JSON
  --help, -h          Show this help

Examples:
  mcp-health-check node dist/index.js
  mcp-health-check node dist/index.js --test echo --verbose
  mcp-health-check python server.py --timeout 30000
  mcp-health-check node dist/index.js --test echo --test add --json
`);
  process.exit(0);
}

// Parse args
const jsonOutput = argv.includes("--json");
const verbose = argv.includes("--verbose") || argv.includes("-v");
const filtered = argv.filter(
  (a) => a !== "--json" && a !== "--verbose" && a !== "-v"
);

// Parse --timeout
let timeout = 10000;
const timeoutIdx = filtered.indexOf("--timeout");
if (timeoutIdx >= 0) {
  timeout = parseInt(filtered[timeoutIdx + 1], 10) || 10000;
  filtered.splice(timeoutIdx, 2);
}

// Parse --test (multiple)
const testTools: string[] = [];
let testIdx: number;
while ((testIdx = filtered.indexOf("--test")) >= 0) {
  testTools.push(filtered[testIdx + 1]);
  filtered.splice(testIdx, 2);
}

const command = filtered[0];
const args = filtered.slice(1);

if (!command) {
  console.error("Error: No command specified. Use --help for usage.");
  process.exit(1);
}

runHealthCheck(command, args, {
  timeout,
  verbose,
  testTools,
  jsonOutput,
}).then((results) => {
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log("\n🔍 MCP Health Check\n");

    const labelWidth = Math.max(
      ...results.map((r) =>
        r.step.startsWith("  ") ? r.step.length - 2 : r.step.length
      ),
      10
    );

    for (const r of results) {
      const icon =
        r.status === "pass" ? "✅" : r.status === "warn" ? "⚠️ " : "❌";
      const indent = r.step.startsWith("  ") ? "  " : "";
      const stepLabel = r.step.startsWith("  ")
        ? r.step.slice(2)
        : r.step;
      const timing = r.durationMs != null ? ` (${r.durationMs}ms)` : "";
      const line = `${indent}${icon} ${stepLabel.padEnd(labelWidth)} ${r.message}${timing}`;
      console.log(line);

      if (r.data && verbose) {
        const dataStr = JSON.stringify(r.data, null, 2);
        const indented = dataStr
          .split("\n")
          .map((l) => `${indent}   ${l}`)
          .join("\n");
        console.log(indented);
      } else if (r.data && !r.step.startsWith("  ")) {
        const short = JSON.stringify(r.data);
        if (short.length < 100) {
          console.log(`${indent}   ${short}`);
        }
      }
    }

    const passed = results.filter((r) => r.status === "pass").length;
    const warned = results.filter((r) => r.status === "warn").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const total = results.length;

    const summaryParts: string[] = [];
    if (passed > 0) summaryParts.push(`${passed} passed`);
    if (warned > 0) summaryParts.push(`${warned} warnings`);
    if (failed > 0) summaryParts.push(`${failed} failed`);
    console.log(`\n  ${summaryParts.join(", ")} · ${total} total\n`);
  }

  const hasFail = results.some((r) => r.status === "fail");
  process.exit(hasFail ? 1 : 0);
});
