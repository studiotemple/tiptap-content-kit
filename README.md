# tiptap-content-kit

Production-hardened content parsers and Tiptap extensions for converting Markdown, DOCX, PDF, Confluence, and more into Tiptap-compatible document blocks.

[![npm version](https://img.shields.io/npm/v/tiptap-content-kit)](https://www.npmjs.com/package/tiptap-content-kit)
[![license](https://img.shields.io/npm/l/tiptap-content-kit)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

## Features

- **5 content parsers** -- Markdown, DOCX, DOC, PDF, and Confluence Storage Format (XHTML to blocks or Markdown)
- **10 Tiptap editor extensions** -- React & Vue 3 지원. Callout, Diagram (Mermaid/PlantUML), CodeBlockTabs, ResizableImage, HtmlEmbed, Embed (Figma), YouTube, Anchor, DocumentLink, MarkdownShortcuts
- **Block schema with validation** -- Canonical block types, sanitization pipeline, AI output validation
- **Utility functions** -- HTML sanitizer for sandboxed iframes, Figma URL parser with Embed Kit 2.0 support
- **Provider interfaces** -- Plug in your own Confluence OAuth, LLM, and storage providers

## Installation

```bash
npm install tiptap-content-kit

# or
pnpm add tiptap-content-kit

# or
yarn add tiptap-content-kit
```

### Peer Dependencies

All peer dependencies are **optional** -- install only what you need:

```bash
# For Tiptap extensions (React)
npm install @tiptap/core @tiptap/react react react-dom

# For Tiptap extensions (Vue 3)
npm install @tiptap/core @tiptap/vue-3 vue

# For DOCX parsing
npm install mammoth

# For legacy .doc parsing
npm install word-extractor

# For PDF parsing
npm install pdf-parse

# For Diagram extension
npm install mermaid
```

## Quick Start

### Parsing Markdown

```typescript
import { markdownToBlocks } from 'tiptap-content-kit/parsers';

const blocks = markdownToBlocks('# Hello World\n\nThis is a paragraph.');
// => [{ type: 'heading', level: 1, content: 'Hello World' }, { type: 'paragraph', content: '...' }]
```

### Parsing Files (DOCX, PDF, DOC, TXT)

```typescript
import { parseFile, isSupportedFileType } from 'tiptap-content-kit/parsers';

if (isSupportedFileType('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
  const result = await parseFile(
    buffer,
    'report.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  console.log(result.title);       // "report"
  console.log(result.fileType);    // "docx"
  console.log(result.contentHtml); // HTML string (DOCX only)
  console.log(result.charCount);   // character count
}
```

### DOCX HTML to Blocks

```typescript
import { docxHtmlToBlocks } from 'tiptap-content-kit/parsers';

// Convert mammoth HTML output directly to document blocks
const blocks = docxHtmlToBlocks(mammothHtml);
```

### Parsing Confluence

```typescript
import { parseConfluenceContent } from 'tiptap-content-kit/parsers';

const { blocks } = parseConfluenceContent(confluenceXhtml, {
  siteUrl: 'https://your-site.atlassian.net',
  spaceKey: 'SPACE',
});
```

### Confluence to Markdown

```typescript
import { parseConfluenceStorageToMarkdown } from 'tiptap-content-kit/parsers';

const markdown = parseConfluenceStorageToMarkdown(storageFormatXhtml, {
  siteUrl: 'https://your-site.atlassian.net',
  spaceKey: 'DOCS',
});
```

### Using Tiptap Extensions (React)

```typescript
import { CalloutExtension, DiagramExtension, ResizableImage } from 'tiptap-content-kit/extensions';
import StarterKit from '@tiptap/starter-kit';
import { useEditor } from '@tiptap/react';

const editor = useEditor({
  extensions: [
    StarterKit,
    CalloutExtension,
    DiagramExtension,
    ResizableImage,
  ],
});
```

### Using Tiptap Extensions (Vue 3)

```typescript
import { CalloutExtension, DiagramExtension, ResizableImage } from 'tiptap-content-kit/extensions-vue';
import StarterKit from '@tiptap/starter-kit';
import { useEditor } from '@tiptap/vue-3';

const editor = useEditor({
  extensions: [
    StarterKit,
    CalloutExtension,
    DiagramExtension,
    ResizableImage,
  ],
});
```

### Block Schema & Validation

```typescript
import { BLOCK_TYPES, isValidBlockType, sanitizeBlock } from 'tiptap-content-kit/schema';
import { validateAIOutput } from 'tiptap-content-kit/schema';

// Check a block type
isValidBlockType('heading');   // true
isValidBlockType('unknown');   // false

// Validate and sanitize AI-generated blocks
const { blocks, corrections, blockTypesUsed } = validateAIOutput(rawBlocks);
// corrections: ["Fixed invalid callout variant 'note' -> 'info'", ...]
```

### Utilities

```typescript
import { sanitizeHtmlForEmbed } from 'tiptap-content-kit/utils';
import { parseFigmaUrl, buildFigmaEmbedUrl } from 'tiptap-content-kit/utils';

// Sanitize HTML for sandboxed iframe rendering
const safeHtml = sanitizeHtmlForEmbed(rawHtml);

// Parse a Figma URL and build an embed URL (Embed Kit 2.0)
const info = parseFigmaUrl('https://www.figma.com/design/abc123/MyFile');
const embedUrl = buildFigmaEmbedUrl(info, 'my-app');
// => "https://embed.figma.com/design/abc123?embed-host=my-app"
```

## API Reference

### Subpath Exports

| Import Path | Contents |
|---|---|
| `tiptap-content-kit/parsers` | `parseFile`, `markdownToBlocks`, `docxHtmlToBlocks`, `parseConfluenceContent`, `parseConfluenceStorageToMarkdown`, and more |
| `tiptap-content-kit/schema` | `BLOCK_TYPES`, `DocumentBlock`, `sanitizeBlock`, `isValidBlockType`, `validateAIOutput` |
| `tiptap-content-kit/extensions` | React 버전: `CalloutExtension`, `DiagramExtension`, `CodeBlockTabsExtension`, `HtmlEmbedExtension`, `EmbedExtension`, `ResizableImage`, `YoutubeEmbed`, `AnchorExtension`, `DocumentLinkList`, `MarkdownShortcuts` |
| `tiptap-content-kit/extensions-vue` | Vue 3 버전: 위와 동일한 extensions (Vue 3 + @tiptap/vue-3 기반) |
| `tiptap-content-kit/utils` | `sanitizeHtmlForEmbed`, `parseFigmaUrl`, `buildFigmaEmbedUrl` |
| `tiptap-content-kit/providers` | `ContentKitConfig`, `ConfluenceConfig`, `LLMProvider`, `StorageProvider` |

### Block Types

The schema defines 17 block types:

`heading` | `paragraph` | `code` | `callout` | `list` | `table` | `divider` | `image` | `blockquote` | `youtube` | `video` | `tabbed-code` | `file` | `diagram` | `anchor` | `html` | `embed`

Plus 4 special block types for landing pages:

`quick-start-card` | `feature-card` | `feature-grid` | `doc-list`

## Configuration

Use the `ContentKitConfig` interface to wire up external services. All providers are optional -- configure only what you need.

```typescript
import type { ContentKitConfig } from 'tiptap-content-kit/providers';

const config: ContentKitConfig = {
  confluence: { ... },
  llm: { ... },
  storage: { ... },
};
```

### Confluence OAuth

```typescript
const config: ContentKitConfig = {
  confluence: {
    getCredentials: async (userId: string) => {
      // Fetch from your OAuth token store
      const token = await db.getConfluenceToken(userId);
      return {
        accessToken: token.access_token,
        cloudId: token.cloud_id,
        siteUrl: `https://api.atlassian.com/ex/confluence/${token.cloud_id}`,
      };
    },
  },
};
```

### LLM Provider

The `LLMProvider` interface works with **any LLM** -- OpenAI, Anthropic Claude, Google Gemini, Ollama, or any other provider. Just implement the `generateText` function.

#### OpenAI

```typescript
import OpenAI from 'openai';
const openai = new OpenAI();

const config: ContentKitConfig = {
  llm: {
    generateText: async (prompt, options) => {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens,
        messages: [
          ...(options?.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
      });
      return res.choices[0]?.message?.content ?? '';
    },
  },
};
```

#### Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

const config: ContentKitConfig = {
  llm: {
    generateText: async (prompt, options) => {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: options?.maxTokens ?? 4096,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.content[0].type === 'text' ? res.content[0].text : '';
    },
  },
};
```

#### Google Gemini

```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const config: ContentKitConfig = {
  llm: {
    generateText: async (prompt, options) => {
      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: options?.systemPrompt,
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens,
        },
      });
      return res.text ?? '';
    },
  },
};
```

#### Ollama (Local)

```typescript
const config: ContentKitConfig = {
  llm: {
    generateText: async (prompt, options) => {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'llama3',
          prompt: options?.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
          options: { temperature: options?.temperature ?? 0.3 },
        }),
      });
      const data = await res.json();
      return data.response;
    },
  },
};
```

### Storage (S3 Example)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

const config: ContentKitConfig = {
  storage: {
    upload: async (buffer, key, contentType) => {
      await s3.send(new PutObjectCommand({
        Bucket: 'my-uploads-bucket',
        Key: `images/${key}`,
        Body: buffer,
        ContentType: contentType,
      }));
      return `https://my-uploads-bucket.s3.amazonaws.com/images/${key}`;
    },
  },
};
```

## Supported File Types

| Format | Extension | MIME Type | Parser |
|---|---|---|---|
| Markdown | `.md`, `.mdx` | `text/markdown` | `markdownToBlocks` |
| Word (OOXML) | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` + `docxHtmlToBlocks` |
| Word (Legacy) | `.doc` | `application/msword` | `word-extractor` |
| PDF | `.pdf` | `application/pdf` | `pdf-parse` |
| Plain Text | `.txt`, `.text` | `text/plain` | Built-in |
| Confluence | -- | Storage Format XHTML | `parseConfluenceContent` / `parseConfluenceStorageToMarkdown` |

## Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Clone the repo and install all dependencies (including devDependencies)
git clone https://github.com/studiotemple/tiptap-content-kit.git
cd tiptap-content-kit
npm install

# 2. Run the build
npm run build

# 3. Run TypeScript type checking
npm run typecheck

# 4. Watch mode for development
npm run dev
```

**Key notes for contributors:**

- All peer dependencies (`@tiptap/core`, `@tiptap/react`, `mermaid`, etc.) are installed automatically as `devDependencies` for the build — you don't need to install them separately.
- When adding new parsers, export them from `src/parsers/index.ts`.
- When adding new extensions, export them from `src/extensions/index.ts` (React) and `src/extensions-vue/index.ts` (Vue 3).
- Block types must be registered in `src/schema/block-schema.ts` (`BLOCK_TYPES` array).
- Please run `npm run typecheck` before submitting a PR to ensure zero type errors.

## License

MIT — see [LICENSE](./LICENSE) for details.
