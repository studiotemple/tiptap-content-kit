import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    parsers: 'src/parsers/index.ts',
    schema: 'src/schema/index.ts',
    extensions: 'src/extensions/index.ts',
    'extensions-vue': 'src/extensions-vue/index.ts',
    utils: 'src/utils/index.ts',
    providers: 'src/providers/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@tiptap/core',
    '@tiptap/react',
    '@tiptap/vue-3',
    'vue',
    'mammoth',
    'mermaid',
    'pdf-parse',
    'word-extractor',
  ],
});
