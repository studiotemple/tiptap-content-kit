/**
 * 파일 파서 모듈
 * PDF, DOCX, DOC, Markdown, TXT 파일에서 텍스트 콘텐츠 추출
 */

export interface ParsedFile {
  title: string;
  content: string;
  contentHtml?: string;
  fileType: 'pdf' | 'docx' | 'doc' | 'md' | 'txt';
  charCount: number;
}

const SUPPORTED_TYPES: Record<string, ParsedFile['fileType']> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'text/markdown': 'md',
  'text/plain': 'txt',
};

const EXTENSION_MAP: Record<string, ParsedFile['fileType']> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'doc',
  '.md': 'md',
  '.mdx': 'md',
  '.txt': 'txt',
  '.text': 'txt',
};

function detectFileType(filename: string, mimeType: string): ParsedFile['fileType'] | null {
  // MIME type first
  if (SUPPORTED_TYPES[mimeType]) {
    return SUPPORTED_TYPES[mimeType];
  }

  // Fallback to extension
  const ext = filename.toLowerCase().match(/\.\w+$/)?.[0];
  if (ext && EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }

  return null;
}

function extractTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.\w+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function parsePDF(buffer: Buffer): Promise<string> {
  // PDF 매직 넘버 확인 (%PDF-)
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF')) {
    // HTML 파일이 .pdf로 저장된 경우 감지
    const textPreview = buffer.subarray(0, 100).toString('utf-8').trim().toLowerCase();
    if (textPreview.startsWith('<') || textPreview.startsWith('<!doctype') || textPreview.startsWith('<html')) {
      throw new Error(
        '유효한 PDF 파일이 아닙니다. HTML 파일이 .pdf 확장자로 저장된 것 같습니다. ' +
        '웹페이지를 가져오려면 URL 가져오기를 사용해주세요.'
      );
    }
    throw new Error('유효한 PDF 파일이 아닙니다. 파일이 손상되었을 수 있습니다.');
  }

  try {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (err: any) {
    throw new Error(`PDF 파싱 실패: ${err.message || '파일을 읽을 수 없습니다.'}`);
  }
}

/**
 * .docx 파일의 실제 포맷 감지 (매직 넘버 기반)
 * - PK (0x50 0x4B): 정상 DOCX (ZIP 아카이브)
 * - OLE2 (D0 CF 11 E0): 레거시 .doc 또는 DRM 암호화된 .docx
 */
function detectDocxRealFormat(buffer: Buffer): 'docx' | 'doc' | null {
  const header = buffer.subarray(0, 4);
  if (header[0] === 0x50 && header[1] === 0x4b) return 'docx';
  if (header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0) return 'doc';
  return null;
}

/**
 * OLE2 컨테이너가 DRM/IRM 암호화된 파일인지 감지
 * EncryptedPackage 또는 DRMEncryptedDataSpace 문자열 존재 여부로 판단
 */
function isOLE2Encrypted(buffer: Buffer): boolean {
  // OLE2 스트림 이름은 UTF-16LE로 인코딩됨 (각 문자 사이에 null 바이트)
  // latin1과 UTF-16LE 양쪽 모두 검색
  const latin1 = buffer.toString('latin1');
  if (latin1.includes('EncryptedPackage') || latin1.includes('DRMEncryptedDataSpace')) {
    return true;
  }
  // UTF-16LE: 'E\0n\0c\0r\0y\0p\0t\0e\0d\0P\0a\0c\0k\0a\0g\0e\0'
  const encPkgUtf16 = Buffer.from('EncryptedPackage', 'utf16le');
  const drmUtf16 = Buffer.from('DRMEncryptedDataSpace', 'utf16le');
  return buffer.includes(encPkgUtf16) || buffer.includes(drmUtf16);
}

async function parseDOCX(buffer: Buffer): Promise<{ text: string; html: string }> {
  const realFormat = detectDocxRealFormat(buffer);

  // OLE2 컨테이너: DRM 암호화 여부 확인
  if (realFormat === 'doc') {
    if (isOLE2Encrypted(buffer)) {
      throw new Error(
        '이 파일은 DRM(정보 권한 관리)으로 보호되어 있어 콘텐츠를 추출할 수 없습니다. ' +
        'Word에서 파일을 열고 보호를 해제한 뒤, 일반 .docx로 다시 저장 후 업로드해주세요. ' +
        '(파일 > 정보 > 문서 보호 > 제한 없음)'
      );
    }
    const text = await parseDOC(buffer);
    return { text, html: '' };
  }

  if (realFormat !== 'docx') {
    throw new Error(
      '유효한 DOCX 파일이 아닙니다. 파일이 손상되었거나 다른 형식일 수 있습니다.'
    );
  }

  try {
    const mammoth = await import('mammoth');
    const [textResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);
    return {
      text: textResult.value || '',
      html: htmlResult.value || '',
    };
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('central directory') || msg.includes('zip')) {
      throw new Error(
        'DOCX 파일을 읽을 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식입니다. ' +
        '.docx 형식으로 다시 저장한 후 업로드해주세요.'
      );
    }
    throw new Error(`DOCX 파싱 실패: ${msg || '파일을 읽을 수 없습니다.'}`);
  }
}

async function parseDOC(buffer: Buffer): Promise<string> {
  try {
    const WordExtractor = (await import('word-extractor')).default;
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return doc.getBody() || '';
  } catch (err: any) {
    throw new Error(
      '이 파일은 구형 Word 형식(.doc)이지만 읽을 수 없습니다. ' +
      'Word에서 파일을 열고 .docx 형식으로 다시 저장한 후 업로드해주세요. ' +
      '(파일 > 다른 이름으로 저장 > Word 문서(.docx) 선택)'
    );
  }
}

function parseTextFile(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

/**
 * 파일 버퍼에서 텍스트 콘텐츠 추출
 */
export async function parseFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedFile> {
  const fileType = detectFileType(filename, mimeType);

  if (!fileType) {
    throw new Error(
      `지원하지 않는 파일 형식입니다. PDF, DOCX, DOC, MD, TXT만 지원합니다.`
    );
  }

  let content: string;
  let contentHtml: string | undefined;

  switch (fileType) {
    case 'pdf':
      content = await parsePDF(buffer);
      break;
    case 'docx': {
      const docxResult = await parseDOCX(buffer);
      content = docxResult.text;
      contentHtml = docxResult.html;
      break;
    }
    case 'doc': {
      content = await parseDOC(buffer);
      break;
    }
    case 'md':
    case 'txt':
      content = parseTextFile(buffer);
      break;
  }

  // Clean up whitespace
  content = content.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();

  // Extract title from content or filename
  let title: string;
  if (fileType === 'md') {
    const headingMatch = content.match(/^#\s+(.+)/m);
    title = headingMatch ? headingMatch[1].trim() : extractTitleFromFilename(filename);
  } else {
    // For PDF/DOCX, use first non-empty line as potential title
    const firstLine = content.split('\n').find(l => l.trim().length > 0)?.trim();
    title =
      firstLine && firstLine.length < 100
        ? firstLine
        : extractTitleFromFilename(filename);
  }

  return {
    title,
    content,
    contentHtml,
    fileType,
    charCount: content.length,
  };
}

/**
 * 파일 타입이 지원되는지 확인
 */
export function isSupportedFileType(filename: string, mimeType: string): boolean {
  return detectFileType(filename, mimeType) !== null;
}

/**
 * 최대 파일 크기 (20MB)
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
