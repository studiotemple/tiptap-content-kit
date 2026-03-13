# Plan: Vue 3 지원 추가 (C안 — 하이브리드)

## 배경
tiptap-content-kit의 extensions가 React(@tiptap/react) 전용. Vue 사용자도 지원하기 위해 Vue 3 버전 extensions 추가.

## 목표
- `tiptap-content-kit/extensions-vue` 엔트리포인트 신설
- 기존 React 코드 변경 없음 (하위 호환)
- 9개 extension의 Vue 3 버전 구현

## 설계 결정

### 파일 구조
```
src/extensions-vue/
├── anchor.ts
├── callout.ts
├── code-block-tabs.ts
├── diagram.ts
├── document-link.ts
├── embed.ts
├── html-embed.ts
├── resizable-image.ts
├── youtube.ts
└── index.ts
```

### 기술 방식
- `.vue` SFC 대신 `defineComponent` + `h()` 렌더함수 사용 (tsup 빌드 호환)
- `@tiptap/vue-3`의 `VueNodeViewRenderer`, `NodeViewWrapper`, `NodeViewContent` 사용
- `markdown-shortcuts.ts`는 프레임워크 중립이므로 기존 것을 re-export

### React → Vue 변환 매핑
| React | Vue 3 |
|-------|-------|
| `ReactNodeViewRenderer` | `VueNodeViewRenderer` |
| `useState(init)` | `ref(init)` |
| `useEffect(fn, [])` | `onMounted(fn)` + `onUnmounted(cleanup)` |
| `useEffect(fn, [dep])` | `watch(dep, fn)` |
| `useCallback(fn, [])` | 일반 함수 |
| `useRef(null)` | `ref(null)` (template ref) |
| `forwardRef` + `useImperativeHandle` | `defineExpose()` |
| JSX `<div>` | `h('div', ...)` |

### 빌드/패키지 변경
1. `tsup.config.ts` — `extensions-vue` 엔트리 추가
2. `package.json`:
   - `exports["./extensions-vue"]` 추가
   - `peerDependencies`: `@tiptap/vue-3` (optional), `vue` (optional) 추가
   - `devDependencies`: `@tiptap/vue-3`, `vue` 추가
3. `tsup.config.ts` external에 `vue`, `@tiptap/vue-3` 추가

### Export 구조
```typescript
// src/extensions-vue/index.ts
export { CalloutExtension } from './callout';
export { DiagramExtension } from './diagram';
// ... 동일 이름으로 export (React 버전과 1:1 대응)
export { MarkdownShortcuts } from '../extensions/markdown-shortcuts';
```

## 범위
- ✅ 9개 extension Vue 버전
- ✅ markdown-shortcuts 공유
- ✅ 빌드/패키지 설정
- ❌ 기존 React 코드 변경 없음
- ❌ 테스트/문서는 이번 범위에서 제외

## 구현 순서
1. 빌드 인프라 (tsup, package.json, devDeps)
2. 쉬운 것부터: anchor → youtube → embed
3. 중간: callout → document-link
4. 복잡: code-block-tabs → diagram → html-embed → resizable-image
5. index.ts 작성 + 빌드 검증
