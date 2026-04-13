import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/tiptap-content-kit/',
  resolve: {
    alias: {
      // Resolve the library source directly for HMR during local development
      'tiptap-content-kit/editor/style.css': path.resolve(__dirname, '../src/editor/styles/editor.css'),
      'tiptap-content-kit/editor': path.resolve(__dirname, '../src/editor/index.ts'),
      'tiptap-content-kit/extensions': path.resolve(__dirname, '../src/extensions/index.ts'),
      'tiptap-content-kit/schema': path.resolve(__dirname, '../src/schema/index.ts'),
      'tiptap-content-kit/parsers': path.resolve(__dirname, '../src/parsers/index.ts'),
      'tiptap-content-kit/providers': path.resolve(__dirname, '../src/providers/index.ts'),
      'tiptap-content-kit/utils': path.resolve(__dirname, '../src/utils/index.ts'),
      'tiptap-content-kit': path.resolve(__dirname, '../src/index.ts'),
    },
  },
});
