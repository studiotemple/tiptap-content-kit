/**
 * AI Output Validation Pipeline
 *
 * AI 출력 → 에디터 사이의 단일 검증 게이트.
 * 모든 AI 기능(Import, Cleanup, Formatting)이 이 파이프라인을 통과한다.
 */

import { sanitizeBlock, extractBlockTypesUsed, isValidBlockType, isValidCalloutVariant, type DocumentBlock } from './block-schema';

export interface ValidationResult {
  blocks: DocumentBlock[];
  corrections: string[];
  blockTypesUsed: string[];
}

/**
 * AI가 생성한 블록 배열을 검증·정규화.
 *
 * 1. 배열 여부 확인
 * 2. 각 블록 sanitize (잘못된 type, variant 등 보정)
 * 3. 순차 ID 재할당
 * 4. 선행/후행 빈 paragraph 제거
 * 5. 보정 내역 기록
 */
export function validateAIOutput(rawBlocks: any[]): ValidationResult {
  const corrections: string[] = [];

  if (!Array.isArray(rawBlocks)) {
    corrections.push('Output was not an array, wrapped in array');
    rawBlocks = [rawBlocks].filter(Boolean);
  }

  const sanitized: DocumentBlock[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const raw = rawBlocks[i];
    if (!raw || typeof raw !== 'object') {
      corrections.push(`Block ${i}: removed non-object entry`);
      continue;
    }

    const originalType = raw.type;
    const originalVariant = raw.variant;

    const block = sanitizeBlock(raw);

    if (originalType !== block.type && !isValidBlockType(originalType)) {
      corrections.push(`Block ${i}: type "${originalType}" → "${block.type}"`);
    }
    if (raw.type === 'callout' && originalVariant && !isValidCalloutVariant(originalVariant)) {
      corrections.push(`Block ${i}: callout variant "${originalVariant}" → "${block.variant}"`);
    }

    sanitized.push(block);
  }

  // 순차 ID 재할당
  const withIds = sanitized.map((block, i) => ({
    ...block,
    id: `block-${i + 1}`,
  }));

  // 선행 빈 paragraph 제거
  while (
    withIds.length > 0 &&
    withIds[0].type === 'paragraph' &&
    (!withIds[0].content || (typeof withIds[0].content === 'string' && !withIds[0].content.trim()))
  ) {
    withIds.shift();
    corrections.push('Removed leading empty paragraph');
  }

  if (corrections.length > 0) {
    console.log('[ValidationPipeline] Corrections applied:', corrections);
  }

  return {
    blocks: withIds,
    corrections,
    blockTypesUsed: extractBlockTypesUsed(withIds),
  };
}
