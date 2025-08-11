/**
 * LLMS-TXT MCP Server Creation
 *
 * This module creates an MCP server that provides tools for fetching
 * and processing llms.txt documentation, similar to the Python implementation.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { DocSource, ServerOptions } from "../types";
import {
  extractDomain,
  isHttpOrHttps,
  normalizePath,
  getFetchDescription,
  getServerInstructions,
  createHttpClient,
} from "../utils";

/**
 * Create the LLMS-TXT MCP server
 */
export function createLlmsTxtServer(
  name: string,
  version: string,
  options: ServerOptions,
): Server {
  const server = new Server({ name, version }, { capabilities: { tools: {} } });

  const {
    docSources,
    followRedirects = false,
    timeout = 10,
    allowedDomains = [],
  } = options;

  // Create HTTP client for fetching content
  const httpClient = createHttpClient({ timeout, followRedirects });

  // Separate local and remote sources
  const localSources: DocSource[] = [];
  const remoteSources: DocSource[] = [];

  for (const source of docSources) {
    if (isHttpOrHttps(source.llms_txt)) {
      remoteSources.push(source);
    } else {
      localSources.push(source);
    }
  }

  // Validate local sources exist
  for (const source of localSources) {
    const absPath = normalizePath(source.llms_txt);
    // Note: We'll validate file existence during tool execution
    // to avoid async operations during server setup
  }

  // Build allowed domains set
  const domains = new Set<string>();
  for (const source of remoteSources) {
    domains.add(extractDomain(source.llms_txt));
  }

  // Add additional allowed domains
  if (allowedDomains) {
    if (allowedDomains.includes("*")) {
      domains.add("*"); // Special marker for allowing all domains
    } else {
      allowedDomains.forEach((domain) => domains.add(domain));
    }
  }

  // Create set of allowed local files
  const allowedLocalFiles = new Set(
    localSources.map((source) => normalizePath(source.llms_txt)),
  );

  // Register MCP tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_doc_sources",
          description: "List all configured documentation sources",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "fetch_docs",
          description: getFetchDescription(localSources.length > 0),
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL or file path to fetch documentation from",
              },
            },
            required: ["url"],
            additionalProperties: false,
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "list_doc_sources") {
        return await handleListDocSources();
      } else if (name === "fetch_docs") {
        return await handleFetchDocs(args?.url as string);
      } else {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Error executing tool: ${(error as Error).message}`,
      );
    }
  });

  // Tool implementation functions
  async function handleListDocSources() {
    let content = "";

    for (const source of docSources) {
      const urlOrPath = source.llms_txt;

      if (isHttpOrHttps(urlOrPath)) {
        const name = source.name || extractDomain(urlOrPath);
        content += `${name}\nURL: ${urlOrPath}\n\n`;
      } else {
        const absPath = normalizePath(urlOrPath);
        const name = source.name || absPath;
        content += `${name}\nPath: ${absPath}\n\n`;
      }
    }

    return {
      content: [{ type: "text", text: content }],
    };
  }

  async function handleFetchDocs(url: string) {
    if (!url) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required parameter: url",
      );
    }

    try {
      const trimmedUrl = url.trim();

      // Handle local file paths
      if (!isHttpOrHttps(trimmedUrl)) {
        const absPath = normalizePath(trimmedUrl);

        if (!allowedLocalFiles.has(absPath)) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Local file not allowed: ${absPath}. Allowed files: ${Array.from(allowedLocalFiles).join(", ")}`,
              },
            ],
            isError: true,
          };
        }

        try {
          const fileContent = await fs.readFile(absPath, "utf-8");
          const markdown = httpClient.convertToMarkdown(fileContent);

          return {
            content: [{ type: "text", text: markdown }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error reading local file: ${error}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Handle remote URLs
      if (
        !domains.has("*") &&
        !Array.from(domains).some((domain) => trimmedUrl.startsWith(domain))
      ) {
        return {
          content: [
            {
              type: "text",
              text: `Error: URL not allowed. Must start with one of the following domains: ${Array.from(domains).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const markdown = await httpClient.fetchAndConvert(trimmedUrl);
        return {
          content: [{ type: "text", text: markdown }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Encountered an HTTP error: ${error}`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  return server;
}
