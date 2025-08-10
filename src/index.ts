#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocSource } from './types/index.js';
import {
  extractDomain,
  isHttpOrHttps,
  normalizePath,
  getFetchDescription,
  createHttpClient
} from './utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration - can be customized via environment variables
const getDefaultConfig = () => {
  // Try to load from environment or use fallback
  const configPath = process.env.LLMSTXT_CONFIG;
  
  // Default doc sources - you can modify these or load from config
  const defaultDocSources: DocSource[] = [
    {
      name: "LLMSTXT Directory (Cloud)",
      llms_txt: "https://directory.llmstxt.cloud/",
      description: "Curated directory of products and companies using the llms.txt standard"
    },
    {
      name: "LLMSTXT Site Directory", 
      llms_txt: "https://llmstxt.site/",
      description: "Comprehensive list of llms.txt files across the web with stats"
    }
  ];

  return {
    docSources: defaultDocSources,
    followRedirects: process.env.LLMSTXT_FOLLOW_REDIRECTS === 'true',
    timeout: parseFloat(process.env.LLMSTXT_TIMEOUT || '10'),
    allowedDomains: process.env.LLMSTXT_ALLOWED_DOMAINS?.split(',') || ['*']
  };
};

// Create the MCP server
const config = getDefaultConfig();
const httpClient = createHttpClient({ timeout: config.timeout, followRedirects: config.followRedirects });

// Separate local and remote sources
const localSources: DocSource[] = [];
const remoteSources: DocSource[] = [];

for (const source of config.docSources) {
  if (isHttpOrHttps(source.llms_txt)) {
    remoteSources.push(source);
  } else {
    localSources.push(source);
  }
}

// Build allowed domains set
const domains = new Set<string>();
for (const source of remoteSources) {
  domains.add(extractDomain(source.llms_txt));
}

// Add additional allowed domains
if (config.allowedDomains) {
  if (config.allowedDomains.includes('*')) {
    domains.add('*'); // Special marker for allowing all domains
  } else {
    config.allowedDomains.forEach(domain => domains.add(domain));
  }
}

// Create set of allowed local files
const allowedLocalFiles = new Set(
  localSources.map(source => normalizePath(source.llms_txt))
);

const server = new Server(
  {
    name: "llmstxt-mcp",
    version: "1.0.4",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_doc_sources",
        description: "List all configured documentation sources",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "fetch_docs", 
        description: getFetchDescription(localSources.length > 0),
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL or file path to fetch documentation from"
            }
          },
          required: ["url"],
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool calls
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
    throw new McpError(ErrorCode.InternalError, `Error executing tool: ${(error as Error).message}`);
  }
});

// Tool implementation functions
async function handleListDocSources() {
  let content = '';
  
  for (const source of config.docSources) {
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
    content: [{ type: 'text', text: content }]
  };
}

async function handleFetchDocs(url: string) {
  if (!url) {
    throw new McpError(ErrorCode.InvalidParams, "Missing required parameter: url");
  }
  
  try {
    const trimmedUrl = url.trim();
    
    // Handle local file paths
    if (!isHttpOrHttps(trimmedUrl)) {
      const absPath = normalizePath(trimmedUrl);
      
      if (!allowedLocalFiles.has(absPath)) {
        return {
          content: [{
            type: 'text',
            text: `Error: Local file not allowed: ${absPath}. Allowed files: ${Array.from(allowedLocalFiles).join(', ')}`
          }],
          isError: true
        };
      }
      
      try {
        const fileContent = await fs.readFile(absPath, 'utf-8');
        const markdown = httpClient.convertToMarkdown(fileContent);
        
        return {
          content: [{ type: 'text', text: markdown }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text', 
            text: `Error reading local file: ${error}`
          }],
          isError: true
        };
      }
    }
    
    // Handle remote URLs
    if (!domains.has('*') && !Array.from(domains).some(domain => trimmedUrl.startsWith(domain))) {
      return {
        content: [{
          type: 'text',
          text: `Error: URL not allowed. Must start with one of the following domains: ${Array.from(domains).join(', ')}`
        }],
        isError: true
      };
    }
    
    try {
      const markdown = await httpClient.fetchAndConvert(trimmedUrl);
      return {
        content: [{ type: 'text', text: markdown }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Encountered an HTTP error: ${error}`
        }],
        isError: true
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Unexpected error: ${error}`
      }],
      isError: true
    };
  }
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`LLMSTXT MCP server running`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
