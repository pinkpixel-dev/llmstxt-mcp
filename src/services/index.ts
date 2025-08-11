import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { stdioServer } from "./stdio";
import { createLlmsTxtServer } from "./llmstxt-server";
import type { OptionsType, ParsedConfig } from "@/types";

export * from "./llmstxt-server";
export * from "./stdio";

// Legacy function - we'll update this in the CLI conversion task
export async function startStdioServer(options: OptionsType) {
  // This will be updated when we implement the CLI
  console.log("Starting stdio server with options:", options);
  // Placeholder implementation
}
