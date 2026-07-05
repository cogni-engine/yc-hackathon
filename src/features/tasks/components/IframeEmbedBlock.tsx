'use client';

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import {
  hardenIframeSrcdoc,
  IframeEmbed as IframeEmbedBase,
  IFRAME_EMBED_DEFAULT_ALLOW,
  IFRAME_EMBED_REFERRER_POLICY,
  IFRAME_EMBED_SRCDOC_SANDBOX,
  IFRAME_EMBED_URL_SANDBOX,
  iframeEmbedToMarkdown as iframeEmbedToMarkdownBase,
  normalizeIframeEmbedSrc,
  sanitizeIframeAllowAttribute,
  type IframeEmbedAttributes,
} from '@cogni/editor-schema';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Trash2,
} from 'lucide-react';

// Fallback height for embeds with no intrinsic aspect ratio (e.g. a website).
const PREVIEW_HEIGHT_PX = 600;

function hostLabel(src: string | null): string {
  if (!src) return 'Embed';
  try {
    return new URL(src).host || src;
  } catch {
    return src;
  }
}

function IframeEmbedView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const rawSrc = (node.attrs.src as string | null) ?? null;
  const src = normalizeIframeEmbedSrc(rawSrc);
  const srcdoc = (node.attrs.srcdoc as string | null) ?? null;
  const title = (node.attrs.title as string | null) ?? null;
  const allow =
    sanitizeIframeAllowAttribute(node.attrs.allow as string | null) ??
    IFRAME_EMBED_DEFAULT_ALLOW;
  const widthNum = Number(node.attrs.width);
  const heightNum = Number(node.attrs.height);
  // A pasted embed (e.g. YouTube 560×315) carries its intrinsic size — render
  // it responsively at that aspect ratio. Plain-URL / inline-HTML embeds have
  // none, so they get a tall fixed-height pane.
  const hasRatio =
    Number.isFinite(widthNum) &&
    widthNum > 0 &&
    Number.isFinite(heightNum) &&
    heightNum > 0;
  const hasBlockedSrc = Boolean(rawSrc && !src && !srcdoc);
  const hasContent = Boolean(src || srcdoc || hasBlockedSrc);
  const label =
    title ||
    (srcdoc ? 'Inline HTML' : hasBlockedSrc ? 'Blocked embed' : hostLabel(src));

  const [expanded, setExpanded] = useState(true);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // A freshly inserted (empty) embed should land the caret in the URL field.
  // `autoFocus` loses the race against ProseMirror re-focusing the editor after
  // the insert command, so we grab focus on the next frame instead.
  useEffect(() => {
    if (hasContent) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [hasContent]);

  const submitUrl = () => {
    const normalized = normalizeIframeEmbedSrc(draft, { allowBareHost: true });
    if (normalized) {
      updateAttributes({ src: normalized });
      setDraft('');
    }
  };

  return (
    <NodeViewWrapper
      className='group/iframe relative my-3'
      data-type='iframe-embed'
    >
      <div
        contentEditable={false}
        className='overflow-hidden rounded-xl border border-border-default bg-surface-secondary'
      >
        {/* Header / toolbar */}
        <div className='flex items-center gap-2 border-b border-border-default px-3 py-2'>
          <button
            type='button'
            onClick={() => setExpanded(value => !value)}
            className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:bg-interactive-hover hover:text-text-primary'
            title={expanded ? 'Collapse' : 'Expand'}
            aria-label={expanded ? 'Collapse embed' : 'Expand embed'}
          >
            {expanded ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
          </button>
          <Globe className='h-4 w-4 shrink-0 text-text-muted' />
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-text-primary'>
              {label}
            </div>
            {src ? (
              <div className='truncate text-xs text-text-muted'>{src}</div>
            ) : srcdoc ? (
              <div className='truncate text-xs text-text-muted'>
                sandboxed inline HTML
              </div>
            ) : hasBlockedSrc ? (
              <div className='truncate text-xs text-text-muted'>{rawSrc}</div>
            ) : null}
          </div>
          <div className='flex shrink-0 items-center gap-0.5'>
            <a
              href={src ?? undefined}
              target='_blank'
              rel='noopener noreferrer'
              aria-disabled={!src}
              className='inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-interactive-hover hover:text-text-primary aria-disabled:pointer-events-none aria-disabled:opacity-40'
              title='Open in new tab'
            >
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
            <button
              type='button'
              onMouseDown={event => event.preventDefault()}
              onClick={() => deleteNode()}
              className='inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-interactive-hover hover:text-red-500'
              title='Remove embed'
              aria-label='Remove embed'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          </div>
        </div>

        {/* Body */}
        {expanded ? (
          hasContent ? (
            <div
              className='relative mx-auto w-full bg-background'
              style={
                hasRatio
                  ? { aspectRatio: `${widthNum} / ${heightNum}` }
                  : {
                      height:
                        Number.isFinite(heightNum) && heightNum > 0
                          ? heightNum
                          : PREVIEW_HEIGHT_PX,
                    }
              }
            >
              {srcdoc ? (
                <iframe
                  srcDoc={hardenIframeSrcdoc(srcdoc)}
                  title={label}
                  className='h-full w-full border-0'
                  sandbox={IFRAME_EMBED_SRCDOC_SANDBOX}
                  referrerPolicy={IFRAME_EMBED_REFERRER_POLICY}
                />
              ) : src ? (
                <iframe
                  src={src}
                  title={label}
                  className='h-full w-full border-0'
                  sandbox={IFRAME_EMBED_URL_SANDBOX}
                  allow={allow}
                  allowFullScreen
                  referrerPolicy={IFRAME_EMBED_REFERRER_POLICY}
                />
              ) : (
                <div className='flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-text-muted'>
                  <Globe className='h-8 w-8' />
                  <div className='font-medium text-text-primary'>
                    Embed blocked
                  </div>
                  <div className='max-w-md'>
                    Only HTTPS URLs (without embedded credentials) can render
                    inside task descriptions.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className='flex flex-col gap-2 p-4'>
              <label className='text-xs font-medium text-text-muted'>
                Embed a URL
              </label>
              <div className='flex items-center gap-2'>
                <input
                  ref={inputRef}
                  type='url'
                  value={draft}
                  placeholder='https://www.youtube.com/embed/...'
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitUrl();
                    }
                  }}
                  className='min-w-0 flex-1 rounded-md border border-border-default bg-background px-2 py-1.5 text-sm text-text-primary outline-none focus:border-border-strong'
                />
                <button
                  type='button'
                  onClick={submitUrl}
                  disabled={
                    !normalizeIframeEmbedSrc(draft, { allowBareHost: true })
                  }
                  className='shrink-0 rounded-md border border-border-default px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-interactive-hover disabled:pointer-events-none disabled:opacity-40'
                >
                  Embed
                </button>
              </div>
              <p className='text-[11px] leading-snug text-text-muted'>
                Or paste an{' '}
                <code className='rounded bg-surface-secondary px-1'>
                  &lt;iframe&gt;
                </code>{' '}
                embed code (YouTube, Vimeo, maps, …) — including an{' '}
                <code className='rounded bg-surface-secondary px-1'>
                  &lt;iframe srcdoc=&quot;…&quot;&gt;
                </code>{' '}
                of inline HTML — anywhere in the editor.
              </p>
            </div>
          )
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * Serialize the embed to a standard `<iframe>` element — the same shape
 * `renderHTML`/`parseHTML` use, and exactly what you'd paste from YouTube et al.
 * `@tiptap/markdown` re-parses raw HTML blocks through `parseHTML`, so the embed
 * survives a markdown round-trip (and, in the playground, edits to the markdown
 * source text).
 */
export function iframeEmbedToMarkdown(attrs: IframeEmbedAttributes): string {
  return iframeEmbedToMarkdownBase(attrs);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframeEmbed: {
      /** Insert an iframe-embed block. Pass src to embed immediately, or omit
       * to insert an empty block that prompts for a URL. */
      insertIframeEmbed: (attrs?: IframeEmbedAttributes) => ReturnType;
    };
  }
}

/**
 * Atom block node that embeds an arbitrary URL in a sandboxed `<iframe>` inside
 * the task description. Its markdown form is a standard `<iframe>` element, so a
 * pasted YouTube/Vimeo/etc. embed code becomes a live embed. The attributes
 * (src/width/height/title/allow) ride through Y.js / Hocuspocus as node
 * attributes. Register it alongside the other collaborative extensions, before
 * BlockIdExtension so it gets a block id.
 */
export const IframeEmbedBlock = IframeEmbedBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(IframeEmbedView);
  },

  // Markdown form: emit a standard <iframe> so it round-trips losslessly. The
  // @tiptap/markdown parser re-parses raw HTML blocks through `parseHTML`, so
  // the embed survives a markdown round-trip — which is what lets it persist
  // across edits to a markdown source.
  renderMarkdown(node: { attrs?: Record<string, unknown> }) {
    return iframeEmbedToMarkdown(
      (node.attrs ?? {}) as unknown as IframeEmbedAttributes
    );
  },

  addCommands() {
    return {
      insertIframeEmbed:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src ?? null,
              srcdoc: attrs.srcdoc ?? null,
              width: attrs.width ?? null,
              height: attrs.height ?? null,
              title: attrs.title ?? null,
              allow: attrs.allow ?? null,
            },
          }),
    };
  },
});
