/**
 * Utility functions for LLMS-TXT Documentation Server
 * 
 * These functions correspond to the Python utility functions
 * from the original mcpdoc server.
 */

import { URL } from 'node:url';
import * as path from 'node:path';
import type { DocSource } from '../types';

/**
 * Extract domain from URL.
 * 
 * @param url Full URL
 * @returns Domain with scheme and trailing slash (e.g., https://example.com/)
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/`;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Check if the URL is an HTTP or HTTPS URL.
 */
export function isHttpOrHttps(url: string): boolean {
  return url.startsWith('http:') || url.startsWith('https:');
}

/**
 * Accept paths in file:/// or relative format and map to absolute paths.
 */export function normalizePath(pathInput: string): string {
  if (pathInput.startsWith('file://')) {
    return path.resolve(pathInput.slice(7));
  }
  return path.resolve(pathInput);
}

/**
 * Get fetch docs tool description.
 */
export function getFetchDescription(hasLocalSources: boolean): string {
  const description = [
    'Fetch and parse documentation from a given URL or local file.',
    '',
    'Use this tool after list_doc_sources to:',
    '1. First fetch the llms.txt file from a documentation source',
    '2. Analyze the URLs listed in the llms.txt file', 
    '3. Then fetch specific documentation pages relevant to the user\'s question',
    ''
  ];

  if (hasLocalSources) {
    description.push(
      'Args:',
      '    url: The URL or file path to fetch documentation from. Can be:',
      '        - URL from an allowed domain',
      '        - A local file path (absolute or relative)',
      '        - A file:// URL (e.g., file:///path/to/llms.txt)'
    );
  } else {
    description.push(
      'Args:',
      '    url: The URL to fetch documentation from.'
    );
  }

  description.push(
    '',
    'Returns:',
    '    The fetched documentation content converted to markdown, or an error message',
    '    if the request fails or the URL is not from an allowed domain.'
  );

  return description.join('\n');
}

/**
 * Generate server instructions with available documentation source names.
 */
export function getServerInstructions(docSources: DocSource[]): string {
  // Extract source names from doc_sources
  const sourceNames: string[] = [];
  
  for (const entry of docSources) {
    if (entry.name) {
      sourceNames.push(entry.name);
    } else if (isHttpOrHttps(entry.llms_txt)) {
      // Use domain name as fallback for HTTP sources  
      const domain = extractDomain(entry.llms_txt);
      sourceNames.push(domain.replace(/^https?:\/\/|\/$/g, ''));
    } else {
      // Use filename as fallback for local sources
      sourceNames.push(path.basename(entry.llms_txt));
    }
  }

  const instructions = [
    'Use the list_doc_sources tool to see available documentation sources.',
    'This tool will return a URL for each documentation source.'
  ];

  if (sourceNames.length > 0) {
    if (sourceNames.length === 1) {
      instructions.push(
        `Documentation URLs are available from this tool for ${sourceNames[0]}.`
      );
    } else {
      const namesStr = sourceNames.slice(0, -1).join(', ') + `, and ${sourceNames[sourceNames.length - 1]}`;
      instructions.push(
        `Documentation URLs are available from this tool for ${namesStr}.`
      );
    }
  }

  instructions.push(
    '',
    'Once you have a source documentation URL, use the fetch_docs tool ' +
    'to get the documentation contents. ',
    'If the documentation contents contains a URL for additional documentation ' +
    'that is relevant to your task, you can use the fetch_docs tool to ' +
    'fetch documentation from that URL next.'
  );

  return instructions.join('\n');
}
