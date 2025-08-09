/**
 * Types for LLMS-TXT Documentation Server
 * 
 * These interfaces correspond to the Python TypedDict definitions
 * from the original mcpdoc server.
 */

/**
 * A source of documentation for a library or package.
 */
export interface DocSource {
  /**
   * Name of the documentation source (optional).
   */
  name?: string;
  
  /**
   * URL to the llms.txt file or documentation source.
   */
  llms_txt: string;
  
  /**
   * Description of the documentation source (optional).
   */
  description?: string;
}

/**
 * Server creation options
 */
export interface ServerOptions {
  /**
   * List of documentation sources to make available
   */
  docSources: DocSource[];
  
  /**
   * Whether to follow HTTP redirects when fetching docs
   */
  followRedirects?: boolean;
  
  /**
   * HTTP request timeout in seconds
   */
  timeout?: number;
  
  /**
   * Additional domains to allow fetching from.
   * Use ['*'] to allow all domains.
   * The domain hosting the llms.txt file is always added.
   */
  allowedDomains?: string[];
}

/**
 * HTTP client response interface
 */
export interface HttpResponse {
  text: string;
  url: string;
  status: number;
}
