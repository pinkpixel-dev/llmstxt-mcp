# LLMSTXT-MCP Server

A Model Context Protocol (MCP) server that provides access to LLMS.TXT documentation files. This server allows AI agents to fetch and process documentation from various sources.

## Features

- **Multiple Documentation Sources**: Access documentation from React, Next.js, Node.js and more
- **HTTP Fetching**: Fetch documentation from any HTTPS URL with domain restrictions
- **HTML to Markdown**: Automatically converts HTML content to clean Markdown
- **Environment Configuration**: Customize behavior via environment variables
- **MCP Protocol**: Full Model Context Protocol compliance

## Installation

```bash
npm install -g @pinkpixel/llmstxt-mcp
```

## Usage

The server starts automatically and provides two tools:

### Available Tools

1. **`list_doc_sources`** - Lists all configured documentation sources
2. **`fetch_docs`** - Fetches documentation from a URL and converts to Markdown

### Default Configuration

By default, the server is configured with:

- **React documentation**: `https://react.dev/llms.txt`
- **Next.js documentation**: `https://nextjs.org/llms.txt`
- **Node.js documentation**: `https://nodejs.org/llms.txt`
- **LLMSTXT Directory (Cloud)**: `https://directory.llmstxt.cloud/` - Curated directory of companies using llms.txt
- **LLMSTXT Site Directory**: `https://llmstxt.site/` - Comprehensive list with token counts and stats

### Discovery Directories

The two directory sources provide access to **thousands** of websites that have adopted the llms.txt standard:

- **directory.llmstxt.cloud** - Curated directory with companies like Anthropic, Supabase, Modal, NVIDIA, and many others across AI, developer tools, finance, and products categories
- **llmstxt.site** - Comprehensive searchable directory with detailed statistics and token counts for each llms.txt file

These directories are invaluable for discovering documentation from the growing ecosystem of companies adopting the llms.txt standard.

### Environment Variables

Customize behavior with these environment variables:

- `LLMSTXT_CONFIG`: Path to custom configuration file (not implemented yet)
- `LLMSTXT_FOLLOW_REDIRECTS`: Whether to follow HTTP redirects (`true`/`false`)
- `LLMSTXT_TIMEOUT`: Request timeout in seconds (default: `10`)
- `LLMSTXT_ALLOWED_DOMAINS`: Comma-separated list of allowed domains (default: `*` for all)

Example:

```bash
export LLMSTXT_FOLLOW_REDIRECTS=true
export LLMSTXT_TIMEOUT=30
export LLMSTXT_ALLOWED_DOMAINS="react.dev,nextjs.org,nodejs.org"
```

## MCP Client Configuration

You can install globally with npm i -g @pinkpixel/llmstxt-mcp and then it can be ran with "llmstxt-mcp"

Add to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "llmstxt": {
      "command": "llmstxt-mcp",
      "env": {
        "LLMSTXT_FOLLOW_REDIRECTS": "true",
        "LLMSTXT_TIMEOUT": "30"
      }
    }
  }
}
```

OR use with npx

```json
{
  "mcpServers": {
    "llmstxt": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/llmstxt-mcp", "llmstxt-mcp"],
      "env": {
        "LLMSTXT_FOLLOW_REDIRECTS": "true",
        "LLMSTXT_TIMEOUT": "30"
      }
    }
  }
}
```

## Testing

### Test with MCP Inspector

```bash
# Build first
npm run build

# Test with inspector
npm run inspector

# Or directly
npx @modelcontextprotocol/inspector ./build/index.js
```

### Manual Testing

```bash
# List available tools
npx @modelcontextprotocol/inspector --cli ./build/index.js --method tools/list

# List doc sources
npx @modelcontextprotocol/inspector --cli ./build/index.js --method tools/call --tool-name list_doc_sources

# Fetch documentation
npx @modelcontextprotocol/inspector --cli ./build/index.js --method tools/call --tool-name fetch_docs --tool-arg url="https://example.com"
```

## Security

- **Domain Restrictions**: Configure allowed domains via environment variables
- **HTTPS Recommended**: Always use HTTPS URLs when possible
- **No Local Files**: Current version only supports HTTP/HTTPS URLs

## Development

```bash
# Clone the repository
git clone https://github.com/pinkpixel-dev/llmstxt-mcp.git
cd llmstxt-mcp

# Install dependencies
npm install

# Build the server
npm run build

# Test with inspector
npm run inspector
```

## Error Handling

The server provides detailed error messages for:

- Invalid or unreachable URLs
- Domain restriction violations
- Timeout errors
- HTTP errors (404, 500, etc.)

## License

MIT License - see LICENSE file for details.

---

Made with ❤️ by [Pink Pixel](https://pinkpixel.dev)
