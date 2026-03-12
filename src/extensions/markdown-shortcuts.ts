'use client';

import { Extension } from '@tiptap/core';
import { markInputRule, markPasteRule } from '@tiptap/core';

/**
 * Markdown inline formatting auto-conversion extension.
 *
 * Supported conversions:
 * - **bold** -> bold
 * - *italic* -> italic
 * - ~~strike~~ -> strikethrough
 * - `code` -> inline code
 */

// **bold** pattern (double asterisks)
const starBoldInputRegex = /(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))$/;
const starBoldPasteRegex = /(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))/g;

// __bold__ pattern (double underscores)
const underscoreBoldInputRegex = /(?:^|\s)((?:__)((?:[^_]+))(?:__))$/;
const underscoreBoldPasteRegex = /(?:^|\s)((?:__)((?:[^_]+))(?:__))/g;

// *italic* pattern (single asterisk)
const starItalicInputRegex = /(?:^|\s)((?:\*)((?:[^*]+))(?:\*))$/;
const starItalicPasteRegex = /(?:^|\s)((?:\*)((?:[^*]+))(?:\*))/g;

// _italic_ pattern (single underscore)
const underscoreItalicInputRegex = /(?:^|\s)((?:_)((?:[^_]+))(?:_))$/;
const underscoreItalicPasteRegex = /(?:^|\s)((?:_)((?:[^_]+))(?:_))/g;

// ~~strikethrough~~ pattern
const strikeInputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/;
const strikePasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g;

// `code` pattern
const codeInputRegex = /(?:^|\s)((?:`)((?:[^`]+))(?:`))$/;
const codePasteRegex = /(?:^|\s)((?:`)((?:[^`]+))(?:`))/g;

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    const rules = [];

    // Bold rules (**text**)
    const boldType = this.editor.schema.marks.bold;
    if (boldType) {
      rules.push(
        markInputRule({
          find: starBoldInputRegex,
          type: boldType,
        }),
        markInputRule({
          find: underscoreBoldInputRegex,
          type: boldType,
        })
      );
    }

    // Italic rules (*text*)
    const italicType = this.editor.schema.marks.italic;
    if (italicType) {
      rules.push(
        markInputRule({
          find: starItalicInputRegex,
          type: italicType,
        }),
        markInputRule({
          find: underscoreItalicInputRegex,
          type: italicType,
        })
      );
    }

    // Strike rules (~~text~~)
    const strikeType = this.editor.schema.marks.strike;
    if (strikeType) {
      rules.push(
        markInputRule({
          find: strikeInputRegex,
          type: strikeType,
        })
      );
    }

    // Code rules (`text`)
    const codeType = this.editor.schema.marks.code;
    if (codeType) {
      rules.push(
        markInputRule({
          find: codeInputRegex,
          type: codeType,
        })
      );
    }

    return rules;
  },

  addPasteRules() {
    const rules = [];

    // Bold paste rules
    const boldType = this.editor.schema.marks.bold;
    if (boldType) {
      rules.push(
        markPasteRule({
          find: starBoldPasteRegex,
          type: boldType,
        }),
        markPasteRule({
          find: underscoreBoldPasteRegex,
          type: boldType,
        })
      );
    }

    // Italic paste rules
    const italicType = this.editor.schema.marks.italic;
    if (italicType) {
      rules.push(
        markPasteRule({
          find: starItalicPasteRegex,
          type: italicType,
        }),
        markPasteRule({
          find: underscoreItalicPasteRegex,
          type: italicType,
        })
      );
    }

    // Strike paste rules
    const strikeType = this.editor.schema.marks.strike;
    if (strikeType) {
      rules.push(
        markPasteRule({
          find: strikePasteRegex,
          type: strikeType,
        })
      );
    }

    // Code paste rules
    const codeType = this.editor.schema.marks.code;
    if (codeType) {
      rules.push(
        markPasteRule({
          find: codePasteRegex,
          type: codeType,
        })
      );
    }

    return rules;
  },
});

export default MarkdownShortcuts;
