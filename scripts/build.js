#!/usr/bin/env node
/**
 * Production build script for LLMSTXT-MCP server
 */

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

async function buildServer() {
  try {
    console.log("Building LLMSTXT-MCP server...");

    await build({
      entryPoints: [join(rootDir, "src/index.ts")],
      outfile: join(rootDir, "build/index.js"),
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      minify: true,
      sourcemap: false,
      external: [
        // Keep these as external to avoid bundling
        "@modelcontextprotocol/sdk",
        "turndown",
        "yaml",
        "yargs",
        "zod",
      ],
      banner: {
        js: "// Built with esbuild",
      },
      define: {
        "import.meta.url": "import.meta.url",
      },
    });

    console.log("✅ Build completed successfully!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildServer();
