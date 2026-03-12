/**
 * Extended Markdown → DocumentBlock[] 변환기
 *
 * AI가 생성한 확장 마크다운을 에디터 블록 구조로 파싱한다.
 * 커스텀 문법: :::callout{variant}, :::tabs{group}
 */

import type { DocumentBlock } from '../schema/block-schema';

let blockCounter = 0;

function nextId(): string {
  return `block-${++blockCounter}`;
}

// ===== Nested List Parsing =====

const UNORDERED_RE = /^(\s*)[-*+]\s+/;
const ORDERED_RE = /^(\s*)\d+[.)]\s+/;

/**
 * 들여쓰기 인식 중첩 리스트 파서
 * items: string (flat) 또는 { text: string; children: DocumentBlock[] } (중첩)
 */
function parseNestedListItems(
  lines: string[],
  startIdx: number,
  ordered: boolean,
): { items: (string | { text: string; children?: DocumentBlock[] })[]; endIdx: number } {
  const items: (string | { text: string; children?: DocumentBlock[] })[] = [];
  let i = startIdx;
  const pattern = ordered ? ORDERED_RE : UNORDERED_RE;

  // 첫 줄의 들여쓰기가 현재 레벨의 기준
  const firstMatch = lines[i]?.match(pattern);
  if (!firstMatch) return { items, endIdx: i };
  const baseIndent = firstMatch[1].length;

  while (i < lines.length) {
    const currentLine = lines[i];
    const ulMatch = currentLine.match(UNORDERED_RE);
    const olMatch = currentLine.match(ORDERED_RE);
    const match = ulMatch || olMatch;

    if (!match) break;

    const indent = match[1].length;

    // 현재 레벨보다 들여쓰기가 작으면 상위 레벨로 돌아감
    if (indent < baseIndent) break;

    if (indent === baseIndent) {
      // 현재 레벨 항목
      const isCurrentOrdered = !!olMatch && !ulMatch;
      const currentPattern = isCurrentOrdered ? ORDERED_RE : UNORDERED_RE;

      // 기준 패턴과 다른 종류의 리스트면 이전 항목의 children으로 중첩 처리
      if (isCurrentOrdered !== ordered) {
        if (items.length > 0) {
          const nested = parseNestedListItems(lines, i, isCurrentOrdered);
          const lastItem = items[items.length - 1];
          const childList: DocumentBlock = {
            id: nextId(),
            type: 'list',
            content: '',
            style: isCurrentOrdered ? 'ordered' : 'bullet',
            items: nested.items,
            ordered: isCurrentOrdered,
          };
          if (typeof lastItem === 'string') {
            items[items.length - 1] = { text: lastItem, children: [childList] };
          } else if (lastItem && typeof lastItem === 'object') {
            if (!lastItem.children) lastItem.children = [];
            lastItem.children.push(childList);
          }
          i = nested.endIdx;
          continue;
        }
        break;
      }

      const text = currentLine.replace(currentPattern, '');
      i++;

      // 다음 줄이 더 들여쓰기되어 있으면 하위 리스트
      if (i < lines.length) {
        const nextUl = lines[i]?.match(UNORDERED_RE);
        const nextOl = lines[i]?.match(ORDERED_RE);
        const nextMatch = nextUl || nextOl;

        if (nextMatch && nextMatch[1].length > baseIndent) {
          const isChildOrdered = !!nextOl && !nextUl;
          const nested = parseNestedListItems(lines, i, isChildOrdered);
          items.push({
            text,
            children: [{
              id: nextId(),
              type: 'list',
              content: '',
              style: isChildOrdered ? 'ordered' : 'bullet',
              items: nested.items,
            } as DocumentBlock],
          });
          i = nested.endIdx;
          continue;
        }
      }

      // 하위 리스트가 없으면 단순 문자열
      items.push(text);
    } else {
      // 더 깊은 들여쓰기 → 하위 레벨에서 처리해야 하므로 중단
      break;
    }
  }

  return { items, endIdx: i };
}

// ===== Custom Block Extraction =====

interface ExtractedBlock {
  type: 'tabs' | 'callout' | 'diagram' | 'raw';
  raw: string;
  attrs?: Record<string, string>;
}

/**
 * :::tabs{...} ... ::: 와 :::callout{...} ... ::: 블록을 추출하여
 * 일반 마크다운과 분리
 */
function extractCustomBlocks(markdown: string): ExtractedBlock[] {
  const result: ExtractedBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // :::tabs{group="..."}
    const tabsMatch = line.match(/^:::tabs\{group="([^"]+)"\}/);
    if (tabsMatch) {
      const groupId = tabsMatch[1];
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      result.push({
        type: 'tabs',
        raw: blockLines.join('\n'),
        attrs: { groupId },
      });
      continue;
    }

    // :::diagram{type="..."}
    const diagramMatch = line.match(/^:::diagram\{type="([^"]+)"\}/);
    if (diagramMatch) {
      const diagramType = diagramMatch[1];
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      result.push({
        type: 'diagram',
        raw: blockLines.join('\n').trim(),
        attrs: { diagramType },
      });
      continue;
    }

    // :::callout{variant="..."}
    const calloutMatch = line.match(/^:::callout\{variant="([^"]+)"\}/);
    if (calloutMatch) {
      const variant = calloutMatch[1];
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::
      result.push({
        type: 'callout',
        raw: blockLines.join('\n').trim(),
        attrs: { variant },
      });
      continue;
    }

    // Accumulate raw markdown lines
    const last = result[result.length - 1];
    if (last && last.type === 'raw') {
      last.raw += '\n' + line;
    } else {
      result.push({ type: 'raw', raw: line });
    }
    i++;
  }

  return result;
}

// ===== Tabs Parsing =====

interface TabInfo {
  label: string;
  language: string;
  content: string;
}

function parseTabs(raw: string): TabInfo[] {
  const tabs: TabInfo[] = [];
  const fenceRegex = /```(\w+)\s+tab="([^"]+)"\n([\s\S]*?)```/g;
  let match;

  while ((match = fenceRegex.exec(raw)) !== null) {
    tabs.push({
      language: match[1],
      label: match[2],
      content: match[3].trimEnd(),
    });
  }

  return tabs;
}

// ===== Standard Markdown Parsing =====

function parseRawMarkdown(raw: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → skip (natural spacing)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ id: nextId(), type: 'divider', content: '' });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4);
      blocks.push({
        id: nextId(),
        type: 'heading',
        content: headingMatch[2].trim(),
        level,
      });
      i++;
      continue;
    }

    // Code fence
    if (line.trim().startsWith('```')) {
      const fenceMatch = line.trim().match(/^```(\w*)/);
      const language = fenceMatch?.[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      // mermaid/plantuml 코드 펜스는 diagram 블록으로 변환
      if (language === 'mermaid' || language === 'plantuml') {
        blocks.push({
          id: nextId(),
          type: 'diagram',
          content: codeLines.join('\n'),
          diagramType: language,
        });
      } else {
        blocks.push({
          id: nextId(),
          type: 'code',
          content: codeLines.join('\n'),
          language: language || undefined,
        });
      }
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      const parseRow = (row: string): string[] =>
        row
          .split('|')
          .slice(1, -1) // remove first/last empty
          .map(cell => cell.trim());

      if (tableLines.length >= 2) {
        const headers = parseRow(tableLines[0]);
        // Skip separator row (---|----|---)
        const dataRows = tableLines
          .slice(2)
          .filter(r => !r.match(/^\|[\s-:|]+\|$/))
          .map(parseRow);

        blocks.push({
          id: nextId(),
          type: 'table',
          content: '',
          headers,
          rows: dataRows,
        });
      }
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        id: nextId(),
        type: 'blockquote' as DocumentBlock['type'],
        content: quoteLines.join('\n').trim(),
      });
      continue;
    }

    // Unordered list (중첩 지원)
    if (/^\s*[-*+]\s/.test(line)) {
      const { items, endIdx } = parseNestedListItems(lines, i, false);
      i = endIdx;
      blocks.push({
        id: nextId(),
        type: 'list',
        content: '',
        style: 'bullet',
        items,
      });
      continue;
    }

    // Ordered list (중첩 지원)
    if (/^\s*\d+[.)]\s/.test(line)) {
      const { items, endIdx } = parseNestedListItems(lines, i, true);
      i = endIdx;
      blocks.push({
        id: nextId(),
        type: 'list',
        content: '',
        style: 'ordered',
        items,
      });
      continue;
    }

    // Standalone image
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        id: nextId(),
        type: 'image',
        url: imgMatch[2],
        content: imgMatch[2],
        alt: imgMatch[1] || '',
      });
      i++;
      continue;
    }

    // YouTube URL (standalone line)
    const ytMatch = line.trim().match(
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
    );
    if (ytMatch && line.trim() === line.trim().match(/^https?:\/\/.+/)?.[0]) {
      blocks.push({
        id: nextId(),
        type: 'youtube' as DocumentBlock['type'],
        content: ytMatch[1], // video ID
      });
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith(':::') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\s*\d+[.)]\s/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^!\[[^\]]*\]\([^)]+\)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    const content = paraLines.join('\n').trim();
    if (content) {
      blocks.push({
        id: nextId(),
        type: 'paragraph',
        content,
      });
    }
  }

  return blocks;
}

// ===== Main Export =====

/**
 * 확장 마크다운을 DocumentBlock[]으로 변환
 */
export function markdownToBlocks(markdown: string): DocumentBlock[] {
  // Reset counter for each call
  blockCounter = 0;

  if (!markdown || !markdown.trim()) {
    return [];
  }

  // 1. Extract custom blocks (:::tabs, :::callout)
  const segments = extractCustomBlocks(markdown);

  // 2. Convert each segment to blocks
  const allBlocks: DocumentBlock[] = [];

  for (const segment of segments) {
    switch (segment.type) {
      case 'tabs': {
        const tabs = parseTabs(segment.raw);
        if (tabs.length > 0) {
          allBlocks.push({
            id: nextId(),
            type: 'tabbed-code' as DocumentBlock['type'],
            content: '',
            tabs,
            groupId: segment.attrs?.groupId,
          } as DocumentBlock & { tabs: TabInfo[]; groupId?: string });
        }
        break;
      }

      case 'callout': {
        const variant = segment.attrs?.variant as DocumentBlock['variant'];
        allBlocks.push({
          id: nextId(),
          type: 'callout',
          content: segment.raw,
          variant: variant || 'info',
        });
        break;
      }

      case 'diagram': {
        allBlocks.push({
          id: nextId(),
          type: 'diagram',
          content: segment.raw,
          diagramType: segment.attrs?.diagramType || 'mermaid',
        });
        break;
      }

      case 'raw': {
        const parsed = parseRawMarkdown(segment.raw);
        allBlocks.push(...parsed);
        break;
      }
    }
  }

  return allBlocks;
}
