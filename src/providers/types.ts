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

export interface LLMGenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM provider interface — works with any LLM (OpenAI, Anthropic, Google, Ollama, etc.)
 * Implement this interface to plug in your preferred model.
 */
export interface LLMProvider {
  /** Generate text from a prompt using any LLM */
  generateText: (prompt: string, options?: LLMGenerateOptions) => Promise<string>;
}

export interface StorageProvider {
  /** Upload a file and return its public URL */
  upload: (buffer: Buffer, key: string, contentType: string) => Promise<string>;
}

export interface ContentKitConfig {
  confluence?: ConfluenceConfig;
  llm?: LLMProvider;
  storage?: StorageProvider;
}
