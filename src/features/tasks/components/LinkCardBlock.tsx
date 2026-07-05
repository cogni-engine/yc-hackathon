'use client';

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { LinkCard as LinkCardBase } from '@cogni/editor-schema';
import { ExternalLink, Link as LinkIcon, Trash2 } from 'lucide-react';

/** Human label for a URL: its title, else its host, else the raw URL. */
function hostLabel(url: string | null): string {
  if (!url) return 'Link';
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function LinkCardView({ node, deleteNode }: NodeViewProps) {
  const url = (node.attrs.url as string | null) ?? null;
  const title = (node.attrs.title as string | null) ?? null;
  const description = (node.attrs.description as string | null) ?? null;
  const label = title || hostLabel(url);

  const open = () => {
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <NodeViewWrapper
      className='group/linkcard relative my-3'
      data-type='link-card'
    >
      <div
        contentEditable={false}
        role='button'
        tabIndex={0}
        onClick={open}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        className='flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-border-default bg-surface-secondary px-3 py-2.5 text-left transition-colors hover:bg-interactive-hover'
      >
        <span className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-text-muted'>
          <LinkIcon className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-medium text-text-primary'>
            {label}
          </div>
          {description ? (
            <div className='truncate text-xs text-text-muted'>
              {description}
            </div>
          ) : url ? (
            <div className='truncate text-xs text-text-muted'>{url}</div>
          ) : null}
        </div>
        <ExternalLink className='h-4 w-4 shrink-0 text-text-muted' />
      </div>
      <button
        type='button'
        onMouseDown={event => event.preventDefault()}
        onClick={event => {
          event.stopPropagation();
          deleteNode();
        }}
        className='absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-interactive-hover hover:text-red-500 group-hover/linkcard:opacity-100'
        title='Remove link'
        aria-label='Remove link'
      >
        <Trash2 className='h-3.5 w-3.5' />
      </button>
    </NodeViewWrapper>
  );
}

export interface LinkCardAttributes {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkCard: {
      /** Insert a link-card block that renders a URL as a clickable card. */
      insertLinkCard: (attrs: LinkCardAttributes) => ReturnType;
    };
  }
}

/**
 * Atom block node that renders a URL (e.g. a PR link) as a clickable card in the
 * task description — the rich counterpart to a plain inline link, mirroring the
 * Block Kit URL buttons used in comments. The URL + optional card metadata ride
 * through Y.js / Hocuspocus as node attributes; the markdown form (a raw-HTML
 * `<div data-type="link-card" …>`) round-trips through `parseHTML`. Register it
 * alongside the other collaborative extensions, before BlockIdExtension so it
 * gets a block id.
 */
export const LinkCardBlock = LinkCardBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(LinkCardView);
  },

  addCommands() {
    return {
      insertLinkCard:
        attrs =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
