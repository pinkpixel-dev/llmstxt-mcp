import type { DocSource } from "./llmstxt";

export interface OptionsType {
  name: string;
  version: string;
  // CLI-specific options
  urls?: string[];
  yaml?: string;
  json?: string;
  followRedirects?: boolean;
  allowedDomains?: string[];
  timeout?: number;
  transport?: string;
  host?: string;
  port?: number;
  logLevel?: string;
}

/**
 * Parsed configuration from all sources (CLI, YAML, JSON)
 */
export interface ParsedConfig {
  docSources: DocSource[];
  followRedirects: boolean;
  timeout: number;
  allowedDomains?: string[];
}
