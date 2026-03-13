# Research: Vue 3 지원 추가

## 현재 구조 분석

### React 의존 파일 (8개 — extensions만)

| 파일 | 복잡도 | React API |
|------|--------|-----------|
| anchor.tsx | 낮음 | ReactNodeViewRenderer, NodeViewWrapper |
| youtube.tsx | 낮음 | ReactNodeViewRenderer, NodeViewWrapper, useCallback |
| embed.tsx | 낮음 | ReactNodeViewRenderer, NodeViewWrapper, useCallback |
| callout.tsx | 중간 | ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, useCallback |
| document-link.tsx | 중간 | useState, useCallback, useEffect, forwardRef, useImperativeHandle |
| code-block-tabs.tsx | 높음 | ReactNodeViewRenderer, useState, useCallback, useRef, useEffect |
| diagram.tsx | 높음 | ReactNodeViewRenderer, useState, useCallback, useRef, useEffect (비동기 mermaid) |
| html-embed.tsx | 높음 | ReactNodeViewRenderer, useState, useRef, useEffect, useCallback (postMessage) |
| resizable-image.tsx | 높음 | ReactNodeViewRenderer, useState, useRef, useCallback, useEffect (마우스 드래그) |

### 프레임워크 중립 파일 (19개 — 변경 불필요)

- `parsers/` 전체 (5개) — 순수 TS, cheerio/정규식
- `schema/` 전체 (3개) — 타입/검증/상수
- `providers/` 전체 (2개) — 인터페이스 정의
- `utils/` 전체 (3개) — Figma, HTML sanitizer
- `extensions/markdown-shortcuts.ts` — @tiptap/core Extension만 사용
- 각 디렉토리 index.ts (재내보내기)

### 핵심 변환 포인트

| React | Vue 3 |
|-------|-------|
| `@tiptap/react` | `@tiptap/vue-3` |
| `ReactNodeViewRenderer` | `VueNodeViewRenderer` |
| `NodeViewWrapper` | `NodeViewWrapper` (동일 이름) |
| `NodeViewContent` | `NodeViewContent` (동일 이름) |
| `.tsx` (JSX) | `.ts` + `defineComponent` + `h()` 또는 `.vue` SFC |
| `useState` | `ref()` / `reactive()` |
| `useEffect` | `onMounted`, `onUnmounted`, `watch` |
| `useCallback` | 일반 함수 (Vue에서 불필요) |
| `useRef` | `ref()` + template ref |
| `forwardRef` + `useImperativeHandle` | `defineExpose()` |
| `'use client'` | 불필요 (제거) |

## 구조 설계 선택지

### 선택지 A: core 추출 + 프레임워크별 래퍼

```
src/extensions/
├── core/           ← Node.create() 정의 (addNodeView 제외)
├── react/          ← ReactNodeViewRenderer + JSX 컴포넌트
├── vue/            ← VueNodeViewRenderer + Vue 컴포넌트
└── index.ts        ← 기존 호환성 유지 (react re-export)
```

장점: 로직 중복 최소화, Node 스펙 한 번만 정의
단점: 기존 코드 리팩터링 필요, 복잡도 증가

### 선택지 B: 독립 병렬 구현

```
src/extensions/         ← 기존 React 코드 유지 (변경 없음)
src/extensions-vue/     ← Vue 3 전용 새 디렉토리
```

장점: 기존 코드 건드리지 않음, 독립적 관리
단점: Node 스펙 중복, 동기화 부담

### 선택지 C: 하이브리드 (권장)

```
src/extensions/
├── anchor.tsx          ← 기존 유지
├── callout.tsx         ← 기존 유지
├── ...
├── markdown-shortcuts.ts  ← 공유 (프레임워크 무관)
└── index.ts            ← React export (기존 호환)

src/extensions-vue/
├── anchor.ts           ← Vue 버전
├── callout.ts          ← Vue 버전
├── ...
└── index.ts            ← Vue export
```

- 기존 React 코드 변경 없음 (하위 호환성)
- Vue 코드는 `.ts` + `defineComponent` + `h()` (SFC 대신 — tsup 빌드 호환)
- `markdown-shortcuts.ts`는 공유 (import from `../extensions/`)
- 새 엔트리포인트: `tiptap-content-kit/extensions-vue`

## 빌드 영향

- `tsup.config.ts`에 `extensions-vue` 엔트리 추가
- `package.json`에 `exports["./extensions-vue"]` 추가
- peerDependencies에 `@tiptap/vue-3` (optional) 추가
- devDependencies에 `@tiptap/vue-3`, `vue` 추가

## 사이드이펙트 위험

- 기존 React 사용자에게 영향 없음 (별도 엔트리포인트)
- `markdown-shortcuts.ts` 공유로 인한 의존성 문제 없음 (@tiptap/core만 사용)
- Vue SFC 대신 `defineComponent` + `h()` 사용 시 vue 컴파일러 불필요
