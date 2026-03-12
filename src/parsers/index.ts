/**
 * Parser module re-exports
 */

// File parser (PDF, DOCX, DOC, MD, TXT)
export { parseFile, isSupportedFileType, MAX_FILE_SIZE } from './file-parser';
export type { ParsedFile } from './file-parser';

// Markdown → DocumentBlock[]
export { markdownToBlocks } from './markdown-to-blocks';

// DOCX HTML → DocumentBlock[]
export { docxHtmlToBlocks, smartFormatLegalDoc } from './docx-to-blocks';

// Confluence XHTML → DocumentBlock[]
export {
  parseConfluenceContent,
  extractConfluenceTitle,
  replaceMentionIds,
} from './confluence-to-blocks';
export type {
  ConfluenceParserOptions,
  ConfluenceUserInfo,
} from './confluence-to-blocks';

// Confluence Storage Format → Markdown
export { parseConfluenceStorageToMarkdown } from './confluence-to-markdown';
export type { ConfluenceMarkdownParserOptions } from './confluence-to-markdown';
