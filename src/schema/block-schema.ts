/**
 * Block Schema - Single Source of Truth
 *
 * 모든 블록 타입, 제약 조건, 검증 함수의 단일 정의.
 * AI 출력 검증, 에디터 렌더링, 뷰어 렌더링 모두 이 파일을 참조한다.
 */

// ===== Canonical Constants =====

export const CALLOUT_VARIANTS = ['info', 'warning', 'error', 'success', 'tip'] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export const BLOCK_TYPES = [
  'heading', 'paragraph', 'code', 'callout', 'list', 'table',
  'divider', 'image', 'blockquote', 'youtube', 'video',
  'tabbed-code', 'file', 'diagram', 'anchor', 'html', 'embed', 'details',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const SPECIAL_BLOCK_TYPES = [
  'quick-start-card', 'feature-card', 'feature-grid', 'doc-list',
] as const;
export type SpecialBlockType = (typeof SPECIAL_BLOCK_TYPES)[number];

export const DIAGRAM_TYPES = ['mermaid', 'plantuml'] as const;
export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export const LIST_STYLES = ['bullet', 'ordered'] as const;
export type ListStyle = (typeof LIST_STYLES)[number];

export const HEADING_LEVELS = [1, 2, 3, 4] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export interface TabInfo {
  label: string;
  language: string;
  content: string;
}

export interface DocumentBlock {
  id: string;
  type: string; // BlockType | SpecialBlockType — 넓은 타입 유지 (기존 호환)
  content?: any;
  level?: number;
  language?: string;
  variant?: string;
  style?: string;
  ordered?: boolean;
  items?: any[];
  headers?: string[];
  rows?: string[][];
  tabs?: TabInfo[];
  groupId?: string;
  children?: DocumentBlock[];
  // image / video / file
  url?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  filename?: string;
  // diagram
  diagramType?: string;
  // youtube
  videoId?: string;
  // anchor
  anchorId?: string;
  // special blocks
  title?: string;
  description?: string;
  buttonText?: string;
  link?: string;
  icon?: string;
  columns?: number;
  layout?: string;
  blockType?: string;
  [key: string]: any; // 기존 코드 호환
}

export interface DocumentContent {
  blocks: DocumentBlock[];
}

// ===== Type Guards =====

export function isValidCalloutVariant(v: unknown): v is CalloutVariant {
  return typeof v === 'string' && (CALLOUT_VARIANTS as readonly string[]).includes(v);
}

export function isValidBlockType(t: unknown): t is BlockType {
  return typeof t === 'string' && (BLOCK_TYPES as readonly string[]).includes(t);
}

export function isValidHeadingLevel(l: unknown): l is HeadingLevel {
  return typeof l === 'number' && (HEADING_LEVELS as readonly number[]).includes(l as HeadingLevel);
}

// ===== Sanitization =====

/**
 * 개별 블록을 정규화. 잘못된 값은 안전한 기본값으로 교체.
 * 변환 내역은 반환하지 않음 (validateAIOutput에서 추적).
 */
export function sanitizeBlock(raw: Record<string, any>): DocumentBlock {
  const type = isValidBlockType(raw.type) ? raw.type : 'paragraph';

  const block: DocumentBlock = {
    id: raw.id || generateBlockId(),
    type,
    content: raw.content,
  };

  switch (type) {
    case 'heading':
      block.level = isValidHeadingLevel(raw.level) ? raw.level : 2;
      break;
    case 'code':
      block.language = typeof raw.language === 'string' ? raw.language : 'plaintext';
      break;
    case 'callout':
      block.variant = isValidCalloutVariant(raw.variant) ? raw.variant : 'info';
      if (raw.children && Array.isArray(raw.children)) {
        block.children = raw.children;
      }
      break;
    case 'list':
      block.ordered = raw.ordered === true || raw.style === 'ordered';
      block.items = Array.isArray(raw.items) ? raw.items : [];
      break;
    case 'table':
      block.headers = Array.isArray(raw.headers) ? raw.headers : [];
      block.rows = Array.isArray(raw.rows) ? raw.rows : [];
      break;
    case 'image': {
      // content 필드에 URL이 올 수 있음 (markdown-to-blocks, AI 출력 호환)
      const contentAsUrl =
        typeof raw.content === 'string' && /^(https?:\/\/|\/uploads\/)/.test(raw.content.trim())
          ? raw.content.trim() : '';
      block.url = raw.url || raw.src || contentAsUrl;
      block.alt = raw.alt || '';
      if (raw.width) block.width = raw.width;
      break;
    }
    case 'youtube':
      block.videoId = raw.videoId || '';
      break;
    case 'video':
      block.url = raw.url || '';
      block.alt = raw.alt || '';
      break;
    case 'file':
      block.url = raw.url || '';
      block.filename = raw.filename || '';
      break;
    case 'tabbed-code':
      block.tabs = Array.isArray(raw.tabs) ? raw.tabs : [];
      block.groupId = typeof raw.groupId === 'string' ? raw.groupId : undefined;
      break;
    case 'blockquote':
      if (raw.children && Array.isArray(raw.children)) {
        block.children = raw.children;
      }
      break;
    case 'diagram':
      block.diagramType = (DIAGRAM_TYPES as readonly string[]).includes(raw.diagramType) ? raw.diagramType : 'mermaid';
      break;
    case 'anchor':
      block.anchorId = typeof raw.anchorId === 'string'
        ? raw.anchorId.toLowerCase().replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '')
        : '';
      block.content = '';
      break;
    case 'html':
      block.htmlContent = typeof raw.htmlContent === 'string' ? raw.htmlContent : '';
      break;
    case 'embed':
      block.url = typeof raw.url === 'string' ? raw.url : '';
      block.provider = typeof raw.provider === 'string' ? raw.provider : '';
      break;
  }

  return block;
}

export function sanitizeBlocks(blocks: any[]): DocumentBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map(b => (b && typeof b === 'object' ? sanitizeBlock(b) : sanitizeBlock({ type: 'paragraph', content: '' })));
}

// ===== Block Type Extraction =====

export function extractBlockTypesUsed(blocks: DocumentBlock[]): string[] {
  return [...new Set(blocks.map(b => b.type))];
}

// ===== Prompt Schema Generation =====

/**
 * AI 프롬프트에 주입할 블록 스키마 텍스트.
 * AI가 항상 최신, 정확한 블록 정의를 참조하도록 한다.
 */
export function getBlockSchemaForPrompt(): string {
  return `
DOCUMENT BLOCK TYPES (use ONLY these):
- heading: content (text), level (1|2|3|4)
- paragraph: content (text, supports **bold**, *italic*, \`code\`, [links](url))
- code: content (code text), language (javascript|typescript|python|java|go|rust|bash|sql|html|css|json|yaml|...)
- callout: content (text), variant (${CALLOUT_VARIANTS.join('|')}) — ONLY these 5 variants are valid
- list: style ("bullet"|"ordered"), items (string[])
- table: headers (string[]), rows (string[][])
- divider: (no additional fields)
- image: url (image URL), alt (description text, optional)
- blockquote: content (text)
- tabbed-code: tabs ({label, language, content}[]), groupId (string)
- diagram: content (diagram source code), diagramType ("mermaid"|"plantuml")

CALLOUT VARIANTS (ONLY these 5 are valid): ${CALLOUT_VARIANTS.join(', ')}
Do NOT use: note, danger, caution, important, attention — these will cause errors.
`.trim();
}

// ===== Utility =====

function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
