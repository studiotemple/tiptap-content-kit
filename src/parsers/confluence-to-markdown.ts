/**
 * Confluence Storage Format → Markdown 변환 파서
 *
 * Confluence XHTML storage format을 마크다운으로 변환하는 경량 파서.
 *
 * 지원:
 * - 텍스트 서식 (bold, italic, underline, strikethrough, code)
 * - 헤딩 (h1-h6)
 * - 리스트 (ordered, unordered, nested)
 * - 테이블 (pipe table)
 * - 코드 블록 (언어 표시)
 * - 매크로 (note/info/warning → blockquote, status → badge, jira → link, code → fenced)
 * - 이모티콘 매핑
 * - 멘션 → @name
 * - 페이지 링크 → [title](url)
 * - HTML 엔티티 디코딩
 * - Corrupted 매크로 복구
 *
 * 제외 (에디터 전용):
 * - Tiptap JSON 출력
 * - htmlEmbed iframe
 * - ResizableImage
 * - DocumentLink
 * - S3 업로드
 * - 다이어그램 렌더링 (draw.io, gliffy 등)
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { decodeHTML } from 'entities';

// ═══════════════════════════════════════════
// 이모티콘 매핑
// ═══════════════════════════════════════════

const EMOTICON_MAP: Record<string, string> = {
  // 기본 표정
  smile: '\u{1F60A}', sad: '\u{1F622}', cheeky: '\u{1F61C}', laugh: '\u{1F602}', wink: '\u{1F609}',
  angry: '\u{1F620}', confused: '\u{1F615}', cool: '\u{1F60E}', cry: '\u{1F62D}', surprised: '\u{1F62E}',
  thinking: '\u{1F914}', sleeping: '\u{1F634}', sick: '\u{1F922}', nerd: '\u{1F913}', devil: '\u{1F608}',
  angel: '\u{1F607}',
  // 손 제스처
  thumbs_up: '\u{1F44D}', thumbs_down: '\u{1F44E}', clap: '\u{1F44F}', muscle: '\u{1F4AA}', pray: '\u{1F64F}',
  horns: '\u{1F918}', wave: '\u{1F44B}', ok: '\u{1F44C}', raised_hand: '\u270B', fist: '\u270A',
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
  hourglass: '\u23F3', stopwatch: '\u23F1\uFE0F', flag_off: '\u{1F3C1}',
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
  // 하이픈 별칭
  'thumbs-up': '\u{1F44D}', 'thumbs-down': '\u{1F44E}', 'light-on': '\u{1F4A1}', 'light-off': '\u{1F4A1}',
  'yellow-star': '\u2B50', 'red-star': '\u2B50', 'green-star': '\u2B50', 'blue-star': '\u2B50',
  'broken-heart': '\u{1F494}', 'flag-off': '\u{1F3C1}', 'light-bulb': '\u{1F4A1}',
  'magnifying-glass': '\u{1F50D}', 'raised-hand': '\u270B', 'point-up': '\u261D\uFE0F',
  'point-down': '\u{1F447}', 'point-left': '\u{1F448}', 'point-right': '\u{1F449}',
};

// ═══════════════════════════════════════════
// 파서 컨텍스트 (모듈 레벨)
// ═══════════════════════════════════════════

let _siteUrl: string | undefined;
let _defaultSpaceKey: string | undefined;

export interface ConfluenceMarkdownParserOptions {
  /** Confluence 사이트 공개 URL (예: https://krafton.atlassian.net) */
  siteUrl?: string;
  /** 임포트 소스 페이지의 스페이스 키 */
  defaultSpaceKey?: string;
}

// ═══════════════════════════════════════════
// 메인 함수
// ═══════════════════════════════════════════

export function parseConfluenceStorageToMarkdown(
  html: string,
  options?: ConfluenceMarkdownParserOptions,
): string {
  if (!html || !html.trim()) return '';

  _siteUrl = options?.siteUrl;
  _defaultSpaceKey = options?.defaultSpaceKey;

  try {
    // Namespace 정규화 (ac:xxx → ac_xxx, ri:xxx → ri_xxx)
    const normalized = html
      .replace(/<ac:([a-z-]+)/gi, '<ac_$1')
      .replace(/<\/ac:([a-z-]+)/gi, '</ac_$1')
      .replace(/([\s"])ac:([a-z-]+)=/gi, '$1ac$2=')
      .replace(/<ri:([a-z-]+)/gi, '<ri_$1')
      .replace(/<\/ri:([a-z-]+)/gi, '</ri_$1')
      .replace(/([\s"])ri:([a-z-]+)=/gi, '$1ri$2=');

    const $ = cheerio.load(normalized, { xml: true });

    const lines: string[] = [];

    // body가 있으면 body children, 없으면 root children
    const $root = ($('body').length > 0 ? $('body') : $.root()) as Cheerio<AnyNode>;
    $root.children().each((_, el) => {
      const result = parseElement($, el);
      if (result) lines.push(result);
    });

    return lines.join('\n\n').trim();
  } finally {
    _siteUrl = undefined;
    _defaultSpaceKey = undefined;
  }
}

// ═══════════════════════════════════════════
// 텍스트 정리
// ═══════════════════════════════════════════

function cleanText(text: string): string {
  if (!text) return '';
  let decoded = text.replace(/&amp;/g, '&');
  decoded = decodeHTML(decoded);
  decoded = decoded.replace(/\u00A0/g, ' ');
  return decoded.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
}

function cleanCodeContent(code: string): string {
  if (!code) return '';
  let cleaned = code.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = decodeHTML(cleaned);
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  return cleaned.trim();
}

function normalizeLanguage(lang: string): string {
  const langMap: Record<string, string> = {
    'js': 'javascript', 'ts': 'typescript', 'py': 'python',
    'rb': 'ruby', 'sh': 'bash', 'shell': 'bash', 'yml': 'yaml',
    'c#': 'csharp', 'c++': 'cpp', 'objective-c': 'objectivec',
  };
  const normalized = lang.toLowerCase().trim();
  return langMap[normalized] || normalized || 'text';
}

// ═══════════════════════════════════════════
// 인라인 텍스트 추출 (getTextContent)
// ═══════════════════════════════════════════

function getTextContent($: CheerioAPI, $el: Cheerio<AnyNode>): string {
  let result = '';

  $el.contents().each((_, node) => {
    if (node.type === 'text') {
      result += $(node).text();
    } else if (node.type === 'tag') {
      const $node = $(node);
      const tag = node.name.toLowerCase();

      switch (tag) {
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
        case 's':
        case 'strike':
        case 'del':
          result += `~~${getTextContent($, $node)}~~`;
          break;
        case 'u':
          result += getTextContent($, $node);
          break;
        case 'sup':
          result += `<sup>${getTextContent($, $node)}</sup>`;
          break;
        case 'sub':
          result += `<sub>${getTextContent($, $node)}</sub>`;
          break;
        case 'a': {
          const mentionId = $node.attr('data-account-id') || $node.attr('data-atlassian-id') || '';
          if (mentionId) {
            const mentionText = getTextContent($, $node).replace(/^@\s*/, '');
            result += mentionText ? `@${mentionText}` : `@${mentionId}`;
            break;
          }
          const href = $node.attr('href') || '';
          const text = getTextContent($, $node);
          result += href ? `[${text}](${href})` : text;
          break;
        }
        case 'ac:link':
        case 'ac_link':
        case 'link': {
          const $userRef = $node.find('ri_user, ri\\:user, user');
          if ($userRef.length > 0) {
            const displayName =
              $node.find('ac_plain-text-link-body, plain-text-link-body').text() ||
              $node.find('ac_link-body, link-body').text() ||
              $node.text().trim() || '';
            const isAccountId = /^[0-9a-f]{6}:[0-9a-f-]{36}$/i.test(displayName) ||
                                /^\d+:[0-9a-f-]{36}$/i.test(displayName);
            result += (displayName && !isAccountId) ? `@${displayName}` : '@unknown';
            break;
          }
          const $att = $node.find('ri_attachment, attachment');
          if ($att.length > 0) {
            const filename = $att.attr('ri:filename') || $att.attr('rifilename') || $att.attr('filename') || '';
            const linkText = $node.find('ac_plain-text-link-body, plain-text-link-body').text() ||
                             $node.find('ac_link-body, link-body').text() || filename;
            result += linkText || filename;
            break;
          }
          const linkText = $node.find('ac_plain-text-link-body, plain-text-link-body').text() ||
                           $node.find('ac_link-body, link-body').text() || $node.text();
          const pageTitle = $node.find('ri_page, page').attr('ricontent-title') ||
                            $node.find('ri_page, page').attr('ri:content-title') ||
                            $node.find('ri_page, page').attr('content-title') || '';
          const spaceKey = $node.find('ri_page, page').attr('rispace-key') ||
                           $node.find('ri_page, page').attr('ri:space-key') ||
                           $node.find('ri_page, page').attr('space-key') ||
                           _defaultSpaceKey || '';
          const displayText = linkText || pageTitle;
          if (_siteUrl && (pageTitle || displayText) && spaceKey) {
            const encodedTitle = encodeURIComponent(pageTitle || displayText).replace(/%20/g, '+');
            result += `[${displayText}](${_siteUrl}/wiki/display/${spaceKey}/${encodedTitle})`;
          } else {
            result += displayText;
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
            if (statusText) result += `**[${statusText}]**`;
          } else {
            result += getTextContent($, $node);
          }
          break;
        }
        case 'ac:emoticon':
        case 'ac_emoticon':
        case 'emoticon': {
          const emoName = $node.attr('acname') || $node.attr('ac:name') || $node.attr('name') || '';
          result += EMOTICON_MAP[emoName] || EMOTICON_MAP[emoName.replace(/-/g, '_')] || `(${emoName})`;
          break;
        }
        case 'ac:placeholder':
        case 'ac_placeholder':
        case 'placeholder':
          break;
        case 'img': {
          const src = $node.attr('src') || '';
          const alt = $node.attr('alt') || '';
          if (src) result += `![${alt}](${src})`;
          break;
        }
        case 'ac:image':
        case 'ac_image':
        case 'image': {
          const $att = $node.find('ri_attachment, attachment');
          const $url = $node.find('ri_url, url');
          if ($att.length > 0) {
            const filename = $att.attr('ri:filename') || $att.attr('rifilename') || $att.attr('filename') || '';
            if (filename) result += `![${filename}]()`;
          } else if ($url.length > 0) {
            const value = $url.attr('ri:value') || $url.attr('rivalue') || $url.attr('value') || '';
            if (value) result += `![](${value})`;
          }
          break;
        }
        case 'ri:user':
        case 'ri_user':
        case 'user': {
          const userKey = $node.attr('ri:userkey') || $node.attr('riuserkey') ||
                          $node.attr('ri:account-id') || $node.attr('riaccount-id') ||
                          $node.attr('userkey') || $node.attr('account-id') || '';
          result += userKey ? `@${userKey}` : '@unknown';
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
          const inlineName = ($node.attr('acname') || $node.attr('ac:name') || $node.attr('name') || '').toLowerCase();
          if (inlineName === 'status') {
            const title = $node.find('ac_parameter[acname="title"], parameter[acname="title"], ac_parameter[name="title"], parameter[name="title"]').text() ||
                          $node.find('ac_parameter, parameter').first().text() || '';
            if (title) result += `**[${title.toUpperCase()}]**`;
          } else {
            const $body = $node.find('ac_rich-text-body, rich-text-body, ac_plain-text-body, plain-text-body').first();
            if ($body.length > 0) {
              result += getTextContent($, $body);
            }
          }
          break;
        }
        default:
          result += getTextContent($, $node);
          break;
      }
    }
  });

  return cleanText(result);
}

// ═══════════════════════════════════════════
// 요소 파싱 → 마크다운 문자열 반환
// ═══════════════════════════════════════════

const MAX_DEPTH = 50;

function parseElement($: CheerioAPI, element: AnyNode, depth: number = 0): string {
  if (depth > MAX_DEPTH) {
    const text = $(element).text().trim();
    return text || '';
  }

  const $el = $(element);
  const tag = element.type === 'tag' ? element.name.toLowerCase() : '';

  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const level = parseInt(tag[1] || '1', 10);
      const prefix = '#'.repeat(level);
      const text = getTextContent($, $el);
      return text ? `${prefix} ${text}` : '';
    }

    case 'p': {
      const $macro = $el.find('ac_structured-macro, structured-macro, [acname], [ac\\:name]').first();
      if ($macro.length > 0) {
        const macroResult = parseMacro($, $macro, depth);
        if (macroResult) return macroResult;
      }
      const text = getTextContent($, $el);
      if (!text) return '';
      const corrupted = text.trim().match(/^(note|info|warning|tip|panel)[a-f0-9]{8,}([\s\S]*)/i);
      if (corrupted) {
        const macroType = (corrupted[1] || 'note').toLowerCase();
        const labelMap: Record<string, string> = { note: 'Note', info: 'Info', warning: 'Warning', tip: 'Tip', panel: 'Note' };
        let body = corrupted[2] || '';
        const pipeIdx = body.indexOf('|');
        if (pipeIdx >= 0) {
          const before = body.substring(0, pipeIdx).replace(/^\*+|\*+$/g, '').trim();
          const after = body.substring(pipeIdx + 1).replace(/^[a-z]+/i, '').replace(/^\*+|\*+$/g, '').trim();
          body = before || after || corrupted[2] || '';
        }
        body = body.replace(/\*\*/g, '').trim();
        return `> **${labelMap[macroType] || 'Note'}**: ${body || text.trim()}`;
      }
      return text;
    }

    case 'ul':
    case 'ol':
      return parseList($, $el, tag === 'ol', 0);

    case 'pre': {
      const code = cleanCodeContent($el.text());
      return code ? '```\n' + code + '\n```' : '';
    }

    case 'blockquote': {
      const text = getTextContent($, $el);
      return text ? text.split('\n').map(line => `> ${line}`).join('\n') : '';
    }

    case 'table':
      return parseTable($, $el);

    case 'hr':
      return '---';

    case 'ac:structured-macro':
    case 'ac_structured-macro':
    case 'structured-macro':
      return parseMacro($, $el, depth) || '';

    case 'ac:task-list':
    case 'ac_task-list':
    case 'task-list':
      return parseTaskList($, $el);

    case 'ac:task':
    case 'ac_task':
    case 'task': {
      const $status = $el.find('ac_task-status, task-status');
      const isComplete = $status.text().trim().toLowerCase() === 'complete';
      const $body = $el.find('ac_task-body, task-body');
      const text = $body.length > 0 ? getTextContent($, $body) : getTextContent($, $el);
      const cleaned = text.replace(/^(complete|incomplete)\s*/i, '').trim();
      return cleaned ? `${isComplete ? '- [x]' : '- [ ]'} ${cleaned}` : '';
    }

    case 'colgroup':
    case 'col':
    case 'caption':
      return '';

    case 'ac:image':
    case 'ac_image':
    case 'image': {
      const $att = $el.find('ri_attachment, attachment');
      const $url = $el.find('ri_url, url');
      if ($att.length > 0) {
        const filename = $att.attr('ri:filename') || $att.attr('rifilename') || $att.attr('filename') || '';
        return filename ? `![${filename}]()` : '';
      }
      if ($url.length > 0) {
        const value = $url.attr('ri:value') || $url.attr('rivalue') || $url.attr('value') || '';
        return value ? `![](${value})` : '';
      }
      return '';
    }

    case 'img': {
      const src = $el.attr('src') || '';
      const alt = $el.attr('alt') || '';
      return src ? `![${alt}](${src})` : '';
    }

    case 'ac:layout':
    case 'ac_layout':
    case 'layout': {
      const parts: string[] = [];
      const $sections = $el.children('ac_layout-section, layout-section');
      if ($sections.length > 0) {
        $sections.each((sIdx, sec) => {
          if (sIdx > 0) parts.push('---');
          $(sec).find('ac_layout-cell, layout-cell').each((_, cell) => {
            $(cell).children().each((_, child) => {
              const r = parseElement($, child, depth + 1);
              if (r) parts.push(r);
            });
          });
        });
      } else {
        $el.children().each((_, child) => {
          const r = parseElement($, child, depth + 1);
          if (r) parts.push(r);
        });
      }
      return parts.join('\n\n');
    }

    case 'section':
    case 'ac:layout-section':
    case 'ac_layout-section':
    case 'layout-section':
    case 'ac:layout-cell':
    case 'ac_layout-cell':
    case 'layout-cell':
    case 'div':
    case 'article': {
      const parts: string[] = [];
      $el.children().each((_, child) => {
        const r = parseElement($, child, depth + 1);
        if (r) parts.push(r);
      });
      return parts.join('\n\n');
    }

    default: {
      const possibleMacro = $el.attr('acname') || $el.attr('ac:name') || $el.attr('name') || '';
      if (possibleMacro) {
        const macroResult = parseMacro($, $el, depth);
        if (macroResult) return macroResult;
      }
      const text = getTextContent($, $el);
      if (text && text.trim()) {
        const corrupted = text.trim().match(/^(note|info|warning|tip|panel)[a-f0-9]{8,}([\s\S]*)/i);
        if (corrupted) {
          const macroType = (corrupted[1] || 'note').toLowerCase();
          const labelMap: Record<string, string> = { note: 'Note', info: 'Info', warning: 'Warning', tip: 'Tip', panel: 'Note' };
          let body = corrupted[2] || '';
          const pipeIdx = body.indexOf('|');
          if (pipeIdx >= 0) {
            const before = body.substring(0, pipeIdx).replace(/^\*+|\*+$/g, '').trim();
            const after = body.substring(pipeIdx + 1).replace(/^[a-z]+/i, '').replace(/^\*+|\*+$/g, '').trim();
            body = before || after || corrupted[2] || '';
          }
          body = body.replace(/\*\*/g, '').trim();
          return `> **${labelMap[macroType] || 'Note'}**: ${body || text.trim()}`;
        }
        return text;
      }
      return '';
    }
  }
}

// ═══════════════════════════════════════════
// 리스트 파싱
// ═══════════════════════════════════════════

function parseList($: CheerioAPI, $list: Cheerio<AnyNode>, ordered: boolean, indent: number): string {
  const lines: string[] = [];
  let itemIndex = 1;

  $list.children('li').each((_, li) => {
    const $li = $(li);
    const textParts: string[] = [];
    const childLists: string[] = [];

    $li.contents().each((_, node) => {
      if (node.type === 'text') {
        const t = $(node).text().trim();
        if (t) textParts.push(t);
      } else if (node.type === 'tag') {
        const $node = $(node);
        const tagName = (node as any).name?.toLowerCase() || '';

        if (tagName === 'ul' || tagName === 'ol') {
          childLists.push(parseList($, $node, tagName === 'ol', indent + 1));
        } else if (tagName === 'p') {
          const pText = getTextContent($, $node);
          if (pText) textParts.push(pText);
        } else if (isMacroTag(tagName)) {
          const macroResult = parseMacro($, $node, 0);
          if (macroResult) textParts.push(macroResult);
        } else {
          const inlineText = getTextContent($, $node);
          if (inlineText) textParts.push(inlineText);
        }
      }
    });

    const text = textParts.join(' ').trim();
    const prefix = '  '.repeat(indent) + (ordered ? `${itemIndex}. ` : '- ');
    if (text) {
      lines.push(`${prefix}${text}`);
      itemIndex++;
    }
    for (const childList of childLists) {
      lines.push(childList);
    }
  });

  return lines.join('\n');
}

function parseTaskList($: CheerioAPI, $taskList: Cheerio<AnyNode>): string {
  const lines: string[] = [];

  $taskList.find('ac_task, task').each((_, task) => {
    const $task = $(task);
    const $status = $task.find('ac_task-status, task-status');
    const isComplete = $status.text().trim().toLowerCase() === 'complete';
    const $body = $task.find('ac_task-body, task-body');
    const text = $body.length > 0 ? getTextContent($, $body) : getTextContent($, $task);
    const cleaned = text.replace(/^(complete|incomplete)\s*/i, '').trim();
    if (cleaned) {
      lines.push(`${isComplete ? '- [x]' : '- [ ]'} ${cleaned}`);
    }
  });

  return lines.join('\n');
}

// ═══════════════════════════════════════════
// 테이블 파싱 → Pipe table
// ═══════════════════════════════════════════

function parseTable($: CheerioAPI, $table: Cheerio<AnyNode>): string {
  const headerCells: string[] = [];
  const bodyRows: string[][] = [];

  const $thead = $table.find('thead');
  if ($thead.length > 0) {
    $thead.find('tr').first().find('th, td').each((_, cell) => {
      headerCells.push(getCellText($, $(cell)));
    });
  }

  if (headerCells.length === 0) {
    const $firstRow = $table.find('tr').first();
    const $ths = $firstRow.children('th');
    const $tds = $firstRow.children('td');
    if ($ths.length > 0 && $tds.length === 0) {
      $ths.each((_, th) => {
        headerCells.push(getCellText($, $(th)));
      });
    }
  }

  const $rows = $table.find('tbody tr').length > 0 ? $table.find('tbody tr') : $table.find('tr');
  $rows.each((_, tr) => {
    const $tr = $(tr);
    if ($tr.find('th').length > 0 && $tr.find('td').length === 0 && headerCells.length > 0) return;
    if ($tr.parent('thead').length > 0) return;

    const row: string[] = [];
    $tr.find('td, th').each((_, cell) => {
      row.push(getCellText($, $(cell)));
    });
    if (row.length > 0) bodyRows.push(row);
  });

  const colCount = Math.max(
    headerCells.length,
    ...bodyRows.map(r => r.length),
    1,
  );

  while (headerCells.length > 0 && headerCells.length < colCount) headerCells.push('');
  for (const row of bodyRows) {
    while (row.length < colCount) row.push('');
  }

  const lines: string[] = [];

  if (headerCells.length > 0) {
    lines.push('| ' + headerCells.map(escapePipe).join(' | ') + ' |');
    lines.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
  } else if (bodyRows.length > 0) {
    lines.push('| ' + Array(colCount).fill('').join(' | ') + ' |');
    lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');
  }

  for (const row of bodyRows) {
    lines.push('| ' + row.map(escapePipe).join(' | ') + ' |');
  }

  return lines.join('\n');
}

function getCellText($: CheerioAPI, $cell: Cheerio<AnyNode>): string {
  return getTextContent($, $cell).replace(/\n/g, ' ').trim();
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|');
}

// ═══════════════════════════════════════════
// 매크로 파싱
// ═══════════════════════════════════════════

function isMacroTag(tagName: string): boolean {
  return tagName === 'ac:structured-macro' ||
         tagName === 'ac_structured-macro' ||
         tagName === 'structured-macro' ||
         tagName.includes('structured-macro');
}

function parseMacro($: CheerioAPI, $macro: Cheerio<AnyNode>, depth: number): string | null {
  const macroName = ($macro.attr('acname') || $macro.attr('ac:name') || $macro.attr('name') || '').toLowerCase();
  if (!macroName) return null;

  const $plainBody = $macro.children('ac_plain-text-body, plain-text-body').first();
  const $richBody = $macro.children('ac_rich-text-body, rich-text-body').first();

  let bodyText = '';
  if ($plainBody.length > 0) {
    let text = $plainBody.text();
    if (!text || !text.trim()) {
      $plainBody.contents().each((_, node: any) => {
        if (node.type === 'cdata') text = node.data || '';
      });
    }
    if (!text || !text.trim()) {
      const html = $plainBody.html() || '';
      const cdataMatch = html.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (cdataMatch) text = cdataMatch[1] || '';
      else if (html.trim()) text = html.replace(/<[^>]*>/g, '');
    }
    text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    bodyText = text;
  } else if ($richBody.length > 0) {
    bodyText = getTextContent($, $richBody);
  }

  const params: Record<string, string> = {};
  $macro.children('ac_parameter, parameter').each((_, param) => {
    const $p = $(param);
    const name = $p.attr('acname') || $p.attr('ac:name') || $p.attr('name') || '';
    if (name) params[name] = $p.text();
  });

  if (macroName === 'code') {
    const lang = normalizeLanguage(params.language || params.lang || 'text');
    const code = cleanCodeContent(bodyText);
    return code ? '```' + lang + '\n' + code + '\n```' : null;
  }

  if (['note', 'info', 'warning', 'tip', 'panel'].includes(macroName)) {
    const labelMap: Record<string, string> = {
      note: 'Note', info: 'Info', warning: 'Warning', tip: 'Tip', panel: 'Note',
    };
    const label = labelMap[macroName] || 'Note';

    let content = '';
    if ($richBody.length > 0) {
      content = parseRichBodyAsMarkdown($, $richBody, depth);
    }
    if (!content) content = bodyText || '';

    content = cleanPipeParams(content);

    const titlePrefix = params.title ? `**${params.title}**\n` : '';
    const fullContent = titlePrefix + content;

    if (!fullContent.trim()) return null;
    return fullContent.split('\n').map(line => `> **${label}**: ${line}`).join('\n').replace(/> \*\*(Note|Info|Warning|Tip)\*\*: $/gm, '>');
  }

  if (macroName === 'status') {
    const title = params.title || bodyText || '';
    return title ? `**[${title.toUpperCase()}]**` : null;
  }

  if (macroName === 'jira') {
    const jiraKey = params.key || '';
    const jiraServer = params.server || params.serverId || '';
    const jql = params.jqlQuery || params.jql || bodyText || '';
    if (jiraKey) {
      const url = jiraServer ? `https://${jiraServer}/browse/${jiraKey}` : `#jira:${jiraKey}`;
      return `[${jiraKey}](${url})`;
    }
    if (jql) return `> **JIRA Query**: ${jql}`;
    return null;
  }

  if (macroName === 'anchor') return null;

  if (['toc', 'toc-zone', 'children', 'recently-updated'].includes(macroName)) return null;

  if (macroName === 'expand') {
    const title = params.title || params[''] || '';
    const parts: string[] = [];
    if (title) parts.push(`**${title}**`);
    if ($richBody.length > 0) {
      const content = parseRichBodyAsMarkdown($, $richBody, depth);
      if (content) parts.push(content);
    } else if (bodyText) {
      parts.push(bodyText);
    }
    return parts.length > 0 ? parts.join('\n\n') : null;
  }

  if (macroName === 'excerpt') {
    if ($richBody.length > 0) {
      const content = parseRichBodyAsMarkdown($, $richBody, depth);
      if (content) return content;
    }
    return bodyText || null;
  }
  if (macroName === 'excerpt-include') {
    const page = params[''] || params.nopanel || '';
    return page ? `> *Excerpt from: ${page}*` : '> *Excerpt*';
  }

  if (macroName === 'section' || macroName === 'column') {
    if ($richBody.length > 0) {
      return parseRichBodyAsMarkdown($, $richBody, depth);
    }
    return bodyText || null;
  }

  if (macroName === 'localtabgroup') {
    const parts: string[] = [];
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
            if (pName === 'title' || pName === '') tabTitle = $(param).text();
          });
          if (tabIdx > 0) parts.push('---');
          if (tabTitle) parts.push(`### ${tabTitle}`);
          const $tabBody = $tab.children('ac_rich-text-body, rich-text-body').first();
          if ($tabBody.length > 0) {
            const content = parseRichBodyAsMarkdown($, $tabBody, depth + 1);
            if (content) parts.push(content);
          }
        });
      } else {
        const content = parseRichBodyAsMarkdown($, $richBody, depth);
        if (content) parts.push(content);
      }
    }
    return parts.length > 0 ? parts.join('\n\n') : null;
  }
  if (macroName === 'localtab') {
    const tabTitle = params.title || params[''] || '';
    const parts: string[] = [];
    if (tabTitle) parts.push(`### ${tabTitle}`);
    if ($richBody.length > 0) {
      const content = parseRichBodyAsMarkdown($, $richBody, depth);
      if (content) parts.push(content);
    } else if (bodyText) {
      parts.push(bodyText);
    }
    return parts.length > 0 ? parts.join('\n\n') : null;
  }

  if (['korean', 'english', 'english-us', 'japanese', 'chinese', 'german',
       'french', 'spanish', 'portuguese', 'russian', 'italian'].includes(macroName)) {
    if ($richBody.length > 0) {
      return parseRichBodyAsMarkdown($, $richBody, depth);
    }
    return bodyText || null;
  }

  if (macroName.includes('html')) {
    return bodyText ? `> *[HTML Content]*\n> ${bodyText.substring(0, 200)}` : null;
  }

  if (['drawio', 'drawio-board', 'drawio-sketch', 'drawio-viewer', 'gliffy'].includes(macroName) ||
      macroName.includes('drawio') || macroName.includes('gliffy')) {
    const name = params.diagramName || params.diagramDisplayName || '';
    return `> *[${macroName.toUpperCase()} Diagram${name ? ': ' + name : ''}]*`;
  }

  if (macroName === 'plantuml' || macroName === 'mermaid' || macroName.includes('plantuml') || macroName.includes('mermaid')) {
    if (bodyText) {
      const lang = macroName.includes('mermaid') ? 'mermaid' : 'plantuml';
      return '```' + lang + '\n' + bodyText + '\n```';
    }
    return null;
  }

  if (macroName.includes('figma')) {
    const url = params.url || params.fileUrl || params['file-url'] || '';
    if (url && url.includes('figma.com')) return `[Figma Design](${url})`;
    return '> *[Figma Design — URL not available]*';
  }

  if (['widget', 'widget-connector', 'embed'].includes(macroName)) {
    const url = params.url || params.uri || params[''] || '';
    if (url) return `[${url}](${url})`;
    return null;
  }

  if (macroName === 'multimedia' || macroName === 'view-file' || macroName === 'video' ||
      macroName.includes('video') || macroName === 'media' || macroName === 'mediaplayer') {
    const $att = $macro.find('ri_attachment, attachment');
    if ($att.length > 0) {
      const filename = $att.attr('ri:filename') || $att.attr('rifilename') || $att.attr('filename') || '';
      if (filename) return `[${filename}]()`;
    }
    const url = params.url || params.URL || '';
    if (url) return `[Video](${url})`;
    return null;
  }

  if (macroName.includes('markdown')) {
    return bodyText || null;
  }

  if (bodyText) {
    return `> **[${macroName}]** ${bodyText}`;
  }
  if ($richBody.length > 0) {
    const content = parseRichBodyAsMarkdown($, $richBody, depth);
    if (content) return `> **[${macroName}]**\n${content}`;
  }
  return null;
}

// ═══════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════

function parseRichBodyAsMarkdown($: CheerioAPI, $richBody: Cheerio<AnyNode>, depth: number): string {
  const parts: string[] = [];
  $richBody.children().each((_, child) => {
    const r = parseElement($, child, depth + 1);
    if (r) parts.push(r);
  });
  return parts.join('\n\n');
}

function cleanPipeParams(text: string): string {
  if (!text.includes('|')) return text;
  const pipeIdx = text.indexOf('|');
  const after = text.substring(pipeIdx + 1);
  const paramMatch = after.match(/^([a-z]{1,20})([\s\S]*)/i);
  if (paramMatch) {
    const possibleParam = (paramMatch[1] || '').toLowerCase();
    const knownParams = ['none', 'true', 'false', 'info', 'note', 'warning', 'tip', 'error', 'atlassian'];
    if (knownParams.includes(possibleParam)) {
      const before = text.substring(0, pipeIdx).trim();
      const rest = (paramMatch[2] || '').trim();
      return before === rest ? before : `${before}\n${rest}`.trim();
    }
  }
  return text;
}
