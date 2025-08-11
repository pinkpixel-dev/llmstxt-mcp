/**
 * HTTP Client and Markdown Conversion utilities
 *
 * This module handles fetching content from URLs and converting
 * HTML to markdown, similar to the Python implementation.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import TurndownService from "turndown";
import type { HttpResponse, DocSource } from "../types";
import { isHttpOrHttps, normalizePath } from "../utils";

/**
 * HTTP client configuration
 */
interface HttpClientOptions {
  timeout: number;
  followRedirects: boolean;
}

/**
 * HTTP client class for fetching documentation
 */
export class HttpClient {
  private timeout: number;
  private followRedirects: boolean;
  private turndown: TurndownService;

  constructor(options: HttpClientOptions) {
    this.timeout = options.timeout * 1000; // Convert to milliseconds
    this.followRedirects = options.followRedirects;

    // Initialize Turndown for HTML to Markdown conversion
    this.turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
  }

  /**
   * Fetch content from URL or local file
   */
  async fetchContent(url: string): Promise<HttpResponse> {
    if (!isHttpOrHttps(url)) {
      // Handle local file
      return this.fetchLocalFile(url);
    }

    // Handle HTTP/HTTPS URL
    return this.fetchRemoteUrl(url);
  }

  /**
   * Fetch content from local file
   */
  private async fetchLocalFile(filePath: string): Promise<HttpResponse> {
    try {
      const absolutePath = normalizePath(filePath);
      const content = await fs.readFile(absolutePath, "utf-8");

      return {
        text: content,
        url: `file://${absolutePath}`,
        status: 200,
      };
    } catch (error) {
      throw new Error(`Error reading local file: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch content from remote URL
   */
  private async fetchRemoteUrl(url: string): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: this.followRedirects ? "follow" : "manual",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      // Handle meta refresh redirects if following redirects is enabled
      let finalText = text;
      let finalUrl = response.url;

      if (this.followRedirects) {
        const metaRefreshMatch = text.match(
          /<meta http-equiv="refresh" content="[^;]+;\s*url=([^"]+)"/i,
        );

        if (metaRefreshMatch) {
          const redirectUrl = new URL(metaRefreshMatch[1], response.url).href;
          const redirectResponse = await this.fetchRemoteUrl(redirectUrl);
          finalText = redirectResponse.text;
          finalUrl = redirectResponse.url;
        }
      }

      return {
        text: finalText,
        url: finalUrl,
        status: response.status,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Convert HTML content to markdown
   */
  convertToMarkdown(html: string): string {
    return this.turndown.turndown(html);
  }

  /**
   * Fetch and convert content to markdown
   */
  async fetchAndConvert(url: string): Promise<string> {
    const response = await this.fetchContent(url);
    return this.convertToMarkdown(response.text);
  }
}

/**
 * Create HTTP client instance
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}
