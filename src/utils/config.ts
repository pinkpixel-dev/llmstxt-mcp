/**
 * Configuration file loading and parsing utilities
 *
 * These functions correspond to the Python CLI configuration parsing
 * functionality from the original mcpdoc server.
 */

import * as fs from "node:fs/promises";
import * as yaml from "yaml";
import type { DocSource, ParsedConfig, OptionsType } from "../types";
import { isHttpOrHttps } from "./llmstxt";

/**
 * Load configuration from a YAML or JSON file.
 *
 * @param filePath Path to the config file
 * @param fileFormat Format of the config file ("yaml" or "json")
 * @returns List of doc source configurations
 */
export async function loadConfigFile(
  filePath: string,
  fileFormat: "yaml" | "json",
): Promise<DocSource[]> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");

    let config: any;
    if (fileFormat.toLowerCase() === "yaml") {
      config = yaml.parse(fileContent);
    } else if (fileFormat.toLowerCase() === "json") {
      config = JSON.parse(fileContent);
    } else {
      throw new Error(`Unsupported file format: ${fileFormat}`);
    }

    if (!Array.isArray(config)) {
      throw new Error("Config file must contain a list of doc sources");
    }

    // Validate each doc source
    for (const source of config) {
      if (typeof source !== "object" || !source.llms_txt) {
        throw new Error("Each doc source must have a llms_txt field");
      }
    }

    return config as DocSource[];
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`Config file not found: ${filePath}`);
    }
    throw new Error(`Error loading config file: ${(error as Error).message}`);
  }
}

/**
 * Create doc sources from a list of URLs or file paths with optional names.
 *
 * @param urls List of llms.txt URLs or file paths with optional names
 *             (format: 'url_or_path' or 'name:url_or_path')
 * @returns List of DocSource objects
 */
export function createDocSourcesFromUrls(urls: string[]): DocSource[] {
  const docSources: DocSource[] = [];

  for (const entry of urls) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) {
      continue;
    }

    // Check if entry has name:url format (but not for URLs that start with http: or https:)
    if (
      trimmedEntry.includes(":") &&
      !trimmedEntry.startsWith("http:") &&
      !trimmedEntry.startsWith("https:")
    ) {
      const colonIndex = trimmedEntry.indexOf(":");
      const name = trimmedEntry.substring(0, colonIndex);
      const url = trimmedEntry.substring(colonIndex + 1);

      docSources.push({
        name,
        llms_txt: url,
      });
    } else {
      // Format is just url/path
      docSources.push({
        llms_txt: trimmedEntry,
      });
    }
  }

  return docSources;
}

/**
 * Parse and merge configuration from all sources (CLI, YAML, JSON)
 *
 * @param options CLI options
 * @returns Parsed configuration ready for server creation
 */
export async function parseConfig(options: OptionsType): Promise<ParsedConfig> {
  const docSources: DocSource[] = [];

  // Load doc sources from YAML file if provided
  if (options.yaml) {
    const yamlSources = await loadConfigFile(options.yaml, "yaml");
    docSources.push(...yamlSources);
  }

  // Load doc sources from JSON file if provided
  if (options.json) {
    const jsonSources = await loadConfigFile(options.json, "json");
    docSources.push(...jsonSources);
  }

  // Parse URLs from command line if provided
  if (options.urls && options.urls.length > 0) {
    const urlStrings = Array.isArray(options.urls)
      ? options.urls.map((u) => String(u))
      : [String(options.urls)];
    const urlSources = createDocSourcesFromUrls(urlStrings);
    docSources.push(...urlSources);
  }

  if (docSources.length === 0) {
    throw new Error(
      "No documentation sources configured. Use --yaml, --json, or --urls options.",
    );
  }

  // Process allowed domains
  let allowedDomains: string[] | undefined;
  if (options.allowedDomains && options.allowedDomains.length > 0) {
    allowedDomains = Array.isArray(options.allowedDomains)
      ? options.allowedDomains.map((d) => String(d))
      : [String(options.allowedDomains)];
  }

  return {
    docSources,
    followRedirects: options.followRedirects || false,
    timeout: options.timeout || 10.0,
    allowedDomains,
  };
}

/**
 * Display splash screen for SSE mode (matches Python version)
 */
export function displaySplash(): void {
  const splash = `
╔═══════════════════════════════════════╗
║              LLMSTXT-MCP              ║
║         Documentation Server          ║
╚═══════════════════════════════════════╝
`;
  console.log(splash);
}
