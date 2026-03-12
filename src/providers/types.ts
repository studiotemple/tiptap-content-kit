/**
 * Configuration interfaces for external service integrations.
 * Users implement these to connect their own providers.
 */

export interface ConfluenceCredentials {
  accessToken: string;
  cloudId: string;
  siteUrl: string;
}

export interface ConfluenceConfig {
  /** Returns OAuth credentials for Confluence API calls */
  getCredentials: (userId: string) => Promise<ConfluenceCredentials>;
  siteUrl?: string;
}

export interface LLMProvider {
  /** Generate text from a prompt */
  generateText: (prompt: string, options?: { systemPrompt?: string; temperature?: number }) => Promise<string>;
}

export interface StorageProvider {
  /** Upload a file and return its public URL */
  upload: (buffer: Buffer, key: string, contentType: string) => Promise<string>;
}

export interface GitHubConfig {
  token: string;
  enterpriseHost?: string;
}

export interface ContentKitConfig {
  confluence?: ConfluenceConfig;
  llm?: LLMProvider;
  storage?: StorageProvider;
  github?: GitHubConfig;
}
