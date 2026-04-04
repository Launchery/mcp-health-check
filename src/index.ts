#!/usr/bin/env node

/**
 * mcp-health-check
 *
 * CLI utility to verify that an MCP server is working correctly.
 * Spawns the server as a child process, runs initialize + tools/list + optional test call.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";

interface CheckResult {
  step: string;
  status: "pass" | "fail" | "warn";
  message: string;
  data?: unknown;
}

async function runHealthCheck(
  command: string,
  args: string[],
  testTool?: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  let childProcess: ChildProcess | null = null;

  try {
    // Step 1: Spawn the server
    childProcess = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const transport = new StdioClientTransport({
      stdin: childProcess.stdin!,
      stdout: childProcess.stdout!,
    });

    const client = new Client(
      { name: "mcp-health-check", version: "1.0.0" },
      { capabilities: {} }
    );

    // Step 2: Initialize
    try {
      const initResult = await client.connect(transport);
      results.push({
        step: "initialize",
        status: "pass",
        message: "Server initialized successfully",
        data: {
          name: initResult.serverInfo?.name,
          version: initResult.serverInfo?.version,
          protocolVersion: initResult.protocolVersion,
        },
      });
    } catch (e) {
      results.push({
        step: "initialize",
        status: "fail",
        message: `Initialize failed: ${(e as Error).message}`,
      });
      return results;
    }

    // Step 3: List tools
    try {
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools || [];
      results.push({
        step: "tools/list",
        status: tools.length > 0 ? "pass" : "warn",
        message:
          tools.length > 0
            ? `Found ${tools.length} tool(s)`
            : "No tools registered",
        data: tools.map((t) => ({
          name: t.name,
          description: t.description?.slice(0, 80),
        })),
      });
    } catch (e) {
      results.push({
        step: "tools/list",
        status: "fail",
        message: `Tools list failed: ${(e as Error).message}`,
      });
    }

    // Step 4: List resources
    try {
      const resourcesResult = await client.listResources();
      const resources = resourcesResult.resources || [];
      results.push({
        step: "resources/list",
        status: resources.length > 0 ? "pass" : "warn",
        message:
          resources.length > 0
            ? `Found ${resources.length} resource(s)`
            : "No resources registered",
        data: resources.slice(0, 10).map((r) => ({
          uri: r.uri,
          name: r.name,
        })),
      });
    } catch (e) {
      results.push({
        step: "resources/list",
        status: "warn",
        message: `Resources list failed: ${(e as Error).message}`,
      });
    }

    // Step 5: Optional test tool call
    if (testTool) {
      try {
        const callResult = await client.callTool({
          name: testTool,
          arguments: {},
        });
        results.push({
          step: `tool call: ${testTool}`,
          status: "pass",
          message: "Tool call succeeded",
          data: callResult.content?.slice(0, 3),
        });
      } catch (e) {
        results.push({
          step: `tool call: ${testTool}`,
          status: "fail",
          message: `Tool call failed: ${(e as Error).message}`,
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
    if (childProcess) {
      childProcess.kill();
    }
  }

  return results;
}

// CLI
const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(`
mcp-health-check — Verify your MCP server is working

Usage:
  mcp-health-check <command> [args...] [--test <tool-name>]

Examples:
  mcp-health-check node dist/index.js
  mcp-health-check node dist/index.js --test echo
  mcp-health-check python server.py

Options:
  --test <tool>   Call a tool after initialization (with empty args)
  --json          Output results as JSON
  --help, -h      Show this help
`);
  process.exit(0);
}

const jsonOutput = argv.includes("--json");
const filtered = argv.filter((a) => a !== "--json");
const testIdx = filtered.indexOf("--test");
const testTool = testIdx >= 0 ? filtered[testIdx + 1] : undefined;
const commandArgs = testIdx >= 0
  ? [...filtered.slice(0, testIdx), ...filtered.slice(testIdx + 2)]
  : filtered;

const command = commandArgs[0];
const args = commandArgs.slice(1);

runHealthCheck(command, args, testTool).then((results) => {
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log("\n🔍 MCP Health Check Results\n");
    for (const r of results) {
      const icon = r.status === "pass" ? "✅" : r.status === "warn" ? "⚠️" : "❌";
      console.log(`  ${icon} ${r.step}: ${r.message}`);
      if (r.data && typeof r.data === "object") {
        console.log(`     ${JSON.stringify(r.data)}`);
      }
    }

    const passed = results.filter((r) => r.status === "pass").length;
    const total = results.length;
    console.log(`\n  ${passed}/${total} checks passed\n`);
  }

  const hasFail = results.some((r) => r.status === "fail");
  process.exit(hasFail ? 1 : 0);
});
