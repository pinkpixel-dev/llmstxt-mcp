#!/usr/bin/env node
// Built with esbuild
import { Server as A } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport as O } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema as H,
  ListToolsRequestSchema as M,
  McpError as u,
  ErrorCode as p,
} from "@modelcontextprotocol/sdk/types.js";
import * as E from "node:fs/promises";
import * as C from "node:path";
import { fileURLToPath as j } from "node:url";
import { URL as $ } from "node:url";
import * as l from "node:path";
function m(e) {
  try {
    let t = new $(e);
    return `${t.protocol}//${t.host}/`;
  } catch {
    throw new Error(`Invalid URL: ${e}`);
  }
}
function i(e) {
  return e.startsWith("http:") || e.startsWith("https:");
}
function a(e) {
  return e.startsWith("file://") ? l.resolve(e.slice(7)) : l.resolve(e);
}
function L(e) {
  let t = [
    "Fetch and parse documentation from a given URL or local file.",
    "",
    "Use this tool after list_doc_sources to:",
    "1. First fetch the llms.txt file from a documentation source",
    "2. Analyze the URLs listed in the llms.txt file",
    "3. Then fetch specific documentation pages relevant to the user's question",
    "",
  ];
  return (
    e
      ? t.push(
          "Args:",
          "    url: The URL or file path to fetch documentation from. Can be:",
          "        - URL from an allowed domain",
          "        - A local file path (absolute or relative)",
          "        - A file:// URL (e.g., file:///path/to/llms.txt)",
        )
      : t.push("Args:", "    url: The URL to fetch documentation from."),
    t.push(
      "",
      "Returns:",
      "    The fetched documentation content converted to markdown, or an error message",
      "    if the request fails or the URL is not from an allowed domain.",
    ),
    t.join(`
`)
  );
}
import * as R from "node:fs/promises";
import b from "turndown";
var f = class {
  timeout;
  followRedirects;
  turndown;
  constructor(t) {
    ((this.timeout = t.timeout * 1e3),
      (this.followRedirects = t.followRedirects),
      (this.turndown = new b({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
      })));
  }
  async fetchContent(t) {
    return i(t) ? this.fetchRemoteUrl(t) : this.fetchLocalFile(t);
  }
  async fetchLocalFile(t) {
    try {
      let o = a(t);
      return {
        text: await R.readFile(o, "utf-8"),
        url: `file://${o}`,
        status: 200,
      };
    } catch (o) {
      throw new Error(`Error reading local file: ${o.message}`);
    }
  }
  async fetchRemoteUrl(t) {
    let o = new AbortController(),
      r = setTimeout(() => o.abort(), this.timeout);
    try {
      let n = await fetch(t, {
        signal: o.signal,
        redirect: this.followRedirects ? "follow" : "manual",
      });
      if (!n.ok) throw new Error(`HTTP ${n.status}: ${n.statusText}`);
      let w = await n.text(),
        y = w,
        g = n.url;
      if (this.followRedirects) {
        let x = w.match(
          /<meta http-equiv="refresh" content="[^;]+;\s*url=([^"]+)"/i,
        );
        if (x) {
          let U = new URL(x[1], n.url).href,
            S = await this.fetchRemoteUrl(U);
          ((y = S.text), (g = S.url));
        }
      }
      return { text: y, url: g, status: n.status };
    } catch (n) {
      throw n.name === "AbortError"
        ? new Error(`Request timeout after ${this.timeout}ms`)
        : n;
    } finally {
      clearTimeout(r);
    }
  }
  convertToMarkdown(t) {
    return this.turndown.turndown(t);
  }
  async fetchAndConvert(t) {
    let o = await this.fetchContent(t);
    return this.convertToMarkdown(o.text);
  }
};
function T(e) {
  return new f(e);
}
import * as P from "yaml";
var F = j(import.meta.url),
  nt = C.dirname(F),
  k = () => {
    let e = process.env.LLMSTXT_CONFIG;
    return {
      docSources: [
        {
          name: "LLMSTXT Directory (Cloud)",
          llms_txt: "https://directory.llmstxt.cloud/",
          description:
            "Curated directory of products and companies using the llms.txt standard",
        },
        {
          name: "LLMSTXT Site Directory",
          llms_txt: "https://llmstxt.site/",
          description:
            "Comprehensive list of llms.txt files across the web with stats",
        },
      ],
      followRedirects: process.env.LLMSTXT_FOLLOW_REDIRECTS === "true",
      timeout: parseFloat(process.env.LLMSTXT_TIMEOUT || "10"),
      allowedDomains: process.env.LLMSTXT_ALLOWED_DOMAINS?.split(",") || ["*"],
    };
  },
  s = k(),
  v = T({ timeout: s.timeout, followRedirects: s.followRedirects }),
  h = [],
  _ = [];
for (let e of s.docSources) i(e.llms_txt) ? _.push(e) : h.push(e);
var c = new Set();
for (let e of _) c.add(m(e.llms_txt));
s.allowedDomains &&
  (s.allowedDomains.includes("*")
    ? c.add("*")
    : s.allowedDomains.forEach((e) => c.add(e)));
var D = new Set(h.map((e) => a(e.llms_txt))),
  d = new A(
    { name: "llmstxt-mcp", version: "1.0.4" },
    { capabilities: { tools: {} } },
  );
d.setRequestHandler(M, async () => ({
  tools: [
    {
      name: "list_doc_sources",
      description: "List all configured documentation sources",
      inputSchema: { type: "object", properties: {}, additionalProperties: !1 },
    },
    {
      name: "fetch_docs",
      description: L(h.length > 0),
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL or file path to fetch documentation from",
          },
        },
        required: ["url"],
        additionalProperties: !1,
      },
    },
  ],
}));
d.setRequestHandler(H, async (e) => {
  let { name: t, arguments: o } = e.params;
  try {
    if (t === "list_doc_sources") return await q();
    if (t === "fetch_docs") return await I(o?.url);
    throw new u(p.MethodNotFound, `Unknown tool: ${t}`);
  } catch (r) {
    throw r instanceof u
      ? r
      : new u(p.InternalError, `Error executing tool: ${r.message}`);
  }
});
async function q() {
  let e = "";
  for (let t of s.docSources) {
    let o = t.llms_txt;
    if (i(o)) {
      let r = t.name || m(o);
      e += `${r}
URL: ${o}

`;
    } else {
      let r = a(o),
        n = t.name || r;
      e += `${n}
Path: ${r}

`;
    }
  }
  return { content: [{ type: "text", text: e }] };
}
async function I(e) {
  if (!e) throw new u(p.InvalidParams, "Missing required parameter: url");
  try {
    let t = e.trim();
    if (!i(t)) {
      let o = a(t);
      if (!D.has(o))
        return {
          content: [
            {
              type: "text",
              text: `Error: Local file not allowed: ${o}. Allowed files: ${Array.from(D).join(", ")}`,
            },
          ],
          isError: !0,
        };
      try {
        let r = await E.readFile(o, "utf-8");
        return { content: [{ type: "text", text: v.convertToMarkdown(r) }] };
      } catch (r) {
        return {
          content: [{ type: "text", text: `Error reading local file: ${r}` }],
          isError: !0,
        };
      }
    }
    if (!c.has("*") && !Array.from(c).some((o) => t.startsWith(o)))
      return {
        content: [
          {
            type: "text",
            text: `Error: URL not allowed. Must start with one of the following domains: ${Array.from(c).join(", ")}`,
          },
        ],
        isError: !0,
      };
    try {
      return { content: [{ type: "text", text: await v.fetchAndConvert(t) }] };
    } catch (o) {
      return {
        content: [{ type: "text", text: `Encountered an HTTP error: ${o}` }],
        isError: !0,
      };
    }
  } catch (t) {
    return {
      content: [{ type: "text", text: `Unexpected error: ${t}` }],
      isError: !0,
    };
  }
}
async function N() {
  let e = new O();
  (await d.connect(e), console.error("LLMSTXT MCP server running"));
}
N().catch((e) => {
  (console.error("Server error:", e), process.exit(1));
});
