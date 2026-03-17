/**
 * Confluence Storage Format to Document Blocks Converter
 *
 * Confluence uses XHTML-based storage format. This utility converts
 * Confluence page content to our DocumentContent block format.
 *
 * Uses cheerio for proper HTML parsing to handle:
 * - Nested lists
 * - Code blocks inside list items
 * - Complex Confluence macros
 */

import type { DocumentContent, DocumentBlock } from '../schema/block-schema';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { sanitizeHtmlForEmbed } from '../utils/html-sanitizer';
import { decodeHTML } from 'entities';

/**
 * Confluence user info for mention resolution.
 * Defined locally to avoid dependency on KPP-specific modules.
 */
export interface ConfluenceUserInfo {
  name: string;
  email?: string;
}

/**
 * Confluence emoticon name → Unicode emoji 매핑
 */
const CONFLUENCE_EMOTICON_MAP: Record<string, string> = {
  // 기본 표정
  smile: '\u{1F60A}', sad: '\u{1F622}', cheeky: '\u{1F61C}', laugh: '\u{1F602}', wink: '\u{1F609}',
  angry: '\u{1F620}', confused: '\u{1F615}', cool: '\u{1F60E}', cry: '\u{1F62D}', surprised: '\u{1F62E}',
  thinking: '\u{1F914}', sleeping: '\u{1F634}', sick: '\u{1F922}', nerd: '\u{1F913}', devil: '\u{1F608}',
  angel: '\u{1F607}',
  // 손 제스처
  thumbs_up: '\u{1F44D}', thumbs_down: '\u{1F44E}', clap: '\u{1F44F}', muscle: '\u{1F4AA}', pray: '\u{1F64F}',
  horns: '\u{1F918}', wave: '\u{1F44B}', ok: '\u{1F44C}', raised_hand: '\u270B\uFE0F', fist: '\u270A',
  point_up: '\u261D\uFE0F', point_down: '\u{1F447}', point_left: '\u{1F448}', point_right: '\u{1F449}',
  // 기호 / 상태
  information: '\u2139\uFE0F', tick: '\u2705', cross: '\u274C', warning: '\u26A0\uFE0F',
  plus: '\u2795', minus: '\u2796', question: '\u2753', check: '\u2714\uFE0F',
  // 조명 / 별
  light_on: '\u{1F4A1}', light_off: '\u{1F4A1}', light_bulb: '\u{1F4A1}',
  yellow_star: '\u2B50', red_star: '\u2B50', green_star: '\u2B50', blue_star: '\u2B50',
  star: '\u2B50', sparkle: '\u2728',
  // 하트
  heart: '\u2764\uFE0F', broken_heart: '\u{1F494}',
  // 불꽃 / 축하 / 트로피
  fire: '\u{1F525}', tada: '\u{1F389}', hundred: '\u{1F4AF}', trophy: '\u{1F3C6}', medal: '\u{1F3C5}', crown: '\u{1F451}',
  // 사물
  bell: '\u{1F514}', lock: '\u{1F512}', unlock: '\u{1F513}', clock: '\u{1F550}', calendar: '\u{1F4C5}',
  email: '\u{1F4E7}', phone: '\u{1F4F1}', globe: '\u{1F30D}', note: '\u{1F4DD}', pin: '\u{1F4CC}', link: '\u{1F517}',
  eyes: '\u{1F440}', rocket: '\u{1F680}', skull: '\u{1F480}', bomb: '\u{1F4A3}',
  book: '\u{1F4D6}', folder: '\u{1F4C1}', file: '\u{1F4C4}', gear: '\u2699\uFE0F', wrench: '\u{1F527}',
  hammer: '\u{1F528}', key: '\u{1F511}', magnifying_glass: '\u{1F50D}', megaphone: '\u{1F4E2}',
  money: '\u{1F4B0}', chart: '\u{1F4CA}', target: '\u{1F3AF}',
  hourglass: '\u231B', stopwatch: '\u23F1\uFE0F', flag_off: '\u{1F3C1}',
  gift: '\u{1F381}', balloon: '\u{1F388}', ribbon: '\u{1F380}', gem: '\u{1F48E}', ring: '\u{1F48D}',
  lipstick: '\u{1F484}', kiss: '\u{1F48B}',
  pill: '\u{1F48A}', syringe: '\u{1F489}', bandage: '\u{1FA79}', stethoscope: '\u{1FA7A}',
  construction: '\u{1F6A7}', car: '\u{1F697}', airplane: '\u2708\uFE0F', ship: '\u{1F6A2}', bicycle: '\u{1F6B2}',
  // 건물 / 장소
  house: '\u{1F3E0}', school: '\u{1F3EB}', hospital: '\u{1F3E5}', bank: '\u{1F3E6}', church: '\u26EA',
  mountain: '\u26F0\uFE0F', beach: '\u{1F3D6}\uFE0F', camping: '\u{1F3D5}\uFE0F', island: '\u{1F3DD}\uFE0F',
  // 자연 / 날씨
  sun: '\u2600\uFE0F', cloud: '\u2601\uFE0F', rain: '\u{1F327}\uFE0F', snow: '\u2744\uFE0F', lightning: '\u26A1',
  rainbow: '\u{1F308}', volcano: '\u{1F30B}', earth: '\u{1F30D}', moon: '\u{1F319}', comet: '\u2604\uFE0F',
  // 동물
  monkey: '\u{1F648}', dog: '\u{1F436}', cat: '\u{1F431}', bug: '\u{1F41B}',
  bee: '\u{1F41D}', turtle: '\u{1F422}', snake: '\u{1F40D}', penguin: '\u{1F427}',
  // 음식 / 음료
  cookie: '\u{1F36A}', pizza: '\u{1F355}', coffee: '\u2615', beer: '\u{1F37A}', cake: '\u{1F382}',
  // 하이픈 별칭 (Confluence는 하이픈 형식도 사용)
  'thumbs-up': '\u{1F44D}', 'thumbs-down': '\u{1F44E}', 'light-on': '\u{1F4A1}', 'light-off': '\u{1F4A1}',
  'yellow-star': '\u2B50', 'red-star': '\u2B50', 'green-star': '\u2B50', 'blue-star': '\u2B50',
  'broken-heart': '\u{1F494}', 'flag-off': '\u{1F3C1}', 'light-bulb': '\u{1F4A1}',
  'magnifying-glass': '\u{1F50D}', 'raised-hand': '\u270B\uFE0F', 'point-up': '\u261D\uFE0F',
  'point-down': '\u{1F447}', 'point-left': '\u{1F448}', 'point-right': '\u{1F449}',
  // Confluence 표준 이모티콘 별칭 (Slack/GitHub 호환)
  white_check_mark: '\u2705', 'white-check-mark': '\u2705',
  heavy_check_mark: '\u2714\uFE0F', 'heavy-check-mark': '\u2714\uFE0F',
  cross_mark: '\u274C', 'cross-mark': '\u274C',
  x: '\u274C',
  heavy_multiplication_x: '\u2716\uFE0F', 'heavy-multiplication-x': '\u2716\uFE0F',
  negative_squared_cross_mark: '\u274E', 'negative-squared-cross-mark': '\u274E',
  exclamation: '\u2757', heavy_exclamation_mark: '\u2757', 'heavy-exclamation-mark': '\u2757',
  bangbang: '\u203C\uFE0F', interrobang: '\u2049\uFE0F',
  no_entry: '\u26D4', 'no-entry': '\u26D4',
  no_entry_sign: '\u{1F6AB}', 'no-entry-sign': '\u{1F6AB}',
  white_circle: '\u26AA', 'white-circle': '\u26AA',
  red_circle: '\u{1F534}', 'red-circle': '\u{1F534}',
  large_blue_circle: '\u{1F535}', 'large-blue-circle': '\u{1F535}',
  large_green_circle: '\u{1F7E2}', 'large-green-circle': '\u{1F7E2}',
  large_orange_circle: '\u{1F7E0}', 'large-orange-circle': '\u{1F7E0}',
  large_yellow_circle: '\u{1F7E1}', 'large-yellow-circle': '\u{1F7E1}',
  large_purple_circle: '\u{1F7E3}', 'large-purple-circle': '\u{1F7E3}',
  black_circle: '\u26AB', 'black-circle': '\u26AB',
  white_large_square: '\u2B1C', 'white-large-square': '\u2B1C',
  black_large_square: '\u2B1B', 'black-large-square': '\u2B1B',
  arrow_up: '\u2B06\uFE0F', 'arrow-up': '\u2B06\uFE0F',
  arrow_down: '\u2B07\uFE0F', 'arrow-down': '\u2B07\uFE0F',
  arrow_left: '\u2B05\uFE0F', 'arrow-left': '\u2B05\uFE0F',
  arrow_right: '\u27A1\uFE0F', 'arrow-right': '\u27A1\uFE0F',
  bulb: '\u{1F4A1}',
};

/**
 * Parse Confluence storage format (XHTML) to DocumentContent blocks
 */
/**
 * 외부 HTML에서 위험한 요소 제거 (최소화)
 *
 * 보안 모델:
 * - 일반 콘텐츠: Tiptap이 허용된 노드 타입만 렌더링 (HTML 직접 렌더링 없음)
 * - HTML 매크로: iframe sandbox="allow-scripts" (WITHOUT allow-same-origin)가 보안 경계
 *
 * ★ on* 핸들러/javascript: URL 제거 제외:
 * - on* regex가 CDATA 경계를 인식하지 못해 HTML 매크로 내부 이벤트 핸들러도 함께 제거
 * - 일반 콘텐츠는 getTextContent()로 텍스트 추출 → Tiptap 블록으로 변환 (HTML 미사용)
 * - HTML 매크로는 sanitizeHtmlForEmbed() → iframe sandbox가 보호
 * - 따라서 이 단계에서 추가 새니타이즈 불필요
 */
function sanitizeExternalHtml(html: string): string {
  return html;
}

// ── Confluence 파서 컨텍스트 (모듈 레벨) ──────────────────
// parseConfluenceContent() 호출 시 설정, getTextContent() 등 내부 함수에서 참조
let _confluenceSiteUrl: string | undefined;
let _confluenceDefaultSpaceKey: string | undefined;

export interface ConfluenceParserOptions {
  /** Confluence 사이트 공개 URL (예: https://krafton.atlassian.net) */
  siteUrl?: string;
  /** 임포트 소스 페이지의 스페이스 키 (동일 스페이스 링크 해석용) */
  defaultSpaceKey?: string;
}

export function parseConfluenceContent(html: string, options?: ConfluenceParserOptions): DocumentContent {
  // 파서 컨텍스트 설정 (getTextContent 등 내부 함수에서 참조)
  _confluenceSiteUrl = options?.siteUrl;
  _confluenceDefaultSpaceKey = options?.defaultSpaceKey;

  try {
    return _parseConfluenceContentInner(html);
  } finally {
    _confluenceSiteUrl = undefined;
    _confluenceDefaultSpaceKey = undefined;
  }
}

function _parseConfluenceContentInner(html: string): DocumentContent {
  if (!html || !html.trim()) {
    return {
      blocks: [{
        id: uuidv4(),
        type: 'paragraph',
        content: '',
      }]
    };
  }

  // 외부 HTML 전처리 (현재 no-op: 보안은 Tiptap 렌더링 + iframe sandbox가 담당)
  const safeHtml = sanitizeExternalHtml(html);

  // Pre-process HTML to normalize Confluence namespaced elements
  // Replace ac: namespace with ac_ prefix for easier parsing
  // ★ 속성 정규화: (\s) 뿐 아니라 " 뒤의 ac:도 매칭 (속성값 사이 공백 없는 경우)
  const normalizedHtml = safeHtml
    .replace(/<ac:([a-z-]+)/gi, '<ac_$1')
    .replace(/<\/ac:([a-z-]+)/gi, '</ac_$1')
    .replace(/([\s"])ac:([a-z-]+)=/gi, '$1ac$2=')
    .replace(/<ri:([a-z-]+)/gi, '<ri_$1')
    .replace(/<\/ri:([a-z-]+)/gi, '</ri_$1')
    .replace(/([\s"])ri:([a-z-]+)=/gi, '$1ri$2=');

  // Load HTML with cheerio
  const $ = cheerio.load(normalizedHtml, {
    xml: true, // Confluence uses XHTML
  });

  const blocks: DocumentBlock[] = [];

  // Process top-level elements
  $('body').children().each((_, element) => {
    const parsedBlocks = parseElement($, element);
    blocks.push(...parsedBlocks);
  });

  // If no body, try parsing root elements
  if (blocks.length === 0) {
    $.root().children().each((_, element) => {
      const parsedBlocks = parseElement($, element);
      blocks.push(...parsedBlocks);
    });
  }

  // Ensure at least one block
  if (blocks.length === 0) {
    blocks.push({
      id: uuidv4(),
      type: 'paragraph',
      content: cleanText($.text()),
    });
  }

  // 중복 블록 제거 (리스트 항목과 동일한 내용의 paragraph 제거)
  const deduplicatedBlocks = removeDuplicateBlocks(blocks);

  return { blocks: deduplicatedBlocks };
}

const MAX_NESTING_DEPTH = 50;

/**
 * Parse a single element and return blocks
 */
function parseElement($: CheerioAPI, element: AnyNode, depth: number = 0): DocumentBlock[] {
  if (depth > MAX_NESTING_DEPTH) {
    const text = $(element).text().trim();
    if (text) {
      console.warn(`[ConfluenceParser] Max nesting depth (${MAX_NESTING_DEPTH}) exceeded, falling back to text`);
      return [{ id: uuidv4(), type: 'paragraph', content: text }];
    }
    return [];
  }

  const blocks: DocumentBlock[] = [];
  const $el = $(element);
  const tagName = element.type === 'tag' ? element.name.toLowerCase() : '';

  switch (tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(tagName[1]) as 1 | 2 | 3 | 4;
      const headingAlign = extractTextAlign($el);
      blocks.push({
        id: uuidv4(),
        type: 'heading',
        level: Math.min(level, 4) as 1 | 2 | 3 | 4,
        content: getTextContent($, $el),
        ...(headingAlign && { align: headingAlign }),
      });
      break;
    }

    case 'p': {
      // Check if paragraph contains only a macro
      // ★ 확장 셀렉터: acname 속성이 있는 모든 요소도 매크로 후보
      const macro = $el.find('ac_structured-macro, structured-macro, [acname], [ac\\:name]').first();
      const macroTagName = macro.length > 0 ? ((macro[0] as any)?.name || '').toLowerCase() : '';
      if (macro.length > 0 && (isMacroElement(macroTagName) || macro.attr('acname') || macro.attr('ac:name'))) {
        const macroResult = parseMacro($, macro, depth);
        if (macroResult) {
          if (Array.isArray(macroResult)) {
            blocks.push(...macroResult);
          } else {
            blocks.push(macroResult);
          }
          return blocks;
        }
      }

      // Check if paragraph contains a Smart Link embed (Figma, etc.)
      // Confluence Smart Cards: <a href="url" data-card-appearance="embed">
      const $smartLink = $el.find('a[data-card-appearance="embed"], a[data-card-appearance="block"]');
      if ($smartLink.length > 0) {
        const href = $smartLink.attr('href') || '';
        if (href.includes('figma.com')) {
          blocks.push({
            id: uuidv4(),
            type: 'embed',
            url: href,
            provider: 'figma',
          });
          return blocks;
        }
      }

      // Check for paragraph with only a Figma URL (plain link)
      const $links = $el.find('a');
      if ($links.length === 1 && $el.contents().length <= 2) {
        const href = $links.attr('href') || '';
        if (href.includes('figma.com/design/') || href.includes('figma.com/file/') || href.includes('figma.com/board/')) {
          blocks.push({
            id: uuidv4(),
            type: 'embed',
            url: href,
            provider: 'figma',
          });
          return blocks;
        }
      }

      // Check if paragraph contains images/videos - extract them as separate blocks
      const $images = $el.find('ac_image, image');
      if ($images.length > 0) {
        // Process each image/video as a separate block
        $images.each((_, img) => {
          const imageBlock = parseConfluenceImage($, $(img));
          if (imageBlock) {
            blocks.push(imageBlock);
          }
        });
        // Also get any remaining text content (excluding the image elements)
        const $clone = $el.clone();
        $clone.find('ac_image, image').remove();
        const text = getTextContent($, $clone);
        if (text && text.trim()) {
          blocks.push({
            id: uuidv4(),
            type: 'paragraph',
            content: text,
          });
        }
        return blocks;
      }

      const text = getTextContent($, $el);
      if (text) {
        // ★ corrupted 매크로 패턴 감지 (paragraph 안에 매크로 텍스트가 섞인 경우)
        const pCorruptedMatch = text.trim().match(/^(note|info|warning|tip|panel)[a-f0-9]{8,}([\s\S]*)/i);
        if (pCorruptedMatch) {
          const macroType = pCorruptedMatch[1].toLowerCase();
          let cleanBody = pCorruptedMatch[2] || '';
          const pipeIdx = cleanBody.indexOf('|');
          if (pipeIdx >= 0) {
            const beforePipe = cleanBody.substring(0, pipeIdx).replace(/^\*+|\*+$/g, '').trim();
            const afterPipe = cleanBody.substring(pipeIdx + 1).replace(/^[a-z]+/i, '').replace(/^\*+|\*+$/g, '').trim();
            cleanBody = beforePipe || afterPipe || pCorruptedMatch[2];
          }
          cleanBody = cleanBody.replace(/\*\*/g, '').trim();
          const variantMap: Record<string, string> = { note: 'info', info: 'info', warning: 'warning', tip: 'success', panel: 'info' };
          blocks.push({
            id: uuidv4(),
            type: 'callout',
            variant: variantMap[macroType] || 'info',
            content: cleanBody || text.trim(),
          });
        } else if (looksLikeJson(text)) {
          // Check if text looks like JSON - convert to code block
          blocks.push({
            id: uuidv4(),
            type: 'code',
            language: 'json',
            content: text,
          });
        } else {
          const pAlign = extractTextAlign($el);
          blocks.push({
            id: uuidv4(),
            type: 'paragraph',
            content: text,
            ...(pAlign && { align: pAlign }),
          });
        }
      }
      break;
    }

    case 'ul':
    case 'ol': {
      const listBlock = parseList($, $el, tagName === 'ol', depth);
      if (listBlock) {
        blocks.push(listBlock);
      }
      break;
    }

    case 'pre': {
      blocks.push({
        id: uuidv4(),
        type: 'code',
        language: 'text',
        content: cleanCodeContent($el.text()),
      });
      break;
    }

    case 'blockquote': {
      blocks.push({
        id: uuidv4(),
        type: 'blockquote',
        content: getTextContent($, $el),
      });
      break;
    }

    case 'table': {
      blocks.push(parseTable($, $el, depth));
      break;
    }

    case 'hr': {
      blocks.push({
        id: uuidv4(),
        type: 'divider',
      });
      break;
    }

    case 'ac:structured-macro':
    case 'ac_structured-macro':
    case 'structured-macro': {
      const macroResult = parseMacro($, $el, depth);
      if (macroResult) {
        if (Array.isArray(macroResult)) {
          blocks.push(...macroResult);
        } else {
          blocks.push(macroResult);
        }
      }
      break;
    }

    // Phase 1-2: ac:task-list → checkbox bullet list
    case 'ac:task-list':
    case 'ac_task-list':
    case 'task-list': {
      const taskListBlock = parseTaskList($, $el);
      if (taskListBlock) {
        blocks.push(taskListBlock);
      }
      break;
    }
    case 'ac:task':
    case 'ac_task':
    case 'task': {
      // Standalone task (outside task-list) — wrap in bullet
      const $status = $el.find('ac_task-status, task-status');
      const isComplete = $status.text().trim().toLowerCase() === 'complete';
      const $body = $el.find('ac_task-body, task-body');
      const text = $body.length > 0 ? getTextContent($, $body) : getTextContent($, $el);
      const cleanedText = text.replace(/^(complete|incomplete)\s*/i, '').trim();
      if (cleanedText) {
        blocks.push({
          id: uuidv4(),
          type: 'paragraph',
          content: `${isComplete ? '\u2705' : '\u2610'} ${cleanedText}`,
        });
      }
      break;
    }

    // Phase 2-6: colgroup/col — skip (표 스타일링 전용)
    case 'colgroup':
    case 'col':
    case 'caption':
      break;

    case 'ac:image':
    case 'ac_image':
    case 'image': {
      const imageBlock = parseConfluenceImage($, $el);
      if (imageBlock) {
        blocks.push(imageBlock);
      }
      break;
    }

    case 'img': {
      const src = $el.attr('src') || '';
      const alt = $el.attr('alt') || '';
      if (src) {
        blocks.push({
          id: uuidv4(),
          type: 'image',
          url: src,
          alt,
        });
      }
      break;
    }

    case 'iframe': {
      // Connect app 다이어그램 렌더링 (Atlas Authority 등)
      const iframeSrc = $el.attr('src') || '';
      const diagramBlock = parseIframeDiagram($, $el, iframeSrc);
      if (diagramBlock) {
        blocks.push(diagramBlock);
      }
      break;
    }

    case 'div':
    case 'article': {
      // Generic containers — recursively parse
      $el.children().each((_, child) => {
        blocks.push(...parseElement($, child, depth + 1));
      });
      break;
    }

    // Phase 3-1: ac:layout → 섹션 간 divider로 시각적 구분
    case 'ac:layout':
    case 'ac_layout':
    case 'layout': {
      const $sections = $el.children('ac_layout-section, layout-section');
      $sections.each((sIdx, sec) => {
        if (sIdx > 0) {
          blocks.push({ id: uuidv4(), type: 'divider' });
        }
        $(sec).find('ac_layout-cell, layout-cell').each((_, cell) => {
          $(cell).children().each((_, child) => {
            blocks.push(...parseElement($, child, depth + 1));
          });
        });
      });
      // Fallback: layout에 section 없으면 직접 재귀
      if ($sections.length === 0) {
        $el.children().each((_, child) => {
          blocks.push(...parseElement($, child, depth + 1));
        });
      }
      break;
    }

    case 'section':
    case 'ac:layout-section':
    case 'ac_layout-section':
    case 'layout-section':
    case 'ac:layout-cell':
    case 'ac_layout-cell':
    case 'layout-cell': {
      $el.children().each((_, child) => {
        blocks.push(...parseElement($, child, depth + 1));
      });
      break;
    }

    default: {
      // ★ 방어적 매크로 감지: acname/name 속성이 있으면 매크로로 시도
      const possibleMacroName = $el.attr('acname') || $el.attr('ac:name') || $el.attr('name') || '';
      if (possibleMacroName) {
        const macroResult = parseMacro($, $el, depth);
        if (macroResult) {
          if (Array.isArray(macroResult)) {
            blocks.push(...macroResult);
          } else {
            blocks.push(macroResult);
          }
          break;
        }
      }
      // ★ 텍스트 추출 + corrupted 매크로 복구
      const text = getTextContent($, $el);
      if (text && text.trim()) {
        // corrupted 매크로 패턴 감지: "note563721ed..." 형태
        const corruptedMatch = text.trim().match(/^(note|info|warning|tip|panel)[a-f0-9]{8,}([\s\S]*)/i);
        if (corruptedMatch) {
          const macroType = corruptedMatch[1].toLowerCase();
          const bodyText = corruptedMatch[2] || '';

          // corrupted 텍스트에서 본문 추출: UUID+파라미터 부분 제거하고 실제 콘텐츠만 추출
          let cleanBody = bodyText;
          const pipeIdx = cleanBody.indexOf('|');
          if (pipeIdx >= 0) {
            const beforePipe = cleanBody.substring(0, pipeIdx).replace(/^\*+|\*+$/g, '').trim();
            const afterPipe = cleanBody.substring(pipeIdx + 1).replace(/^[a-z]+/i, '').replace(/^\*+|\*+$/g, '').trim();
            cleanBody = beforePipe || afterPipe || bodyText;
          }
          // 볼드 마커 정리
          cleanBody = cleanBody.replace(/\*\*/g, '').trim();

          const variantMap: Record<string, string> = { note: 'info', info: 'info', warning: 'warning', tip: 'success', panel: 'info' };
          blocks.push({
            id: uuidv4(),
            type: 'callout',
            variant: variantMap[macroType] || 'info',
            content: cleanBody || text.trim(),
          });
        } else {
          blocks.push({
            id: uuidv4(),
            type: 'paragraph',
            content: text,
          });
        }
      }
      break;
    }
  }

  return blocks;
}

/**
 * Parse list (ul/ol) with proper nesting support
 */
function parseList($: CheerioAPI, $list: Cheerio<AnyNode>, ordered: boolean, depth: number = 0): DocumentBlock | null {
  const items: (string | { text: string; children?: DocumentBlock[] })[] = [];

  $list.children('li').each((_, li) => {
    const $li = $(li);
    const listItem = parseListItem($, $li, depth);
    if (listItem) {
      items.push(listItem);
    }
  });

  if (items.length === 0) {
    return null;
  }

  return {
    id: uuidv4(),
    type: 'list',
    listType: ordered ? 'number' : 'bullet',
    ordered,
    items,
  };
}

/**
 * Parse ac:task-list → checkbox bullet list
 */
function parseTaskList($: CheerioAPI, $taskList: Cheerio<AnyNode>): DocumentBlock | null {
  const items: (string | { text: string; children?: DocumentBlock[] })[] = [];

  $taskList.find('ac_task, task').each((_, task) => {
    const $task = $(task);
    const $status = $task.find('ac_task-status, task-status');
    const isComplete = $status.text().trim().toLowerCase() === 'complete';
    const prefix = isComplete ? '\u2705 ' : '\u2610 ';

    const $body = $task.find('ac_task-body, task-body');
    const text = $body.length > 0 ? getTextContent($, $body) : getTextContent($, $task);
    // Remove leading status text if getTextContent captured it
    const cleanedText = text.replace(/^(complete|incomplete)\s*/i, '');
    items.push(`${prefix}${cleanedText.trim()}`);
  });

  if (items.length === 0) return null;

  return {
    id: uuidv4(),
    type: 'list',
    listType: 'bullet',
    ordered: false,
    items,
  };
}

/**
 * Check if element is a Confluence macro
 */
function isMacroElement(tagName: string): boolean {
  return tagName === 'ac:structured-macro' ||
         tagName === 'ac_structured-macro' ||
         tagName === 'structured-macro' ||
         tagName.includes('structured-macro');
}

/**
 * Extract text-align from element's style attribute
 */
function extractTextAlign($el: Cheerio<AnyNode>): string | null {
  const style = $el.attr('style') || '';
  const alignMatch = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
  if (alignMatch) return alignMatch[1].toLowerCase();
  // Also check class-based alignment (some Confluence themes)
  const className = $el.attr('class') || '';
  if (className.includes('text-center') || className.includes('align-center')) return 'center';
  if (className.includes('text-right') || className.includes('align-right')) return 'right';
  return null;
}

/**
 * Check if text looks like JSON
 */
function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
         (/^\s*\{\s*"[^"]+"\s*:/.test(trimmed));
}

/**
 * Parse a single list item, handling nested content
 */
function parseListItem($: CheerioAPI, $li: Cheerio<AnyNode>, depth: number = 0): string | { text: string; children?: DocumentBlock[] } | null {
  const children: DocumentBlock[] = [];
  const textParts: string[] = [];

  // Only find macros that are DIRECT children of <li> (not inside nested <ul>/<ol>/<p>)
  const directMacros = $li.children('ac_structured-macro, structured-macro');

  // Process only direct child macros
  directMacros.each((_, macro) => {
    const macroResult = parseMacro($, $(macro), depth);
    if (macroResult) {
      if (Array.isArray(macroResult)) {
        children.push(...macroResult);
      } else {
        children.push(macroResult);
      }
    }
  });

  // Process each child node
  $li.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = $(node).text().trim();
      if (text) {
        textParts.push(text);
      }
    } else if (node.type === 'tag') {
      const $node = $(node);
      const tagName = (node as any).name?.toLowerCase() || '';

      // Check if this is a macro
      if (isMacroElement(tagName)) {
        // Already processed via find above, skip
        return;
      }

      switch (tagName) {
        case 'ul':
        case 'ol': {
          // Nested list - parse as child block
          const nestedList = parseList($, $node, tagName === 'ol', depth + 1);
          if (nestedList) {
            children.push(nestedList);
          }
          break;
        }

        case 'p': {
          // Check if paragraph contains a macro
          const pMacro = $node.find('ac_structured-macro, structured-macro').first();
          if (pMacro.length > 0) {
            const macroName = (pMacro.attr('acname') || pMacro.attr('ac:name') || pMacro.attr('name') || '').toLowerCase();
            // Check if there's text content besides the macro
            const $pClone = $node.clone();
            $pClone.find('ac_structured-macro, structured-macro').remove();
            const otherText = $pClone.text().trim();

            // Inline macros (status, jira, anchor) or <p> with mixed text+macro
            if (['status', 'jira', 'anchor'].includes(macroName) || otherText) {
              const pText = getTextContent($, $node);
              if (pText) {
                textParts.push(pText);
              }
            } else {
              // Block-level macro wrapped in <p> — parse as separate block
              const macroResult = parseMacro($, pMacro, depth);
              if (macroResult) {
                if (Array.isArray(macroResult)) {
                  children.push(...macroResult);
                } else {
                  children.push(macroResult);
                }
              }
            }
          } else {
            // Regular paragraph - add to text
            const pText = getTextContent($, $node);
            if (pText) {
              textParts.push(pText);
            }
          }
          break;
        }

        case 'pre': {
          // Code block inside list item
          children.push({
            id: uuidv4(),
            type: 'code',
            language: 'text',
            content: cleanCodeContent($node.text()),
          });
          break;
        }

        case 'table': {
          const tableBlock = parseTable($, $node, depth + 1);
          if (tableBlock) {
            children.push(tableBlock);
          }
          break;
        }

        default: {
          // Check if this element contains a macro
          const nestedMacro = $node.find('ac_structured-macro, structured-macro').first();
          if (nestedMacro.length > 0) {
            const macroResult = parseMacro($, nestedMacro, depth);
            if (macroResult) {
              if (Array.isArray(macroResult)) {
                children.push(...macroResult);
              } else {
                children.push(macroResult);
              }
            }
          } else {
            // For other inline elements, add text content
            const inlineText = getInlineText($, $node);
            if (inlineText) {
              textParts.push(inlineText);
            }
          }
          break;
        }
      }
    }
  });

  const text = textParts.join(' ').trim();

  // Deduplicate children (in case macros were found multiple times)
  const uniqueChildren = children.filter((child, index, self) =>
    index === self.findIndex((c) => c.id === child.id)
  );

  // Check if the text looks like JSON - if so, make it a code block
  if (text && looksLikeJson(text) && uniqueChildren.length === 0) {
    return {
      text: '',
      children: [{
        id: uuidv4(),
        type: 'code',
        language: 'json',
        content: text,
      }]
    };
  }

  if (uniqueChildren.length > 0) {
    return { text, children: uniqueChildren };
  }

  return text || null;
}

/**
 * Parse rich-text-body children as blocks
 */
function parseRichTextBodyAsBlocks($: CheerioAPI, $richBody: Cheerio<AnyNode>, depth: number = 0): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];

  $richBody.children().each((_, child) => {
    const parsedBlocks = parseElement($, child, depth + 1);
    blocks.push(...parsedBlocks);
  });

  return blocks;
}

/**
 * iframe 요소에서 다이어그램 정보를 추출
 */
function parseIframeDiagram($: CheerioAPI, $iframe: Cheerio<AnyNode>, src: string): DocumentBlock | null {
  const lowerSrc = src.toLowerCase();

  // iframe src에서 다이어그램 유형 감지
  let diagramType: 'plantuml' | 'mermaid' | null = null;
  if (lowerSrc.includes('plantuml') || lowerSrc.includes('c4-with-plantuml') || lowerSrc.includes('c4plantuml')) {
    diagramType = 'plantuml';
  } else if (lowerSrc.includes('mermaid')) {
    diagramType = 'mermaid';
  } else if (lowerSrc.includes('mmcc.atlasauthority') || lowerSrc.includes('atlasauthority')) {
    const iframeName = (($iframe.attr('name') || '') + ' ' + ($iframe.attr('id') || '') + ' ' + ($iframe.attr('data-app') || '')).toLowerCase();
    if (iframeName.includes('figma') || lowerSrc.includes('figma')) {
      return {
        id: uuidv4(),
        type: 'callout',
        variant: 'info',
        content: '[Figma Design] This content is embedded via the Confluence Figma plugin. Please view it on the original Confluence page.',
      };
    }
    diagramType = 'plantuml';
  }

  // draw.io / Gliffy iframe 감지
  if (!diagramType && (
    lowerSrc.includes('draw.io') || lowerSrc.includes('ac.draw.io') ||
    lowerSrc.includes('gliffy') || lowerSrc.includes('app.diagrams.net')
  )) {
    const nameMatch = src.match(/diagramName=([^&]+)/);
    const dName = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : '';
    return {
      id: uuidv4(),
      type: 'callout',
      variant: 'info',
      content: `[DRAW.IO Diagram${dName ? ': ' + dName : ''}] This diagram is embedded via iframe. Please view it on the original Confluence page.`,
    };
  }

  if (!diagramType) return null;

  // iframe 내부 SVG에서 base64 소스 추출 시도
  const iframeHtml = $iframe.html() || '';
  const srcComment = iframeHtml.match(/<!--\s*SRC=\[([^\]]+)\]\s*-->/);
  if (srcComment) {
    try {
      const decoded = Buffer.from(srcComment[1], 'base64').toString('utf-8');
      if (decoded.trim()) {
        return {
          id: uuidv4(),
          type: 'diagram',
          diagramType,
          content: decoded.trim(),
        };
      }
    } catch {
      // base64 decode failed
    }
  }

  // 소스 추출 실패 시 — 다이어그램 존재 표시만
  return {
    id: uuidv4(),
    type: 'callout',
    variant: 'info',
    content: `[${diagramType.toUpperCase()} Diagram] This diagram is rendered by a Confluence plugin and its source code cannot be directly extracted. Please check the original Confluence page.`,
  };
}

/**
 * Markdown fenced code block에서 PlantUML/Mermaid 다이어그램 추출
 */
function extractDiagramsFromMarkdown(markdown: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const fenceRegex = /```\s*(plantuml|mermaid|puml|uml|c4-with-plantuml|c4plantuml|plant-uml)\s*\n([\s\S]*?)```/gi;
  let match;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    const lang = match[1].toLowerCase();
    const content = match[2].trim();
    if (content) {
      const isPlantUml = lang !== 'mermaid';
      blocks.push({
        id: uuidv4(),
        type: 'diagram',
        diagramType: isPlantUml ? 'plantuml' : 'mermaid',
        content,
      });
    }
  }

  return blocks;
}

/**
 * Markdown에서 다이어그램 fenced code block을 제거한 나머지 텍스트 반환
 */
function stripDiagramFencesFromMarkdown(markdown: string): string {
  return markdown
    .replace(/```\s*(plantuml|mermaid|puml|uml|c4-with-plantuml|c4plantuml|plant-uml)\s*\n[\s\S]*?```/gi, '')
    .trim();
}

/**
 * 텍스트에서 PlantUML/Mermaid 다이어그램 패턴을 직접 감지
 */
function detectDiagramInText(text: string): { type: 'plantuml' | 'mermaid'; content: string } | null {
  const trimmed = text.trim();

  // PlantUML 패턴
  if (/^@start(uml|mindmap|wbs|ditaa|salt|gantt|json|yaml)/im.test(trimmed)) {
    return { type: 'plantuml', content: trimmed };
  }

  // Mermaid 패턴
  if (/^(graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie\s|journey|gitGraph)/im.test(trimmed)) {
    return { type: 'mermaid', content: trimmed };
  }

  return null;
}

/**
 * Figma URL 추출 유틸리티
 */
function extractFigmaUrl(
  params: Record<string, string>,
  bodyText: string,
  $richBody?: Cheerio<AnyNode>
): string | null {
  // 1. 직접 URL 파라미터
  for (const key of ['url', 'fileUrl', 'file-url', 'figmaUrl', 'uri', 'designUrl', 'design-url', 'design', '']) {
    const val = params[key] || '';
    if (val.includes('figma.com')) return val;
  }

  // 2. JSON data 파라미터 (Connect app 패턴)
  const dataStr = params.data || params.macroParams || '';
  if (dataStr) {
    try {
      const parsed = JSON.parse(dataStr);
      for (const key of ['url', 'fileUrl', 'file-url', 'figmaUrl', 'designUrl', 'href']) {
        if (parsed[key] && typeof parsed[key] === 'string' && parsed[key].includes('figma.com')) {
          return parsed[key];
        }
      }
    } catch { /* not JSON */ }
  }

  // 3. bodyText에서 figma.com URL 추출
  if (bodyText) {
    const match = bodyText.match(/https?:\/\/[^\s"'<>]*figma\.com\/(?:file|design|board|proto)[^\s"'<>]*/i);
    if (match) return match[0];
  }

  // 4. richBody HTML에서 figma.com URL 추출
  if ($richBody && $richBody.length > 0) {
    const html = $richBody.html() || '';
    const match = html.match(/https?:\/\/[^\s"'<>]*figma\.com\/(?:file|design|board|proto)[^\s"'<>]*/i);
    if (match) return match[0];
  }

  return null;
}

// ── Macro Handler Registry ──

interface MacroHandlerContext {
  $: CheerioAPI;
  $macro: Cheerio<AnyNode>;
  macroName: string;
  params: Record<string, string>;
  bodyText: string;
  $plainBody: Cheerio<AnyNode>;
  $richBody: Cheerio<AnyNode>;
  depth: number;
}

type MacroHandler = (ctx: MacroHandlerContext) => DocumentBlock | DocumentBlock[] | null;

// ── Handler Functions ──

function handleLanguageMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { $, $richBody, bodyText, depth } = ctx;
  if ($richBody.length > 0) {
    const blocks = parseRichTextBodyAsBlocks($, $richBody, depth);
    if (blocks.length > 0) {
      return blocks;
    }
  }
  if (bodyText) {
    return {
      id: uuidv4(),
      type: 'paragraph',
      content: bodyText,
    };
  }
  return null;
}

function handleCodeMacro(ctx: MacroHandlerContext): DocumentBlock | null {
  const { params, bodyText } = ctx;
  const language = params.language || params.lang || 'text';
  return {
    id: uuidv4(),
    type: 'code',
    language: normalizeLanguage(language),
    content: cleanCodeContent(bodyText),
  };
}

function handleCalloutMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { $, macroName, params, bodyText, $richBody, $plainBody, depth } = ctx;

  const variantMap: Record<string, string> = {
    info: 'info',
    note: 'info',
    warning: 'warning',
    tip: 'success',
    panel: 'info',
  };

  let variant = variantMap[macroName] || 'info';
  if (macroName === 'panel' && params.panelType) {
    const panelTypeMap: Record<string, string> = {
      info: 'info', note: 'info', warning: 'warning',
      success: 'success', error: 'error', tip: 'tip',
    };
    variant = panelTypeMap[params.panelType.toLowerCase()] || variant;
  }

  // ★ bodyText에서 pipe-separated 파라미터 잔여물 제거
  let cleanBodyText = bodyText || '';
  if (cleanBodyText.includes('|')) {
    const pipeIdx = cleanBodyText.indexOf('|');
    const afterPipe = cleanBodyText.substring(pipeIdx + 1);
    const paramMatch = afterPipe.match(/^([a-z]{1,20})([\s\S]*)/i);
    if (paramMatch) {
      const possibleParam = paramMatch[1].toLowerCase();
      const rest = paramMatch[2];
      const knownParamValues = ['none', 'true', 'false', 'info', 'note', 'warning', 'tip', 'error', 'atlassian'];
      if (knownParamValues.includes(possibleParam)) {
        const beforePipe = cleanBodyText.substring(0, pipeIdx).trim();
        cleanBodyText = beforePipe === rest.trim() ? beforePipe : `${beforePipe}\n${rest}`.trim();
      }
    }
  }

  // Parse rich-text-body as children blocks if available
  let children: DocumentBlock[] = [];
  if ($richBody.length > 0) {
    children = parseRichTextBodyAsBlocks($, $richBody, depth);
  }

  // ★ children 블록에서도 pipe-separated 파라미터 잔여물 제거
  if (children.length > 0) {
    children = children.map(child => {
      if (child.type === 'paragraph' && child.content && typeof child.content === 'string' && child.content.includes('|')) {
        const pipeIdx = child.content.indexOf('|');
        const afterPipe = child.content.substring(pipeIdx + 1);
        const paramMatch = afterPipe.match(/^([a-z]{1,20})([\s\S]*)/i);
        if (paramMatch) {
          const possibleParam = paramMatch[1].toLowerCase();
          const knownParamValues = ['none', 'true', 'false', 'info', 'note', 'warning', 'tip', 'error', 'atlassian'];
          if (knownParamValues.includes(possibleParam)) {
            const beforePipe = child.content.substring(0, pipeIdx).trim();
            const rest = paramMatch[2].trim();
            const cleanedContent = beforePipe === rest ? beforePipe : `${beforePipe}\n${rest}`.trim();
            return { ...child, content: cleanedContent };
          }
        }
      }
      return child;
    });
  }

  if (children.length > 0) {
    if (params.title) {
      children.unshift({
        id: uuidv4(),
        type: 'paragraph',
        content: `**${params.title}**`,
      });
    }
    return {
      id: uuidv4(),
      type: 'callout',
      variant,
      children,
    };
  }

  return {
    id: uuidv4(),
    type: 'callout',
    variant,
    content: params.title
      ? `**${params.title}**\n${cleanBodyText}`
      : cleanBodyText,
  };
}

function handleStatusMacro(ctx: MacroHandlerContext): DocumentBlock | null {
  const { params, bodyText } = ctx;
  const statusTitle = params.title || bodyText || '';
  if (statusTitle) {
    return {
      id: uuidv4(),
      type: 'paragraph',
      content: `**[${statusTitle.toUpperCase()}]**`,
    };
  }
  return null;
}

function handleExcerptMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { $, macroName, params, bodyText, $richBody, depth } = ctx;

  if (macroName === 'excerpt-include') {
    const excerptPage = params[''] || params.nopanel || '';
    return {
      id: uuidv4(),
      type: 'callout',
      variant: 'info',
      content: excerptPage ? `[Excerpt from: ${excerptPage}]` : '[Excerpt]',
    };
  }

  if ($richBody.length > 0) {
    const excerptBlocks = parseRichTextBodyAsBlocks($, $richBody, depth);
    if (excerptBlocks.length > 0) return excerptBlocks;
  }
  if (bodyText) {
    return { id: uuidv4(), type: 'paragraph', content: bodyText };
  }
  return null;
}

function handleLayoutMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { $, $richBody, bodyText, depth } = ctx;
  if ($richBody.length > 0) {
    const sectionBlocks = parseRichTextBodyAsBlocks($, $richBody, depth);
    if (sectionBlocks.length > 0) return sectionBlocks;
  }
  if (bodyText) {
    return { id: uuidv4(), type: 'paragraph', content: bodyText };
  }
  return null;
}

function handleJiraMacro(ctx: MacroHandlerContext): DocumentBlock | null {
  const { params, bodyText } = ctx;
  const jiraKey = params.key || '';
  const jiraServer = params.server || params.serverId || '';
  const jql = params.jqlQuery || params.jql || bodyText || '';
  if (jiraKey) {
    const jiraUrl = jiraServer
      ? `https://${jiraServer}/browse/${jiraKey}`
      : `#jira:${jiraKey}`;
    return {
      id: uuidv4(),
      type: 'paragraph',
      content: `[${jiraKey}](${jiraUrl})`,
    };
  }
  if (jql) {
    return {
      id: uuidv4(),
      type: 'callout',
      variant: 'info',
      content: `JIRA Query: ${jql}`,
    };
  }
  return null;
}

function handleTocMacro(_ctx: MacroHandlerContext): null {
  return null;
}

function handleEmbedMacro(ctx: MacroHandlerContext): DocumentBlock | null {
  const { macroName, params, bodyText, $richBody } = ctx;

  // Figma-specific macros
  if (macroName === 'figma' || macroName === 'figma-embed' ||
      macroName === 'figma-for-confluence' || macroName === 'figma-for-confluence-embed' ||
      macroName.includes('figma')) {
    const figmaUrl = extractFigmaUrl(params, bodyText, $richBody);
    if (figmaUrl) {
      return {
        id: uuidv4(),
        type: 'embed',
        url: figmaUrl,
        provider: 'figma',
      };
    }
    return {
      id: uuidv4(),
      type: 'callout',
      variant: 'info',
      content: '[Figma Design] This content is embedded via the Confluence Figma plugin. The Figma URL could not be extracted. Please check the original Confluence page.',
    };
  }

  // Widget / Embed macros
  const embedUrl = params.url || params.uri || params[''] || '';
  if (embedUrl) {
    // Figma detection
    if (embedUrl.includes('figma.com')) {
      return {
        id: uuidv4(),
        type: 'embed',
        url: embedUrl,
        provider: 'figma',
      };
    }
    // YouTube detection
    const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return {
        id: uuidv4(),
        type: 'youtube',
        videoId: ytMatch[1],
      };
    }
    // Generic embed
    return {
      id: uuidv4(),
      type: 'embed',
      url: embedUrl,
      provider: 'generic',
    };
  }
  return null;
}

function handleTabMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { $, macroName, params, bodyText, $richBody, depth } = ctx;

  if (macroName === 'localtabgroup') {
    const tabGroupResult: DocumentBlock[] = [];
    if ($richBody.length > 0) {
      const $tabs = $richBody.children('ac_structured-macro, structured-macro').filter((_, el) => {
        const name = ($(el).attr('acname') || $(el).attr('ac:name') || $(el).attr('name') || '').toLowerCase();
        return name === 'localtab';
      });

      if ($tabs.length > 0) {
        $tabs.each((tabIdx, tabEl) => {
          const $tab = $(tabEl);
          let tabTitle = '';
          $tab.children('ac_parameter, parameter').each((_, param) => {
            const pName = ($(param).attr('acname') || $(param).attr('ac:name') || $(param).attr('name') || '').toLowerCase();
            if (pName === 'title' || pName === '') {
              tabTitle = $(param).text();
            }
          });

          if (tabIdx > 0) {
            tabGroupResult.push({ id: uuidv4(), type: 'divider' });
          }

          if (tabTitle) {
            tabGroupResult.push({
              id: uuidv4(),
              type: 'heading',
              level: 3,
              content: tabTitle,
            });
          }

          const $tabBody = $tab.children('ac_rich-text-body, rich-text-body').first();
          if ($tabBody.length > 0) {
            const tabBlocks = parseRichTextBodyAsBlocks($, $tabBody, depth + 1);
            tabGroupResult.push(...tabBlocks);
          }
        });
      } else {
        const fallbackBlocks = parseRichTextBodyAsBlocks($, $richBody, depth);
        tabGroupResult.push(...fallbackBlocks);
      }
    }
    return tabGroupResult.length > 0 ? tabGroupResult : null;
  }

  // 단독 localtab
  const tabTitle = params.title || params[''] || '';
  const tabResult: DocumentBlock[] = [];
  if (tabTitle) {
    tabResult.push({
      id: uuidv4(),
      type: 'heading',
      level: 3,
      content: tabTitle,
    });
  }
  if ($richBody.length > 0) {
    const tabBlocks = parseRichTextBodyAsBlocks($, $richBody, depth);
    tabResult.push(...tabBlocks);
  } else if (bodyText) {
    tabResult.push({ id: uuidv4(), type: 'paragraph', content: bodyText });
  }
  return tabResult.length > 0 ? tabResult : null;
}

function handleExpandMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { $, params, bodyText, $richBody, depth } = ctx;
  const expandTitle = params.title || params[''] || '';

  let children: DocumentBlock[] = [];
  if ($richBody.length > 0) {
    children = parseRichTextBodyAsBlocks($, $richBody, depth);
  } else if (bodyText) {
    children.push({
      id: uuidv4(),
      type: 'paragraph',
      content: bodyText,
    });
  }

  if (children.length === 0) return null;

  return {
    id: uuidv4(),
    type: 'details',
    title: expandTitle || '클릭하여 펼치기',
    children,
  };
}

function handleAnchorMacro(_ctx: MacroHandlerContext): null {
  return null;
}

function handleMediaMacro(ctx: MacroHandlerContext): DocumentBlock | null {
  const { $macro, macroName, params } = ctx;
  const $attachment = $macro.find('ri_attachment, attachment');
  if ($attachment.length > 0) {
    const filename = $attachment.attr('ri:filename') ||
                     $attachment.attr('rifilename') ||
                     $attachment.attr('filename') || '';
    if (filename) {
      const blockType = isVideoFile(filename) ? 'video' : 'file';
      return {
        id: uuidv4(),
        type: blockType,
        url: `confluence:attachment:${filename}`,
        alt: filename,
        filename,
      };
    }
  }
  const videoUrl = params.url || params.URL || '';
  if (videoUrl) {
    return {
      id: uuidv4(),
      type: 'embed',
      url: videoUrl,
      provider: 'video',
    };
  }
  return null;
}

function handleDiagramMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { macroName, params, bodyText } = ctx;

  // PlantUML / Mermaid text-based diagrams
  if (macroName === 'plantuml' || macroName === 'mermaid') {
    if (bodyText) {
      return {
        id: uuidv4(),
        type: 'diagram',
        diagramType: macroName === 'plantuml' ? 'plantuml' : 'mermaid',
        content: bodyText,
      };
    }
    return null;
  }

  // macro-diagram / diagram (Atlas Authority plugin)
  if (macroName === 'macro-diagram' || macroName === 'diagram') {
    const syntaxParam = (params.syntax || params.language || '').toLowerCase();
    let diagType: 'plantuml' | 'mermaid' = 'plantuml';
    if (syntaxParam.includes('mermaid')) {
      diagType = 'mermaid';
    } else if (bodyText) {
      const detected = detectDiagramInText(bodyText);
      if (detected) diagType = detected.type;
    }

    if (bodyText) {
      const diagramBlocks = extractDiagramsFromMarkdown(bodyText);
      if (diagramBlocks.length > 0) {
        return diagramBlocks.length === 1 ? diagramBlocks[0] : diagramBlocks;
      }

      return {
        id: uuidv4(),
        type: 'diagram',
        diagramType: diagType,
        content: bodyText,
      };
    }
    return null;
  }

  // draw.io / gliffy 다이어그램 처리
  const diagramName = params.diagramName || params.diagramDisplayName || '';
  const custContentId = params.custContentId || '';
  const diagramPageId = params.pageId || '';
  const inlineXml = bodyText?.trim() || '';

  if (custContentId || diagramPageId || inlineXml) {
    return {
      id: uuidv4(),
      type: 'image',
      url: `confluence:diagram:${custContentId || diagramPageId || 'inline'}`,
      alt: diagramName || `${macroName} diagram`,
      diagramMeta: {
        macroType: macroName,
        custContentId,
        diagramName,
        pageId: diagramPageId,
        inlineXml,
        width: parseInt(params.width || '0', 10) || undefined,
        height: parseInt(params.height || '0', 10) || undefined,
      },
      ...(params.width && { width: parseInt(params.width, 10) }),
      ...(params.height && { height: parseInt(params.height, 10) }),
    };
  }

  return {
    id: uuidv4(),
    type: 'callout',
    variant: 'info',
    content: `[${macroName.toUpperCase()} Diagram${diagramName ? ': ' + diagramName : ''}] This diagram cannot be displayed outside Confluence. Please check the original Confluence page.`,
  };
}

function handleMarkdownMacro(ctx: MacroHandlerContext): DocumentBlock | DocumentBlock[] | null {
  const { macroName, bodyText } = ctx;
  if (bodyText) {
    const diagramBlocks = extractDiagramsFromMarkdown(bodyText);
    if (diagramBlocks.length > 0) {
      const remainingText = stripDiagramFencesFromMarkdown(bodyText);
      const result: DocumentBlock[] = [...diagramBlocks];
      if (remainingText.trim()) {
        result.push({
          id: uuidv4(),
          type: 'paragraph',
          content: remainingText.trim(),
        });
      }
      return result.length === 1 ? result[0] : result;
    }
    return {
      id: uuidv4(),
      type: 'paragraph',
      content: bodyText,
    };
  }
  return null;
}

function handleHtmlMacro(ctx: MacroHandlerContext): DocumentBlock | null {
  const { macroName, params, bodyText, $plainBody, $richBody } = ctx;

  let rawHtml = '';
  if ($plainBody.length > 0) {
    rawHtml = bodyText;
  } else if ($richBody.length > 0) {
    rawHtml = $richBody.html() || '';
  }

  if (!rawHtml?.trim()) return null;

  // Atlas Authority iframe-only 콘텐츠 감지
  if (rawHtml.includes('mmcc.atlasauthority.com') || rawHtml.includes('atlasauthority.com')) {
    const figmaUrl = extractFigmaUrl(params, bodyText, $richBody);
    if (figmaUrl) {
      return {
        id: uuidv4(),
        type: 'embed',
        url: figmaUrl,
        provider: 'figma',
      };
    }
    return {
      id: uuidv4(),
      type: 'callout',
      variant: 'info',
      content: '[External Plugin Content] This content is rendered by a Confluence external plugin (Atlas Authority) and cannot be displayed directly. Please check the original Confluence page.',
    };
  }

  // Figma 콘텐츠 감지
  if (rawHtml.includes('figma.com') || rawHtml.includes('figma.design')) {
    const figmaUrl = extractFigmaUrl(params, bodyText, $richBody);
    if (figmaUrl) {
      return {
        id: uuidv4(),
        type: 'embed',
        url: figmaUrl,
        provider: 'figma',
      };
    }
    return {
      id: uuidv4(),
      type: 'callout',
      variant: 'info',
      content: '[Figma Design] This content is embedded via the Confluence Figma plugin. The Figma URL could not be extracted. Please check the original Confluence page.',
    };
  }

  // 명시적 HTML 매크로: 항상 embed로 처리
  const sanitizedHtml = sanitizeHtmlForEmbed(rawHtml);

  return {
    id: uuidv4(),
    type: 'html',
    htmlContent: sanitizedHtml,
    content: '[Embedded HTML]',
  };
}

// ── Macro Handler Registry ──

const MACRO_HANDLERS: Record<string, MacroHandler> = {
  // Language
  'korean': handleLanguageMacro,
  'english': handleLanguageMacro,
  'english-us': handleLanguageMacro,
  'japanese': handleLanguageMacro,
  'chinese': handleLanguageMacro,
  'german': handleLanguageMacro,
  'french': handleLanguageMacro,
  'spanish': handleLanguageMacro,
  'portuguese': handleLanguageMacro,
  'russian': handleLanguageMacro,
  'italian': handleLanguageMacro,

  // Code
  'code': handleCodeMacro,

  // Callout
  'info': handleCalloutMacro,
  'note': handleCalloutMacro,
  'warning': handleCalloutMacro,
  'tip': handleCalloutMacro,
  'panel': handleCalloutMacro,

  // Status
  'status': handleStatusMacro,

  // Excerpt
  'excerpt': handleExcerptMacro,
  'excerpt-include': handleExcerptMacro,

  // Layout
  'section': handleLayoutMacro,
  'column': handleLayoutMacro,

  // JIRA
  'jira': handleJiraMacro,

  // TOC / Navigation (skip)
  'toc': handleTocMacro,
  'toc-zone': handleTocMacro,
  'children': handleTocMacro,
  'recently-updated': handleTocMacro,

  // Figma embed
  'figma': handleEmbedMacro,
  'figma-embed': handleEmbedMacro,
  'figma-for-confluence': handleEmbedMacro,
  'figma-for-confluence-embed': handleEmbedMacro,

  // Widget / Embed
  'widget': handleEmbedMacro,
  'widget-connector': handleEmbedMacro,
  'embed': handleEmbedMacro,

  // Tabs
  'localtabgroup': handleTabMacro,
  'localtab': handleTabMacro,

  // Expand
  'expand': handleExpandMacro,

  // Anchor (skip)
  'anchor': handleAnchorMacro,

  // Media
  'multimedia': handleMediaMacro,
  'view-file': handleMediaMacro,
  'video': handleMediaMacro,

  // Diagrams — text-based
  'plantuml': handleDiagramMacro,
  'mermaid': handleDiagramMacro,
  'macro-diagram': handleDiagramMacro,
  'diagram': handleDiagramMacro,

  // Diagrams — visual (draw.io, gliffy)
  'drawio': handleDiagramMacro,
  'drawio-board': handleDiagramMacro,
  'drawio-sketch': handleDiagramMacro,
  'drawio-viewer': handleDiagramMacro,
  'gliffy': handleDiagramMacro,

  // Markdown
  'markdown': handleMarkdownMacro,
  'markdown-from-url': handleMarkdownMacro,
  'markdown-macro': handleMarkdownMacro,
  'markdown-html-macro': handleMarkdownMacro,
  'mmcc-markdown': handleMarkdownMacro,

  // HTML
  'html': handleHtmlMacro,
  'html-macro': handleHtmlMacro,
  'macro-html': handleHtmlMacro,
  'html-include': handleHtmlMacro,
  'html-xhtml': handleHtmlMacro,
  'html-bobswift': handleHtmlMacro,
  'html-content-macro': handleHtmlMacro,
};

/**
 * Parse Confluence macro
 */
function parseMacro($: CheerioAPI, $macro: Cheerio<AnyNode>, depth: number = 0): DocumentBlock | DocumentBlock[] | null {
  const macroName = ($macro.attr('acname') || $macro.attr('ac:name') || $macro.attr('name') || '').toLowerCase();

  // Get body content
  const $plainBody = $macro.children('ac_plain-text-body, plain-text-body').first();
  const $richBody = $macro.children('ac_rich-text-body, rich-text-body').first();

  let bodyText = '';
  if ($plainBody.length > 0) {
    let text = $plainBody.text();

    // Method 2: CDATA child node 직접 탐색
    if (!text || !text.trim()) {
      $plainBody.contents().each((_, node: any) => {
        if (node.type === 'cdata') {
          text = node.data || '';
        }
      });
    }

    // Method 3: html()에서 CDATA 마커 추출
    if (!text || !text.trim()) {
      const html = $plainBody.html() || '';
      const cdataMatch = html.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (cdataMatch) {
        text = cdataMatch[1];
      } else if (html.trim()) {
        text = html.replace(/<[^>]*>/g, '');
      }
    }

    // CDATA 래퍼가 남아있으면 제거
    text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    bodyText = text;
  } else if ($richBody.length > 0) {
    bodyText = getTextContent($, $richBody);
  }

  // Get parameters
  const params: Record<string, string> = {};
  $macro.children('ac_parameter, parameter').each((_, param) => {
    const $param = $(param);
    const name = $param.attr('acname') || $param.attr('ac:name') || $param.attr('name') || '';
    const value = $param.text();
    if (name) {
      params[name] = value;
    }
  });

  // Build handler context
  const ctx: MacroHandlerContext = {
    $, $macro, macroName, params, bodyText, $plainBody, $richBody, depth,
  };

  // 1. Registry lookup — exact match
  const handler = MACRO_HANDLERS[macroName];
  if (handler) {
    const result = handler(ctx);
    if (result !== undefined) return result;
  }

  // 2. Variant fallback (includes-based detection)

  if (macroName.includes('figma')) {
    const result = handleEmbedMacro(ctx);
    if (result) return result;
  }

  if (macroName.includes('html')) {
    const result = handleHtmlMacro(ctx);
    if (result) return result;
  }

  if (macroName.includes('drawio') || macroName.includes('gliffy') || macroName.includes('diagrams.net')) {
    const result = handleDiagramMacro(ctx);
    if (result) return result;
  }

  if (macroName.includes('video') || macroName === 'media' || macroName === 'mediaplayer') {
    const result = handleMediaMacro(ctx);
    if (result) return result;
  }

  if (macroName.includes('plantuml') || macroName.includes('mermaid')) {
    if (bodyText) {
      return {
        id: uuidv4(),
        type: 'diagram',
        diagramType: macroName.includes('plantuml') ? 'plantuml' : 'mermaid',
        content: bodyText,
      };
    }
  }

  if (macroName.includes('markdown') || macroName.includes('diagram') || macroName.includes('chart')) {
    if (bodyText) {
      const diagramBlocks = extractDiagramsFromMarkdown(bodyText);
      if (diagramBlocks.length > 0) {
        return diagramBlocks.length === 1 ? diagramBlocks[0] : diagramBlocks;
      }
    }
  }

  // 3. Default fallback

  if (bodyText) {
    const detected = detectDiagramInText(bodyText);
    if (detected) {
      return {
        id: uuidv4(),
        type: 'diagram',
        diagramType: detected.type,
        content: detected.content,
      };
    }
    if (macroName) {
      return {
        id: uuidv4(),
        type: 'callout',
        variant: 'info',
        content: `**[${macroName}]** ${bodyText}`,
      };
    }
    return {
      id: uuidv4(),
      type: 'paragraph',
      content: bodyText,
    };
  }

  if ($richBody.length > 0) {
    const richBlocks = parseRichTextBodyAsBlocks($, $richBody, depth);
    if (richBlocks.length > 0) {
      if (macroName) {
        richBlocks.unshift({
          id: uuidv4(),
          type: 'paragraph',
          content: `**[${macroName}]**`,
        });
      }
      return richBlocks;
    }
  }
  return null;
}

/**
 * Check if a filename is a video file
 */
function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogg', '.m4v', '.wmv', '.flv'];
  const lowerFilename = filename.toLowerCase();
  return videoExtensions.some(ext => lowerFilename.endsWith(ext));
}

/**
 * Parse Confluence image element
 */
function parseConfluenceImage($: CheerioAPI, $image: Cheerio<AnyNode>): DocumentBlock | null {
  const $attachment = $image.find('ri_attachment, attachment');
  if ($attachment.length > 0) {
    const filename = $attachment.attr('ri:filename') ||
                     $attachment.attr('rifilename') ||
                     $attachment.attr('filename') || '';

    if (filename) {
      const blockType = isVideoFile(filename) ? 'video' : 'image';
      return {
        id: uuidv4(),
        type: blockType,
        url: `confluence:attachment:${filename}`,
        alt: filename,
        filename,
      };
    }
  }

  const $url = $image.find('ri_url, url');
  if ($url.length > 0) {
    const value = $url.attr('ri:value') ||
                  $url.attr('rivalue') ||
                  $url.attr('value') || '';

    if (value) {
      const blockType = isVideoFile(value) ? 'video' : 'image';
      return {
        id: uuidv4(),
        type: blockType,
        url: value,
        alt: '',
      };
    }
  }

  const src = $image.attr('src');
  if (src) {
    const blockType = isVideoFile(src) ? 'video' : 'image';
    return {
      id: uuidv4(),
      type: blockType,
      url: src,
      alt: $image.attr('alt') || '',
    };
  }

  return null;
}

/**
 * Parse table element
 */
function parseTable($: CheerioAPI, $table: Cheerio<AnyNode>, depth: number = 0): DocumentBlock {
  const headers: any[] = [];
  const rows: any[][] = [];

  const hasRichContent = ($cell: Cheerio<AnyNode>): boolean => {
    if ($cell.find('ac_structured-macro, structured-macro, [acname]').length > 0) return true;
    if ($cell.find('ul, ol').length > 0) return true;
    if ($cell.find('p').length > 1) return true;
    if ($cell.find('table').length > 0) return true;
    if ($cell.find('ac_image, image, img').length > 0) return true;
    return false;
  };

  const parseCellAsBlocks = ($cell: Cheerio<AnyNode>): DocumentBlock[] => {
    const blocks: DocumentBlock[] = [];

    $cell.children().each((_, child) => {
      const $child = $(child);
      const tagName = (child as any).name?.toLowerCase() || '';

      if (tagName === 'p') {
        const $pImages = $child.find('ac_image, image');
        if ($pImages.length > 0) {
          $pImages.each((_, img) => {
            const imageBlock = parseConfluenceImage($, $(img));
            if (imageBlock) blocks.push(imageBlock);
          });
          const $clone = $child.clone();
          $clone.find('ac_image, image').remove();
          const remainingText = getTextContent($, $clone);
          if (remainingText?.trim()) {
            blocks.push({ id: uuidv4(), type: 'paragraph', content: remainingText.trim() });
          }
        } else {
          const text = getTextContent($, $child);
          if (text.trim()) {
            blocks.push({ id: uuidv4(), type: 'paragraph', content: text.trim() });
          }
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        const listBlock = parseList($, $child, tagName === 'ol', depth + 1);
        if (listBlock) blocks.push(listBlock);
      } else if (tagName === 'table') {
        const nestedTable = parseTable($, $child, depth + 1);
        if (nestedTable) blocks.push(nestedTable);
      } else if (isMacroElement(tagName) || $child.attr('acname') || $child.attr('name')) {
        const macroResult = parseMacro($, $child, depth + 1);
        if (macroResult) {
          if (Array.isArray(macroResult)) {
            blocks.push(...macroResult);
          } else {
            blocks.push(macroResult);
          }
        }
      } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
        const level = parseInt(tagName.charAt(1), 10);
        const text = getTextContent($, $child);
        if (text.trim()) {
          blocks.push({ id: uuidv4(), type: 'heading', level, content: text.trim() });
        }
      } else if (tagName === 'ac_image' || tagName === 'ac:image' || tagName === 'image') {
        const imageBlock = parseConfluenceImage($, $child);
        if (imageBlock) blocks.push(imageBlock);
      } else if (tagName === 'img') {
        const src = $child.attr('src') || '';
        const alt = $child.attr('alt') || '';
        if (src) {
          blocks.push({ id: uuidv4(), type: 'image', url: src, alt });
        }
      } else {
        const text = getTextContent($, $child);
        if (text.trim()) {
          blocks.push({ id: uuidv4(), type: 'paragraph', content: text.trim() });
        }
      }
    });

    return blocks;
  };

  const parseCell = ($cell: Cheerio<AnyNode>, isHeaderCell: boolean = false): any[] => {
    const colspan = parseInt($cell.attr('colspan') || '1', 10);
    const rowspan = parseInt($cell.attr('rowspan') || '1', 10);
    const bgColor = $cell.attr('data-highlight-colour') || '';

    let cellValue: any;
    const hasSpanOrBg = colspan > 1 || rowspan > 1 || !!bgColor || isHeaderCell;

    if (hasRichContent($cell)) {
      const blocks = parseCellAsBlocks($cell);
      const textContent = getTextContent($, $cell);
      cellValue = {
        content: textContent,
        blocks,
        ...(colspan > 1 && { colspan }),
        ...(rowspan > 1 && { rowspan }),
        ...(bgColor && { backgroundColor: bgColor }),
        ...(isHeaderCell && { isHeader: true }),
      };
    } else {
      const content = getTextContent($, $cell);
      if (hasSpanOrBg) {
        cellValue = {
          content,
          ...(colspan > 1 && { colspan }),
          ...(rowspan > 1 && { rowspan }),
          ...(bgColor && { backgroundColor: bgColor }),
          ...(isHeaderCell && { isHeader: true }),
        };
      } else {
        cellValue = content;
      }
    }

    const cells: any[] = [cellValue];
    for (let i = 1; i < colspan; i++) {
      cells.push('');
    }
    return cells;
  };

  // Try to find header row
  const $thead = $table.find('thead');
  if ($thead.length > 0) {
    $thead.find('tr').first().find('th, td').each((_, cell) => {
      headers.push(...parseCell($(cell)));
    });
  }

  if (headers.length === 0) {
    const $firstRow = $table.find('tr').first();
    const $ths = $firstRow.children('th');
    const $tds = $firstRow.children('td');
    if ($ths.length > 0 && $tds.length === 0) {
      $ths.each((_, th) => {
        headers.push(...parseCell($(th)));
      });
    }
  }

  let expectedColumns = headers.length;

  const $rows = $table.find('tbody tr').length > 0
    ? $table.find('tbody tr')
    : $table.find('tr');

  $rows.each((index, tr) => {
    const $tr = $(tr);
    if ($tr.find('th').length > 0 && $tr.find('td').length === 0 && headers.length > 0) {
      return;
    }
    if ($tr.parent('thead').length > 0) {
      return;
    }

    const row: any[] = [];
    $tr.find('td, th').each((_, cell) => {
      const tagName = (cell as any).name?.toLowerCase() || '';
      row.push(...parseCell($(cell), tagName === 'th'));
    });

    if (row.length > expectedColumns) {
      expectedColumns = row.length;
    }

    if (row.length > 0) {
      rows.push(row);
    }
  });

  // rowspan/colspan 병합 셀 존재 여부 확인
  const hasMergedCells =
    headers.some((h: any) => (typeof h === 'object' && ((h.rowspan && h.rowspan > 1) || (h.colspan && h.colspan > 1)))) ||
    rows.some((row: any[]) =>
      row.some((c: any) => typeof c === 'object' && ((c.rowspan && c.rowspan > 1) || (c.colspan && c.colspan > 1)))
    );

  const normalizedRows = hasMergedCells
    ? rows
    : rows.map(row => {
        if (row.length < expectedColumns) {
          return [...row, ...Array(expectedColumns - row.length).fill('')];
        }
        return row;
      });

  let normalizedHeaders = headers;
  if (!hasMergedCells && normalizedHeaders.length < expectedColumns) {
    normalizedHeaders = [...normalizedHeaders, ...Array(expectedColumns - normalizedHeaders.length).fill('')];
  }

  return {
    id: uuidv4(),
    type: 'table',
    headers: normalizedHeaders.length > 0 ? normalizedHeaders : undefined,
    rows: normalizedRows,
  };
}

/**
 * Get text content with inline formatting converted to markdown
 */
function getTextContent($: CheerioAPI, $el: Cheerio<AnyNode>): string {
  let result = '';

  $el.contents().each((_, node) => {
    if (node.type === 'text') {
      result += $(node).text();
    } else if (node.type === 'tag') {
      const $node = $(node);
      const tagName = node.name.toLowerCase();

      switch (tagName) {
        case 'strong':
        case 'b':
          result += `**${getTextContent($, $node)}**`;
          break;
        case 'em':
        case 'i':
          result += `*${getTextContent($, $node)}*`;
          break;
        case 'code':
          result += `\`${$node.text()}\``;
          break;
        case 'a': {
          const mentionId = $node.attr('data-account-id') || $node.attr('data-atlassian-id') || '';
          if (mentionId) {
            const mentionText = getTextContent($, $node).replace(/^@\s*/, '');
            result += mentionText ? `@(${mentionText})` : `@(${mentionId})`;
            break;
          }
          const href = $node.attr('href') || '';
          const text = getTextContent($, $node);
          const safeText = text.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
          result += `[${safeText}](${href})`;
          break;
        }
        case 'ac:link':
        case 'ac_link':
        case 'link': {
          const $userRef = $node.find('ri_user, ri\\:user, user');
          if ($userRef.length > 0) {
            const userKey = $userRef.attr('ri:userkey') || $userRef.attr('riuserkey') ||
                            $userRef.attr('ri:account-id') || $userRef.attr('riaccount-id') ||
                            $userRef.attr('userkey') || $userRef.attr('account-id') || '';
            const displayName = $node.find('ac_plain-text-link-body, plain-text-link-body').text() ||
                               $node.find('ac_link-body, link-body').text() ||
                               $node.text().trim() || '';
            const isAccountIdPattern = /^[0-9a-f]{6}:[0-9a-f-]{36}$/i.test(displayName) ||
                                       /^\d+:[0-9a-f-]{36}$/i.test(displayName);
            result += (displayName && !isAccountIdPattern) ? `@(${displayName})` : (userKey ? `@(${userKey})` : '@(unknown)');
            break;
          }
          const $attachment = $node.find('ri_attachment, attachment');
          if ($attachment.length > 0) {
            const filename = $attachment.attr('ri:filename') ||
                             $attachment.attr('rifilename') ||
                             $attachment.attr('filename') || '';
            const linkText = $node.find('ac_plain-text-link-body, plain-text-link-body').text() ||
                            $node.find('ac_link-body, link-body').text() ||
                            filename;
            if (filename) {
              result += `[file:${linkText}](confluence:attachment:${filename})`;
            }
          } else {
            const linkText = $node.find('ac_plain-text-link-body, plain-text-link-body').text() ||
                            $node.find('ac_link-body, link-body').text() ||
                            $node.text();
            const pageTitle = $node.find('ri_page, page').attr('ricontent-title') ||
                             $node.find('ri_page, page').attr('ri:content-title') ||
                             $node.find('ri_page, page').attr('content-title') || '';
            const spaceKey = $node.find('ri_page, page').attr('rispace-key') ||
                            $node.find('ri_page, page').attr('ri:space-key') ||
                            $node.find('ri_page, page').attr('space-key') ||
                            _confluenceDefaultSpaceKey || '';
            const displayText = linkText || pageTitle;
            if (_confluenceSiteUrl && (pageTitle || displayText) && spaceKey) {
              const encodedTitle = encodeURIComponent(pageTitle || displayText).replace(/%20/g, '+');
              const pageUrl = `${_confluenceSiteUrl}/wiki/display/${spaceKey}/${encodedTitle}`;
              const safeLinkText = displayText.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
              result += `[${safeLinkText}](${pageUrl})`;
            } else {
              result += displayText;
            }
          }
          break;
        }
        case 'br':
          result += '\n';
          break;
        case 'span': {
          const className = $node.attr('class') || '';
          if (className.includes('status-macro') || className.includes('aui-lozenge')) {
            const statusText = $node.text().trim();
            if (statusText) {
              result += `**[${statusText}]**`;
            }
          } else {
            result += getTextContent($, $node);
          }
          break;
        }
        case 'div':
        case 'font':
          result += getTextContent($, $node);
          break;
        case 'ac:emoticon':
        case 'ac_emoticon':
        case 'emoticon': {
          const emoName = $node.attr('acname') || $node.attr('ac:name') || $node.attr('name') || '';
          result += CONFLUENCE_EMOTICON_MAP[emoName] || CONFLUENCE_EMOTICON_MAP[emoName.replace(/-/g, '_')] || `(${emoName})`;
          break;
        }
        case 'ac:placeholder':
        case 'ac_placeholder':
        case 'placeholder':
          break;
        case 'img': {
          const src = $node.attr('src') || '';
          const alt = $node.attr('alt') || '';
          if (src) {
            result += `![${alt}](${src})`;
          }
          break;
        }
        case 'ac:image':
        case 'ac_image':
        case 'image': {
          const $attachment = $node.find('ri_attachment, attachment');
          const $url = $node.find('ri_url, url');
          if ($attachment.length > 0) {
            const filename = $attachment.attr('ri:filename') ||
                             $attachment.attr('rifilename') ||
                             $attachment.attr('filename') || '';
            if (filename) {
              if (isVideoFile(filename)) {
                result += `[video:${filename}](confluence:attachment:${filename})`;
              } else {
                result += `![${filename}](confluence:attachment:${filename})`;
              }
            }
          } else if ($url.length > 0) {
            const value = $url.attr('ri:value') ||
                          $url.attr('rivalue') ||
                          $url.attr('value') || '';
            if (value) {
              if (isVideoFile(value)) {
                result += `[video:](${value})`;
              } else {
                result += `![](${value})`;
              }
            }
          }
          break;
        }
        case 'ri:user':
        case 'ri_user':
        case 'user': {
          const userKey = $node.attr('ri:userkey') || $node.attr('riuserkey') ||
                          $node.attr('ri:account-id') || $node.attr('riaccount-id') ||
                          $node.attr('userkey') || $node.attr('account-id') || '';
          result += userKey ? `@(${userKey})` : '@(unknown)';
          break;
        }
        case 'ac:inline-comment-marker':
        case 'ac_inline-comment-marker':
        case 'inline-comment-marker':
          result += getTextContent($, $node);
          break;
        case 'ac:structured-macro':
        case 'ac_structured-macro':
        case 'structured-macro': {
          const inlineMacroName = ($node.attr('acname') || $node.attr('ac:name') || $node.attr('name') || '').toLowerCase();
          if (inlineMacroName === 'status') {
            const statusTitle = $node.find('ac_parameter[acname="title"], parameter[acname="title"], ac_parameter[name="title"], parameter[name="title"]').text() ||
                                $node.find('ac_parameter, parameter').first().text() || '';
            result += statusTitle ? `**[${statusTitle.toUpperCase()}]**` : '';
          } else if (['note', 'info', 'warning', 'tip', 'panel'].includes(inlineMacroName)) {
            const $body = $node.find('ac_rich-text-body, rich-text-body, ac_plain-text-body, plain-text-body').first();
            if ($body.length > 0) {
              result += getTextContent($, $body);
            }
          } else {
            const $body = $node.find('ac_rich-text-body, rich-text-body, ac_plain-text-body, plain-text-body').first();
            if ($body.length > 0) {
              result += getTextContent($, $body);
            } else {
              result += getTextContent($, $node);
            }
          }
          break;
        }
        case 'sup':
          result += `<sup>${getTextContent($, $node)}</sup>`;
          break;
        case 'sub':
          result += `<sub>${getTextContent($, $node)}</sub>`;
          break;
        case 's':
        case 'strike':
        case 'del':
          result += `~~${getTextContent($, $node)}~~`;
          break;
        case 'u':
          result += `<u>${getTextContent($, $node)}</u>`;
          break;
        default:
          result += getTextContent($, $node);
          break;
      }
    }
  });

  return cleanText(result);
}

/**
 * Get inline text (simpler version for inline elements)
 */
function getInlineText($: CheerioAPI, $el: Cheerio<AnyNode>): string {
  return getTextContent($, $el);
}

/**
 * Clean text - normalize whitespace and decode entities
 */
function cleanText(text: string): string {
  if (!text) return '';

  let decoded = text.replace(/&amp;/g, '&');
  decoded = decodeHTML(decoded);
  decoded = decoded.replace(/\u00A0/g, ' ');

  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Clean code content - preserve formatting
 */
function cleanCodeContent(code: string): string {
  if (!code) return '';

  let cleaned = code
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = decodeHTML(cleaned);
  cleaned = cleaned.replace(/\u00A0/g, ' ');

  return cleaned.trim();
}

/**
 * Normalize language identifier
 */
function normalizeLanguage(lang: string): string {
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'shell': 'bash',
    'yml': 'yaml',
    'c#': 'csharp',
    'c++': 'cpp',
    'objective-c': 'objectivec',
  };

  const normalized = lang.toLowerCase().trim();
  return langMap[normalized] || normalized || 'text';
}

/**
 * Extract title from Confluence page
 */
export function extractConfluenceTitle(html: string, defaultTitle: string = 'Untitled'): string {
  const $ = cheerio.load(html, { xml: true });

  const h1 = $('h1').first().text();
  if (h1) {
    return cleanText(h1) || defaultTitle;
  }

  return defaultTitle;
}

/**
 * Remove duplicate blocks
 */
function removeDuplicateBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  if (blocks.length <= 1) return blocks;

  const listItemTexts = new Set<string>();

  for (const block of blocks) {
    if (block.type === 'list' && Array.isArray(block.items)) {
      for (const item of block.items) {
        const text = typeof item === 'string' ? item : (item?.text || '');
        if (text) {
          listItemTexts.add(normalizeForComparison(text));
        }
      }
    }
  }

  if (listItemTexts.size === 0) return blocks;

  const result: DocumentBlock[] = [];
  let skipCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.type === 'paragraph' && block.content) {
      const normalizedContent = normalizeForComparison(String(block.content));

      if (listItemTexts.has(normalizedContent)) {
        skipCount++;
        if (skipCount <= listItemTexts.size) {
          continue;
        }
      }
    }

    if (block.type !== 'paragraph' || !listItemTexts.has(normalizeForComparison(String(block.content || '')))) {
      skipCount = 0;
    }

    result.push(block);
  }

  return result;
}

/**
 * Normalize text for comparison
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── @Mention Processing ─────────────────────

/**
 * 블록 콘텐츠 내 @(accountId) → @(displayName) 치환
 * 미해석 @(accountId)는 @(unknown)으로 정리
 */
export function replaceMentionIds(
  content: DocumentContent,
  userNames: Map<string, ConfluenceUserInfo>
): DocumentContent {
  const SKIP_KEYS = new Set(['url', 'id', 'type', 'src', 'href', 'locale', 'filename', 'mediaType', 'alt']);

  function replaceInString(str: string): string {
    let result = str;
    for (const [accountId, info] of userNames) {
      const escaped = accountId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const replacement = info.email
        ? `@(${info.name}|${info.email})`
        : `@(${info.name})`;
      result = result.replace(
        new RegExp(`@\\(${escaped}\\)`, 'g'),
        replacement
      );
      result = result.replace(
        new RegExp(`@${escaped}(?=[\\s,;.)\\]}<]|$)`, 'g'),
        replacement
      );
    }
    result = result.replace(/@\([0-9a-f]{6,}:[0-9a-f-]{20,}\)/gi, '@(unknown)');
    result = result.replace(/@\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, '@(unknown)');
    result = result.replace(/@[0-9a-f]{6,}:[0-9a-f-]{20,}/gi, '@(unknown)');
    result = result.replace(/@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '@(unknown)');
    return result;
  }

  function traverse(obj: any, key?: string): any {
    if (!obj) return obj;
    if (typeof obj === 'string') {
      return (key && SKIP_KEYS.has(key)) ? obj : replaceInString(obj);
    }
    if (Array.isArray(obj)) return obj.map((item) => traverse(item));
    if (typeof obj === 'object') {
      const result = { ...obj };
      for (const k of Object.keys(result)) {
        result[k] = traverse(result[k], k);
      }
      return result;
    }
    return obj;
  }

  return { ...content, blocks: traverse(content.blocks) };
}
