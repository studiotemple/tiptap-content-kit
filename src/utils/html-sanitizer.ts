/**
 * HTML Sanitizer for Confluence HTML Embed blocks.
 *
 * 최소한의 새니타이즈만 수행 — iframe sandbox="allow-scripts" (without allow-same-origin)가
 * 보안 경계 역할을 한다. 스크립트/이벤트 핸들러는 실행되지만 부모 페이지 접근 불가.
 *
 * 사용처: confluence-to-blocks.ts (import 시 HTML 매크로 파싱)
 */

/**
 * Confluence HTML 매크로 콘텐츠를 sandboxed iframe에서 렌더링할 수 있도록 최소 새니타이즈.
 *
 * 보안 모델:
 * - iframe sandbox="allow-scripts" (WITHOUT allow-same-origin) 가 보안 경계
 * - 스크립트 실행 허용 (JS 기반 프레젠테이션/대시보드 렌더링 필요)
 * - 이벤트 핸들러 보존 (onclick, onload 등 — 인터랙티브 콘텐츠 필수)
 * - 부모 페이지 접근 차단 (쿠키, DOM, localStorage 격리)
 * - <object>, <embed>, <applet> 만 제거 (브라우저 플러그인은 sandbox 우회 가능)
 * - <style>, @import url(), CSS 변수, <script>, <iframe> 모두 보존 (시각적 충실도)
 *
 * ★ DOMPurify 미사용 이유:
 * DOMPurify는 기본적으로 on* 이벤트 핸들러를 제거하며, WHOLE_DOCUMENT 모드에서도
 * 많은 HTML 속성/태그를 제거한다. 이는 Confluence HTML 매크로의 인터랙티브 기능
 * (탭 전환, 모달, 애니메이션 등)을 파괴한다. iframe sandbox가 실제 보안 경계이므로
 * 최소한의 태그 제거만 필요하다.
 */
export function sanitizeHtmlForEmbed(html: string): string {
  let sanitized = html;

  // <object> 제거 (Flash 등 브라우저 플러그인 — sandbox 우회 가능)
  sanitized = sanitized.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<object\b[^>]*\/?>/gi, '');

  // <embed> 제거 (브라우저 플러그인 — sandbox 우회 가능)
  sanitized = sanitized.replace(/<embed\b[^>]*\/?>/gi, '');

  // <applet> 제거 (Java Applet — sandbox 우회 가능)
  sanitized = sanitized.replace(/<applet\b[^>]*>[\s\S]*?<\/applet>/gi, '');
  sanitized = sanitized.replace(/<applet\b[^>]*\/?>/gi, '');

  return sanitized;
}

/**
 * HTML에 높이 보고 스크립트를 주입.
 * sandbox="allow-scripts" (without allow-same-origin)에서는
 * contentDocument에 접근할 수 없으므로 postMessage로 높이를 전달한다.
 */
export function injectHeightReporter(html: string): string {
  const script = `<script>
(function() {
  function reportHeight() {
    var body = document.body;
    var docEl = document.documentElement;
    // scrollHeight 기본 측정
    var h = Math.max(
      body ? body.scrollHeight : 0,
      docEl ? docEl.scrollHeight : 0
    );
    // 100vh 기반 프레젠테이션 감지: 실제 콘텐츠가 뷰포트에 맞춰져 있으면
    // 내부 요소 중 가장 큰 높이를 사용
    if (body) {
      var children = body.children;
      for (var i = 0; i < children.length; i++) {
        var ch = children[i].scrollHeight || children[i].offsetHeight || 0;
        if (ch > h) h = ch;
      }
    }
    if (h > 0) {
      parent.postMessage({ type: 'kpp-embed-resize', height: h }, '*');
    }
  }
  if (document.readyState === 'complete') {
    reportHeight();
  } else {
    window.addEventListener('load', reportHeight);
  }
  window.addEventListener('resize', reportHeight);
  // MutationObserver: DOM 변경 시 높이 재측정 (JS 기반 렌더링 대응)
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(reportHeight).observe(document.body, {
      childList: true, subtree: true, attributes: true
    });
  }
  // JS 기반 콘텐츠 렌더링 대기 (단계적 보고)
  setTimeout(reportHeight, 300);
  setTimeout(reportHeight, 1000);
  setTimeout(reportHeight, 3000);
  setTimeout(reportHeight, 5000);
})();
</script>`;

  // </body> 앞에 삽입, 없으면 끝에 추가
  if (html.includes('</body>')) {
    return html.replace('</body>', script + '</body>');
  }
  return html + script;
}

/**
 * HTML 콘텐츠가 "리치" (스타일, 테이블, SVG 등 포함)인지 판별.
 * 단순 텍스트만 감싼 경우 paragraph로 다운그레이드하기 위해 사용.
 */
export function isRichHtml(html: string): boolean {
  const hasStyleTag = /<style[\s>]/i.test(html);
  const hasStyleAttr = /style\s*=/.test(html);
  const hasTable = /<table/i.test(html);
  const hasSvg = /<svg/i.test(html);
  const hasMultipleDivs = (html.match(/<div/gi) || []).length > 3;
  const hasIframe = /<iframe/i.test(html);
  const hasCanvas = /<canvas/i.test(html);
  const hasScript = /<script/i.test(html);
  return hasStyleTag || hasStyleAttr || hasTable || hasSvg ||
         hasMultipleDivs || hasIframe || hasCanvas || hasScript;
}
