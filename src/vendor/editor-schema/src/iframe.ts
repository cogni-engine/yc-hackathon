/**
 * Framework-agnostic schema for the inline iframe embed node. Parse-side only
 * (attrs / parseHTML / renderHTML) — the editor extends this with a React node
 * view, `renderMarkdown` and the insert command (see IframeEmbedBlock.tsx). The
 * headless markdown→Y.Doc converter imports this as-is.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { escapeHtmlAttribute, type MarkdownJSONNode } from './markdown';

export interface IframeEmbedAttributes {
  src?: string | null;
  /** Inline HTML document rendered via `srcdoc` (e.g. AI-generated UI). */
  srcdoc?: string | null;
  width?: string | number | null;
  height?: string | number | null;
  title?: string | null;
  allow?: string | null;
}

export const IFRAME_EMBED_DEFAULT_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share';

export const IFRAME_EMBED_URL_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-presentation';

export const IFRAME_EMBED_SRCDOC_SANDBOX = 'allow-scripts allow-modals';

// Send the origin (not the full URL) on cross-origin embeds. `no-referrer`
// makes YouTube fail with error 153; this leaks no path/query. Shared by every
// iframe render path so the policy can't drift per-call.
export const IFRAME_EMBED_REFERRER_POLICY = 'strict-origin-when-cross-origin';

export const IFRAME_EMBED_SRCDOC_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  'img-src data: blob:',
  'media-src data: blob:',
  'font-src data:',
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
].join('; ');

const ALLOWED_IFRAME_ALLOW_TOKENS = new Set([
  'accelerometer',
  'autoplay',
  'clipboard-write',
  'encrypted-media',
  'fullscreen',
  'gyroscope',
  'picture-in-picture',
  'web-share',
]);

export function normalizeIframeEmbedSrc(
  raw: string | null | undefined,
  options: { allowBareHost?: boolean } = {}
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const candidate =
    options.allowBareHost && !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  try {
    // Minimal hardening only: HTTPS, and no embedded credentials. We do NOT
    // restrict the host — any https URL may be embedded. The real XSS surface
    // (inline-HTML `srcdoc`) is contained separately via sandbox + CSP.
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeIframeAllowAttribute(
  raw: string | null | undefined
): string | null {
  const tokens: string[] = [];
  for (const part of raw?.split(';') ?? []) {
    const token = part.trim().toLowerCase().split(/\s+/, 1)[0];
    if (
      token &&
      ALLOWED_IFRAME_ALLOW_TOKENS.has(token) &&
      !tokens.includes(token)
    ) {
      tokens.push(token);
    }
  }
  return tokens.length ? tokens.join('; ') : null;
}

export function hardenIframeSrcdoc(srcdoc: string): string {
  const csp = escapeHtmlAttribute(IFRAME_EMBED_SRCDOC_CSP);
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  const doctype = srcdoc.match(/^\s*<!doctype[^>]*>/i);
  if (doctype) {
    return `${doctype[0]}${meta}${srcdoc.slice(doctype[0].length)}`;
  }
  return `${meta}${srcdoc}`;
}

export function iframeEmbedToMarkdown(attrs: IframeEmbedAttributes): string {
  const srcdoc = attrs.srcdoc ? String(attrs.srcdoc) : '';
  // `srcdoc` wins: the browser ignores `src` when both are set, and `srcdoc`
  // must render under the locked-down srcdoc sandbox — never the same-origin
  // URL sandbox. So drop `src` entirely when inline HTML is present.
  const src = srcdoc ? null : normalizeIframeEmbedSrc(attrs.src);
  if (!src && !srcdoc) return '';

  const parts: string[] = [];
  if (src) {
    parts.push(`src="${escapeHtmlAttribute(src)}"`);
  }
  if (srcdoc) {
    // Encode newlines so the inline HTML survives as a single attribute that
    // round-trips through the markdown raw-HTML block; decoded back on parse.
    parts.push(
      `srcdoc="${escapeHtmlAttribute(srcdoc).replace(/\r?\n/g, '&#10;')}"`
    );
  }
  if (attrs.width != null && attrs.width !== '') {
    parts.push(`width="${escapeHtmlAttribute(String(attrs.width))}"`);
  }
  if (attrs.height != null && attrs.height !== '') {
    parts.push(`height="${escapeHtmlAttribute(String(attrs.height))}"`);
  }
  if (attrs.title) {
    parts.push(`title="${escapeHtmlAttribute(String(attrs.title))}"`);
  }

  const allow = sanitizeIframeAllowAttribute(attrs.allow);
  if (src) {
    parts.push(
      `allow="${escapeHtmlAttribute(allow ?? IFRAME_EMBED_DEFAULT_ALLOW)}"`
    );
    parts.push(`sandbox="${IFRAME_EMBED_URL_SANDBOX}"`);
  } else {
    parts.push(`sandbox="${IFRAME_EMBED_SRCDOC_SANDBOX}"`);
  }
  parts.push('frameborder="0"');
  parts.push(`referrerpolicy="${IFRAME_EMBED_REFERRER_POLICY}"`);
  parts.push('allowfullscreen');
  return `<iframe ${parts.join(' ')}></iframe>`;
}

export const IframeEmbed = Node.create({
  name: 'iframeEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        // Accept a real iframe `src`, and `data-src` from the legacy div form.
        // Inline-HTML (`srcdoc`) embeds never keep a `src`: the browser ignores
        // it, and a stray `src` would otherwise pull the node into the
        // same-origin URL sandbox (see renderHTML / iframeEmbedToMarkdown).
        parseHTML: element =>
          element.hasAttribute('srcdoc')
            ? null
            : normalizeIframeEmbedSrc(
                element.getAttribute('src') ?? element.getAttribute('data-src')
              ),
        renderHTML: attributes => {
          if (attributes.srcdoc) return {};
          const src = normalizeIframeEmbedSrc(attributes.src);
          return src ? { src } : {};
        },
      },
      // Inline-HTML iframe (e.g. AI-generated UI) carried as a `srcdoc` doc.
      srcdoc: {
        default: null,
        parseHTML: element => element.getAttribute('srcdoc'),
        renderHTML: attributes =>
          attributes.srcdoc ? { srcdoc: String(attributes.srcdoc) } : {},
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes =>
          attributes.width ? { width: String(attributes.width) } : {},
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes =>
          attributes.height ? { height: String(attributes.height) } : {},
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes =>
          attributes.title ? { title: String(attributes.title) } : {},
      },
      allow: {
        default: null,
        parseHTML: element =>
          sanitizeIframeAllowAttribute(element.getAttribute('allow')),
        renderHTML: attributes => {
          const allow = sanitizeIframeAllowAttribute(attributes.allow);
          return allow ? { allow } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      // An inline-HTML iframe (e.g. AI-generated UI).
      { tag: 'iframe[srcdoc]' },
      {
        tag: 'iframe[src]',
        getAttrs: element =>
          normalizeIframeEmbedSrc(element.getAttribute('src')) ? null : false,
      },
      {
        tag: 'div[data-type="iframe-embed"]',
        getAttrs: element => {
          const hasSrcdoc = element.hasAttribute('srcdoc');
          const src =
            element.getAttribute('src') ?? element.getAttribute('data-src');
          return hasSrcdoc || !src || normalizeIframeEmbedSrc(src)
            ? null
            : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const srcdoc = HTMLAttributes.srcdoc ? String(HTMLAttributes.srcdoc) : null;
    // `srcdoc` wins over `src` (browser precedence) and must stay in the
    // locked-down srcdoc sandbox, so never carry a `src` alongside it.
    const src = srcdoc ? null : normalizeIframeEmbedSrc(HTMLAttributes.src);
    const allow = sanitizeIframeAllowAttribute(HTMLAttributes.allow);
    const safeHTMLAttributes = { ...HTMLAttributes };
    delete safeHTMLAttributes.src;
    delete safeHTMLAttributes.srcdoc;
    delete safeHTMLAttributes.allow;

    return [
      'iframe',
      mergeAttributes(
        {
          ...safeHTMLAttributes,
          src: src ?? undefined,
          srcdoc: srcdoc ? hardenIframeSrcdoc(srcdoc) : undefined,
          allow: src ? (allow ?? IFRAME_EMBED_DEFAULT_ALLOW) : undefined,
        },
        {
          sandbox: src ? IFRAME_EMBED_URL_SANDBOX : IFRAME_EMBED_SRCDOC_SANDBOX,
          frameborder: '0',
          referrerpolicy: IFRAME_EMBED_REFERRER_POLICY,
          allowfullscreen: 'true',
        }
      ),
    ];
  },

  // Markdown form: a standard <iframe> raw-HTML block, re-parsed via parseHTML
  // on the way back (lossless round-trip).
  renderMarkdown(node: MarkdownJSONNode) {
    return iframeEmbedToMarkdown(
      (node.attrs ?? {}) as unknown as IframeEmbedAttributes
    );
  },
});
