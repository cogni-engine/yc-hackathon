/**
 * Shared `@tiptap/markdown` types used by node schemas' `renderMarkdown`.
 *
 * `renderMarkdown` receives the node's JSON form (not a ProseMirror node), so
 * `content` is an array and `forEach`/`textContent` are unavailable.
 */
export interface MarkdownJSONNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: MarkdownJSONNode[];
}

/** Subset of `@tiptap/markdown`'s renderer helpers the schemas use. */
export interface MarkdownRenderHelpers {
  renderChildren: (nodes: MarkdownJSONNode[], separator?: string) => string;
}

/** Escape a string for use inside a double-quoted HTML attribute. */
export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape the characters that would break a markdown image/link alt text — the
 * backslash itself (first, so we don't double-escape) and the brackets that
 * delimit the alt. `@tiptap/markdown` (marked) resolves these backslash escapes
 * on the way back, so `![a\]b](url)` round-trips to an alt of `a]b`.
 */
export function escapeMarkdownAltText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}
