/**
 * DOCX HTML to DocumentBlock[] Converter
 *
 * mammoth이 생성한 표준 HTML을 DocumentBlock 배열로 변환.
 * AI 파이프라인을 건너뛰어 서식을 100% 보존한다.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode, Element, Text } from 'domhandler';
import type { DocumentBlock } from '../schema/block-schema';

type CheerioElement = Cheerio<AnyNode>;

let blockCounter = 0;

function nextBlockId(): string {
  return `block-${++blockCounter}`;
}

/**
 * 인라인 서식을 마크다운 호환 문자열로 직렬화
 */
function serializeInline($el: CheerioElement, $: CheerioAPI): string {
  let result = '';

  $el.contents().each((_, node) => {
    if (node.type === 'text') {
      result += (node as Text).data || '';
      return;
    }

    if (node.type !== 'tag') return;

    const $child = $(node);
    const tag = (node as Element).tagName?.toLowerCase();

    switch (tag) {
      case 'strong':
      case 'b': {
        const inner = serializeInline($child, $);
        result += inner ? `**${inner}**` : '';
        break;
      }
      case 'em':
      case 'i': {
        const inner = serializeInline($child, $);
        result += inner ? `*${inner}*` : '';
        break;
      }
      case 'code': {
        const inner = $child.text();
        result += inner ? `\`${inner}\`` : '';
        break;
      }
      case 'a': {
        const href = $child.attr('href') || '';
        const anchorId = $child.attr('id') || '';
        // 빈 앵커 타겟 (<a id="xxx"></a>) → 블록 레벨에서 처리, 인라인에서는 무시
        if (anchorId && !href && !$child.text().trim()) {
          break;
        }
        // id 있고 텍스트 있는 경우 → 텍스트만 추출 (앵커 타겟 역할)
        if (anchorId && !href) {
          result += serializeInline($child, $);
          break;
        }
        const inner = serializeInline($child, $);
        result += href ? `[${inner}](${href})` : inner;
        break;
      }
      case 'br':
        result += '\n';
        break;
      case 'u':
      case 's':
      case 'sub':
      case 'sup':
      case 'span':
        // Pass through inline wrappers
        result += serializeInline($child, $);
        break;
      case 'p':
      case 'div': {
        const inner = serializeInline($child, $);
        if (inner) {
          result += (result.length > 0 ? '\n' : '') + inner;
        }
        break;
      }
      default:
        // Unknown inline element — extract text
        result += serializeInline($child, $);
        break;
    }
  });

  return result;
}

/**
 * <li> 요소를 리스트 아이템 구조로 파싱 (중첩 리스트 지원)
 */
function parseListItems($list: CheerioElement, $: CheerioAPI): any[] {
  const items: any[] = [];

  $list.children('li').each((_, li) => {
    const $li = $(li);
    // 직접 텍스트/인라인 콘텐츠 추출 (중첩 리스트 제외)
    const $clone = $li.clone();
    $clone.children('ul, ol').remove();
    const content = serializeInline($clone, $).trim();

    const item: any = { content };

    // 중첩 리스트 처리
    const $nestedList = $li.children('ul, ol').first();
    if ($nestedList.length > 0) {
      item.children = parseListItems($nestedList, $);
    }

    items.push(item);
  });

  return items;
}

/**
 * <table> 요소를 headers + rows로 파싱
 */
function parseTable($table: CheerioElement, $: CheerioAPI): { headers: string[]; rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];

  // thead가 있으면 첫 번째 tr을 headers로 사용
  // mammoth가 모든 행을 <thead> 안에 <th>로 넣는 경우가 있으므로,
  // 2번째 이후 <thead> 행은 데이터 rows로 취급
  const $thead = $table.find('thead');
  const extraTheadRows: Element[] = [];
  if ($thead.length > 0) {
    const $theadRows = $thead.find('tr');
    $theadRows.first().find('th, td').each((_, cell) => {
      headers.push(serializeInline($(cell), $).trim());
    });
    // 2번째 이후 thead 행을 수집
    $theadRows.each((i, row) => {
      if (i > 0) extraTheadRows.push(row as unknown as Element);
    });
  }

  // tbody (또는 직접 tr)에서 rows 추출
  // mammoth가 <thead> 없이 직접 <tr>을 생성할 수 있고,
  // cheerio HTML 모드에서 자동 <tbody> 래핑이 발생할 수 있음
  const $tbody = $table.find('tbody');
  let $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('> tr');
  // fallback: 직접 자식 tr도 없으면 모든 tr 탐색
  if ($rows.length === 0) {
    $rows = $table.find('tr');
    // thead 내부 tr은 제외
    if ($thead.length > 0) {
      $rows = $rows.filter((_, el) => !$(el).closest('thead').length);
    }
  }

  // thead에 2번째 이후 행이 있으면 데이터 rows 앞에 추가
  const allDataRows: Element[] = [
    ...extraTheadRows,
    ...($rows.toArray() as unknown as Element[]),
  ];

  allDataRows.forEach((row, i) => {
    const cells: string[] = [];
    $(row).find('th, td').each((_, cell) => {
      cells.push(serializeInline($(cell), $).trim());
    });

    // 빈 행 건너뛰기 (모든 셀이 빈 문자열)
    if (cells.every(c => c === '')) return;

    // thead가 없고 첫 행이면 headers로 사용
    if (headers.length === 0 && i === 0) {
      headers.push(...cells);
    } else {
      // 셀 개수 불일치 시 빈 문자열로 패딩
      if (headers.length > 0 && cells.length < headers.length) {
        while (cells.length < headers.length) {
          cells.push('');
        }
      }
      rows.push(cells);
    }
  });

  return { headers, rows };
}

/**
 * 단일 HTML 요소를 DocumentBlock으로 변환
 */
function elementToBlock(el: Element, $: CheerioAPI): DocumentBlock | null {
  const $el = $(el);
  const tag = el.tagName?.toLowerCase();

  // Heading
  const headingMatch = tag?.match(/^h([1-6])$/);
  if (headingMatch) {
    const level = Math.min(parseInt(headingMatch[1], 10), 4);
    const content = serializeInline($el, $).trim();
    if (!content) return null;
    // Collect anchor IDs from <a id="..."> inside the heading (Word _Toc bookmarks)
    const anchorIds: string[] = [];
    $el.find('a[id]').each((_, anchor) => {
      const aid = $(anchor).attr('id');
      if (aid) anchorIds.push(aid);
    });
    const block: any = { id: nextBlockId(), type: 'heading', level, content };
    if (anchorIds.length > 0) block.anchorIds = anchorIds;
    return block;
  }

  switch (tag) {
    case 'p': {
      const content = serializeInline($el, $);
      // 이미지만 포함된 <p>는 image 블록으로 변환
      const $img = $el.find('img');
      if ($img.length > 0 && $el.text().trim() === '') {
        const src = $img.attr('src') || '';
        const alt = $img.attr('alt') || '';
        return { id: nextBlockId(), type: 'image', content: src, url: src, alt };
      }
      // 빈 문단도 유지 (간격용)
      return { id: nextBlockId(), type: 'paragraph', content };
    }

    case 'ul':
      return {
        id: nextBlockId(),
        type: 'list',
        style: 'bullet',
        ordered: false,
        items: parseListItems($el, $),
      };

    case 'ol':
      return {
        id: nextBlockId(),
        type: 'list',
        style: 'ordered',
        ordered: true,
        items: parseListItems($el, $),
      };

    case 'table': {
      const { headers, rows } = parseTable($el, $);
      if (headers.length === 0 && rows.length === 0) return null;
      return { id: nextBlockId(), type: 'table', headers, rows };
    }

    case 'pre': {
      const content = $el.text();
      return { id: nextBlockId(), type: 'code', content, language: 'plaintext' };
    }

    case 'blockquote': {
      const content = serializeInline($el, $).trim();
      if (!content) return null;
      return { id: nextBlockId(), type: 'blockquote', content };
    }

    case 'a': {
      // mammoth bookmark anchor: <a id="bookmarkName"></a>
      const anchorId = $el.attr('id') || '';
      const href = $el.attr('href') || '';
      if (anchorId && !href) {
        return { id: nextBlockId(), type: 'anchor', anchorId };
      }
      // href가 있으면 paragraph로 처리
      const content = serializeInline($el, $).trim();
      if (!content) return null;
      return { id: nextBlockId(), type: 'paragraph', content };
    }

    case 'hr':
      return { id: nextBlockId(), type: 'divider' };

    case 'img': {
      const src = $el.attr('src') || '';
      const alt = $el.attr('alt') || '';
      return { id: nextBlockId(), type: 'image', content: src, url: src, alt };
    }

    case 'figure': {
      // mammoth may wrap images in <figure>
      const $img = $el.find('img');
      if ($img.length > 0) {
        const src = $img.attr('src') || '';
        const alt = $img.attr('alt') || $el.find('figcaption').text() || '';
        return { id: nextBlockId(), type: 'image', content: src, url: src, alt };
      }
      // Fallback: treat as paragraph
      const content = serializeInline($el, $).trim();
      if (!content) return null;
      return { id: nextBlockId(), type: 'paragraph', content };
    }

    default:
      // Unknown block-level element — treat as paragraph
      const content = serializeInline($el, $).trim();
      if (!content) return null;
      return { id: nextBlockId(), type: 'paragraph', content };
  }
}

/**
 * mammoth HTML을 DocumentBlock[] 배열로 변환
 */
export function docxHtmlToBlocks(html: string): DocumentBlock[] {
  if (!html || !html.trim()) return [];

  // Reset counter per invocation
  blockCounter = 0;

  const $ = cheerio.load(html, { xml: false });
  const blocks: DocumentBlock[] = [];

  // body 또는 root 자식 순회
  const $body = $('body');
  const children = $body.length > 0 ? $body.children() : $.root().children();

  children.each((_, el) => {
    if (el.type !== 'tag') return;
    const block = elementToBlock(el as Element, $);
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
}

/**
 * 약관류 문서 스마트 포매팅 후처리
 * - 볼드 번호 패턴 → heading 승격
 * - 제목-본문 분리 (제목\n본문 → heading + paragraph)
 * - TOC 목록 → 앵커 링크 변환
 */
export function smartFormatLegalDoc(blocks: DocumentBlock[]): DocumentBlock[] {
  const result: DocumentBlock[] = [];

  // 볼드 번호 패턴 정규식
  const boldNumberRe = /^\*\*(\d+[\.\)）．])\s*(.+?)\*\*$/;
  // 제목-본문 분리 정규식 (볼드 제목 뒤 줄바꿈 + 본문)
  const boldNumberWithBodyRe = /^\*\*(\d+[\.\)）．])\s*(.+?)\*\*\n([\s\S]+)$/;
  // 최상위 볼드 제목 (번호 없음)
  const boldTitleRe = /^\*\*([^*]+)\*\*$/;

  let foundFirstBold = false;
  let foundFirstHeading = false;

  // Pass 1: heading 승격 및 제목-본문 분리
  for (const block of blocks) {
    if (block.type !== 'paragraph' || typeof block.content !== 'string') {
      result.push({ ...block });
      continue;
    }

    const content = block.content.trim();

    // 제목-본문 분리: **N. 제목**\n본문
    const bodyMatch = content.match(boldNumberWithBodyRe);
    if (bodyMatch) {
      const [, num, title, body] = bodyMatch;
      foundFirstHeading = true;
      result.push({
        id: nextBlockId(),
        type: 'heading',
        level: 2,
        content: `${num} ${title}`,
      });
      result.push({
        id: nextBlockId(),
        type: 'paragraph',
        content: body.trim(),
      });
      continue;
    }

    // 볼드 번호 패턴: **N. 제목** → heading 2
    const numMatch = content.match(boldNumberRe);
    if (numMatch) {
      const [, num, title] = numMatch;
      foundFirstHeading = true;
      result.push({
        id: nextBlockId(),
        type: 'heading',
        level: 2,
        content: `${num} ${title}`,
      });
      continue;
    }

    // 최상위 제목: 첫 번째 볼드 텍스트 (번호 없음, 아직 heading 미등장)
    if (!foundFirstBold && !foundFirstHeading) {
      const titleMatch = content.match(boldTitleRe);
      if (titleMatch) {
        foundFirstBold = true;
        result.push({
          id: nextBlockId(),
          type: 'heading',
          level: 1,
          content: titleMatch[1],
        });
        continue;
      }
    }

    result.push({ ...block });
  }

  // Pass 2: TOC 목록 → 앵커 링크 변환
  // 본문의 heading들을 수집하여 text→id 매핑
  const headingMap = new Map<string, string>();
  for (const block of result) {
    if (block.type === 'heading' && typeof block.content === 'string') {
      const text = block.content.trim();
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w가-힣-]/g, '');
      headingMap.set(text, id);
    }
  }

  // 첫 번째 ordered list를 TOC로 간주
  let tocProcessed = false;
  const finalResult: DocumentBlock[] = [];

  for (const block of result) {
    if (
      !tocProcessed &&
      block.type === 'list' &&
      block.ordered === true &&
      block.items &&
      block.items.length > 0
    ) {
      tocProcessed = true;

      const newItems = block.items.map((item: any) => {
        if (typeof item.content !== 'string') return { ...item };

        // 볼드 제거하여 순수 텍스트 추출
        const plainText = item.content.replace(/\*\*/g, '').trim();

        // heading 매칭 시도: 정확 매칭 또는 번호+제목 매칭
        let matchedId: string | undefined;
        for (const [headingText, headingId] of headingMap.entries()) {
          if (headingText === plainText || headingText.includes(plainText) || plainText.includes(headingText)) {
            matchedId = headingId;
            break;
          }
        }

        if (matchedId) {
          return { ...item, content: `[${plainText}](#${matchedId})` };
        }

        return { ...item };
      });

      finalResult.push({ ...block, items: newItems });
    } else {
      finalResult.push(block);
    }
  }

  return finalResult;
}
