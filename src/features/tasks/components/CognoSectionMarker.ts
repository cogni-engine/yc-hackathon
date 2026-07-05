import { Node } from '@tiptap/core';
import type { MarkdownToken } from '@tiptap/core';

export type CognoSectionMarkerKind = 'spec:start' | 'spec:end';

const MARKER_START = '<!-----cogno:spec:start----->';
const MARKER_END = '<!-----cogno:spec:end----->';
const COGNO_SECTION_MARKER_RE = /^<!-----cogno:spec:(start|end)----->(?:\n|$)/;

type CognoSectionMarkerToken = MarkdownToken & {
  kind: CognoSectionMarkerKind;
};

export function cognoSectionMarkerToMarkdown(kind: unknown): string {
  if (kind === 'spec:start') return MARKER_START;
  if (kind === 'spec:end') return MARKER_END;
  return '';
}

export const CognoSectionMarker = Node.create({
  name: 'cognoSectionMarker',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      kind: {
        default: null,
      },
    };
  },

  renderHTML() {
    return ['div', { hidden: 'true', style: 'display: none;' }];
  },

  renderMarkdown(node: { attrs?: Record<string, unknown> }) {
    return cognoSectionMarkerToMarkdown(node.attrs?.kind);
  },

  markdownTokenName: 'cognoSectionMarker',

  markdownTokenizer: {
    name: 'cognoSectionMarker',
    level: 'block',
    start: '<!-----cogno:spec:',
    tokenize(src: string): CognoSectionMarkerToken | undefined {
      const match = src.match(COGNO_SECTION_MARKER_RE);
      if (!match) return undefined;
      return {
        type: 'cognoSectionMarker',
        raw: match[0],
        kind: `spec:${match[1]}` as CognoSectionMarkerKind,
        tokens: [],
      } as CognoSectionMarkerToken;
    },
  },

  parseMarkdown(token: MarkdownToken) {
    const markerToken = token as CognoSectionMarkerToken;
    return {
      type: 'cognoSectionMarker',
      attrs: {
        kind: markerToken.kind,
      },
    };
  },
});
