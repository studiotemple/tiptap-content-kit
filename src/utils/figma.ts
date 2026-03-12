/**
 * Figma URL 파싱 + Embed Kit 2.0 URL 빌더
 *
 * Embed Kit 2.0 형식: https://embed.figma.com/{type}/{fileKey}?embed-host=kpp-dev-portal
 * Embed Kit 1.0 형식 (폴백): https://www.figma.com/embed?embed_host=share&url={encoded}
 *
 * @see reference/Figma_Web_Embed_Guide.md
 */

export type FigmaFileType = 'design' | 'board' | 'proto' | 'slides' | 'deck';

export interface FigmaUrlInfo {
  fileKey: string;
  type: FigmaFileType;
  nodeId?: string;
  fileName?: string;
}

const PATH_TYPE_MAP: Record<string, FigmaFileType> = {
  design: 'design',
  file: 'design', // 레거시 URL → design으로 매핑
  board: 'board',
  proto: 'proto',
  slides: 'slides',
  deck: 'deck',
};

/**
 * Figma URL에서 fileKey, type, nodeId 등 구조화된 정보 추출
 *
 * 지원 URL 패턴:
 * - figma.com/design/{fileKey}/{fileName}
 * - figma.com/file/{fileKey}/{fileName} (레거시)
 * - figma.com/board/{fileKey}/{fileName}
 * - figma.com/proto/{fileKey}/{fileName}
 * - figma.com/slides/{fileKey}/{fileName}
 * - figma.com/deck/{fileKey}/{fileName}
 */
export function parseFigmaUrl(url: string): FigmaUrlInfo | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('figma.com')) return null;

    // path: /{type}/{fileKey}/{fileName?}
    const segments = urlObj.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const pathType = segments[0];
    const figmaType = PATH_TYPE_MAP[pathType];
    if (!figmaType) return null;

    const fileKey = segments[1];
    if (!fileKey) return null;

    const fileName = segments[2] || undefined;
    const nodeId = urlObj.searchParams.get('node-id') || undefined;

    return { fileKey, type: figmaType, nodeId, fileName };
  } catch {
    return null;
  }
}

/**
 * Embed Kit 2.0 형식 URL 생성
 * 파싱 실패 시 Embed Kit 1.0 폴백
 */
export function buildFigmaEmbedUrl(url: string): string {
  const info = parseFigmaUrl(url);

  if (!info) {
    // Fallback: Embed Kit 1.0
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  }

  // Embed Kit 2.0
  const params = new URLSearchParams();
  params.set('embed-host', 'kpp-dev-portal');
  if (info.nodeId) params.set('node-id', info.nodeId);

  return `https://embed.figma.com/${info.type}/${info.fileKey}?${params.toString()}`;
}
