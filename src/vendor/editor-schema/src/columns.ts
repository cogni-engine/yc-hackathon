/**
 * Framework-agnostic schema for the multi-column layout nodes (`columns` +
 * `column`). No React / NodeView here — the editor extends `ColumnsContainer`
 * with a React node view (see ColumnsBlock.tsx), while the headless markdown→
 * Y.Doc converter imports these schemas as-is. Single source of truth for the
 * node names, attributes, parseHTML and renderMarkdown.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import type { MarkdownJSONNode, MarkdownRenderHelpers } from './markdown';

export type ColumnsLayout = 'flex' | 'grid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkedToken = any;

/**
 * Slice off the balanced `<div>…</div>` starting at the head of `src` (which
 * must begin with a `<div …>` open tag). Counts nested `<div>`/`</div>` so a
 * column whose body contains other div blocks (document-embed, excalidraw,
 * nested columns) is captured whole. Returns null if never balanced.
 */
function extractBalancedDiv(src: string): string | null {
  const tagRe = /<div\b[^>]*>|<\/div>/gi;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return src.slice(0, tagRe.lastIndex);
  }
  return null;
}

const COLUMN_OPEN = /<div\b(?=[^>]*\bdata-type="column")[^>]*>/i;

/** Split a columns container's inner HTML into its column bodies. */
function splitColumns(inner: string): { width: number | null; body: string }[] {
  const cols: { width: number | null; body: string }[] = [];
  let rest = inner;
  for (;;) {
    const cm = COLUMN_OPEN.exec(rest);
    if (!cm) break;
    const from = cm.index;
    const colFull = extractBalancedDiv(rest.slice(from));
    if (!colFull) break;
    const widthM = /\bdata-width="([^"]*)"/i.exec(cm[0]);
    const width = widthM ? Number(widthM[1]) : null;
    const body = colFull
      .slice(cm[0].length, colFull.length - '</div>'.length)
      .trim();
    cols.push({ width, body });
    rest = rest.slice(from + colFull.length);
  }
  return cols;
}

/**
 * Block-level `@tiptap/markdown` round-trip for the columns layout. Spread into
 * `ColumnsContainer` (the tokenizer/parse fields aren't on the base NodeConfig
 * type). The tokenizer intercepts the raw `<div data-type="columns">…</div>`
 * block BEFORE marked's generic html-block tokenizer, recursively re-lexing each
 * column's markdown body so headings/lists/images/etc. nest INTO the column
 * (CommonMark would otherwise end the html block at the first blank line and
 * drop the body). `renderMarkdown` emits the same raw-HTML form for the mirror.
 */
export const columnsMarkdown = {
  markdownTokenizer: {
    name: 'columns',
    level: 'block' as const,
    start(src: string) {
      const i = src.search(/<div\b[^>]*\bdata-type="columns"/i);
      return i < 0 ? src.length : i;
    },
    tokenize(src: string, _tokens: unknown, helpers: MarkedToken) {
      const open = /^<div\b(?=[^>]*\bdata-type="columns")[^>]*>/i.exec(src);
      if (!open) return undefined;
      const full = extractBalancedDiv(src);
      if (!full) return undefined;
      const layoutM = /\bdata-layout="([^"]*)"/i.exec(open[0]);
      const layout = layoutM ? layoutM[1] : 'flex';
      const inner = full.slice(open[0].length, full.length - '</div>'.length);
      const cols = splitColumns(inner).map(c => ({
        width: c.width,
        tokens: c.body ? helpers.blockTokens(c.body) : [],
      }));
      return { type: 'columns', raw: full, layout, cols };
    },
  },
  parseMarkdown(token: MarkedToken, helpers: MarkedToken) {
    const cols: { width: number | null; tokens: MarkedToken[] }[] =
      token.cols ?? [];
    return {
      type: 'columns',
      attrs: { layout: token.layout ?? 'flex' },
      content: cols.map(c => {
        const content = helpers.parseBlockChildren(c.tokens);
        return {
          type: 'column',
          attrs: c.width != null ? { width: c.width } : {},
          // `column` is `block+`; never leave it empty or the doc is invalid.
          content: content.length ? content : [{ type: 'paragraph' }],
        };
      }),
    };
  },
  renderMarkdown(node: MarkdownJSONNode, helpers: MarkdownRenderHelpers) {
    const layout = node.attrs?.layout ?? 'flex';
    const cols = helpers.renderChildren(node.content ?? [], '');
    return `<div data-type="columns" data-layout="${layout}">${cols}</div>`;
  },
};

/**
 * Child column. Not in the `block` group, so it is only valid inside a
 * `columns` container. `isolating` keeps caret/backspace from crossing column
 * boundaries (like table cells). No node view — its content renders directly.
 */
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  selectable: false,

  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('data-width');
          return raw ? Number(raw) : null;
        },
        renderHTML: attributes =>
          attributes.width != null
            ? { 'data-width': String(attributes.width) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const width = node.attrs.width as number | null;
    const style =
      width != null
        ? `flex: ${width} 1 0%; min-width: 0;`
        : 'flex: 1 1 0%; min-width: 0;';
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'column', style }),
      0,
    ];
  },

  // Raw-HTML form so the column round-trips losslessly (markdown body kept
  // between blank lines so @tiptap/markdown re-parses it inside the HTML block).
  renderMarkdown(node: MarkdownJSONNode, helpers: MarkdownRenderHelpers) {
    const width = node.attrs?.width;
    const widthAttr = width != null ? ` data-width="${width}"` : '';
    // Blank line between block children so the body re-parses as separate
    // blocks (heading/list/image) when the column is read back from markdown.
    const inner = helpers.renderChildren(node.content ?? [], '\n\n');
    return `<div data-type="column"${widthAttr}>\n\n${inner}\n\n</div>`;
  },
});

/**
 * Columns container schema. `group: block`, `content: column+`. The editor
 * adds the React node view + `setColumns` command via `.extend()`; this base
 * carries everything the converter needs (attrs, parseHTML, renderMarkdown).
 */
export const ColumnsContainer = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column+',
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      layout: {
        default: 'flex' as ColumnsLayout,
        parseHTML: element =>
          (element.getAttribute('data-layout') as ColumnsLayout) ?? 'flex',
        renderHTML: attributes => ({ 'data-layout': attributes.layout }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'columns' }),
      0,
    ];
  },

  // Block tokenizer + parse/render so the layout round-trips AND its markdown
  // body nests into each column (see columnsMarkdown).
  ...columnsMarkdown,
});
