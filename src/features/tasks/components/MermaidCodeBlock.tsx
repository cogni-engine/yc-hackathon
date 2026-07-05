'use client';

import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import DOMPurify from 'dompurify';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Code2, Eye, Maximize2, X } from 'lucide-react';
import { common, createLowlight } from 'lowlight';
import { getMermaid, useMermaidColorMode } from '@/components/MermaidDiagram';
import { useI18n } from '@/i18n';

const PREVIEW_DEBOUNCE_MS = 300;
const lowlight = createLowlight(common);

/**
 * Horizontal chrome of the diagram box: p-3 padding (12px x 2) plus the
 * 1px border on each side. Added to the SVG's natural width so the
 * border-box hugs the diagram instead of spanning the full editor width.
 */
const DIAGRAM_BOX_CHROME_PX = 26;

/**
 * Mermaid emits `style="max-width: <n>px"` on the root SVG (useMaxWidth).
 * Extract it so the preview container can hug the diagram's natural width.
 */
function extractSvgNaturalWidth(svg: string): number | null {
  const match = /max-width:\s*([\d.]+)px/.exec(svg);
  if (!match) return null;
  const width = Number.parseFloat(match[1]);
  return Number.isFinite(width) && width > 0 ? Math.ceil(width) : null;
}

interface MermaidCodeBlockPreviewProps {
  code: string;
  /**
   * Reports whether a successfully rendered diagram is currently shown.
   * The parent keeps the code visible at rest while this is false so an
   * empty/broken block never becomes invisible.
   */
  onHasDiagramChange: (hasDiagram: boolean) => void;
  onSvgChange: (svg: string | null) => void;
  onOpenExpanded: (svg: string) => void;
}

/**
 * Live mermaid preview rendered below the editable code. Re-renders
 * (debounced) as the code changes; keeps the last good diagram on parse
 * errors (with a muted error line) instead of crashing the editor.
 */
function MermaidCodeBlockPreview({
  code,
  onHasDiagramChange,
  onSvgChange,
  onOpenExpanded,
}: MermaidCodeBlockPreviewProps) {
  const { t } = useI18n();
  const colorMode = useMermaidColorMode();
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(
    `mermaid-editor-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedCode(code),
      PREVIEW_DEBOUNCE_MS
    );
    return () => window.clearTimeout(timeout);
  }, [code]);

  useEffect(() => {
    let cancelled = false;

    if (!debouncedCode.trim()) {
      setSvg(null);
      setError(null);
      return;
    }

    async function render() {
      try {
        const m = await getMermaid(colorMode);
        const valid = await m.parse(debouncedCode, { suppressErrors: true });
        if (!valid) {
          // Keep the last good diagram so the block stays recognizable.
          if (!cancelled) setError(t('tasks.mermaid.invalidSyntax'));
          return;
        }
        const { svg: rendered } = await m.render(idRef.current, debouncedCode);
        if (!cancelled) {
          setSvg(
            DOMPurify.sanitize(rendered, {
              USE_PROFILES: { svg: true, svgFilters: true },
            })
          );
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid render error');
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [debouncedCode, colorMode, t]);

  useEffect(() => {
    onHasDiagramChange(svg !== null);
    onSvgChange(svg);
  }, [svg, onHasDiagramChange, onSvgChange]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (svg) {
        onOpenExpanded(svg);
      }
    },
    [onOpenExpanded, svg]
  );

  if (!svg && !error) return null;

  const naturalWidth = svg ? extractSvgNaturalWidth(svg) : null;

  return (
    <div
      contentEditable={false}
      className='mb-3 flex w-full cursor-pointer select-none flex-col items-center gap-1'
      onMouseDown={handleMouseDown}
    >
      {error && (
        <div className='w-full text-xs text-text-muted'>
          Mermaid: {error.split('\n')[0]}
        </div>
      )}
      {svg && (
        <div
          className={`pointer-events-none max-h-[380px] min-h-14 max-w-full overflow-auto rounded-xl border border-border-default bg-surface-secondary p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[348px] [&_svg]:w-full ${
            naturalWidth === null ? 'w-full' : ''
          }`}
          style={
            naturalWidth === null
              ? undefined
              : { width: `${naturalWidth + DIAGRAM_BOX_CHROME_PX}px` }
          }
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}

function MermaidExpandedDialog({
  svg,
  onClose,
}: {
  svg: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <h2 id={titleId} className='sr-only'>
        {t('tasks.mermaid.expandedDiagramTitle')}
      </h2>
      <button
        type='button'
        className='absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 p-2 text-white shadow-card transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
        onClick={event => {
          event.stopPropagation();
          onClose();
        }}
        aria-label={t('tasks.mermaid.closeExpandedDiagram')}
      >
        <X className='h-5 w-5' />
      </button>
      <div
        className='max-h-[92vh] w-full max-w-[min(1400px,96vw)] cursor-zoom-out overflow-auto rounded-2xl border border-white/15 bg-surface-primary p-6 shadow-2xl [&_svg]:h-auto [&_svg]:min-h-[60vh] [&_svg]:w-full'
        onClick={event => event.stopPropagation()}
        onDoubleClick={onClose}
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>,
    document.body
  );
}

/**
 * Notion-style mermaid block: at rest only the rendered diagram is shown;
 * the editable code is available from the block toolbar. The code's
 * NodeViewContent stays mounted so ProseMirror selection behavior stays stable.
 */
function MermaidCodeBlockView({ node }: NodeViewProps) {
  const { t } = useI18n();
  const [hasDiagram, setHasDiagram] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [expandedSvg, setExpandedSvg] = useState<string | null>(null);

  // Keep the code visible when there is no diagram to stand in for it
  // (empty source, or parse failure with no previous successful render).
  const shouldShowCode = showCode || !hasDiagram;
  const toggleCodeLabel = showCode
    ? t('tasks.mermaid.showDiagram')
    : t('tasks.mermaid.showCode');
  const expandLabel = t('tasks.mermaid.expandDiagram');

  return (
    <NodeViewWrapper className='group/mermaid relative'>
      {hasDiagram && (
        <div
          contentEditable={false}
          className='absolute right-2 top-2 z-10 flex rounded-lg border border-border-default bg-background/85 p-0.5 shadow-card backdrop-blur-sm opacity-0 transition-opacity group-hover/mermaid:opacity-100 group-focus-within/mermaid:opacity-100'
        >
          <button
            type='button'
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              showCode
                ? 'bg-interactive-active text-text-primary'
                : 'text-text-muted hover:bg-interactive-hover hover:text-text-primary'
            }`}
            title={toggleCodeLabel}
            aria-label={toggleCodeLabel}
            onMouseDown={event => event.preventDefault()}
            onClick={() => setShowCode(value => !value)}
          >
            {showCode ? (
              <Eye className='h-3.5 w-3.5' />
            ) : (
              <Code2 className='h-3.5 w-3.5' />
            )}
          </button>
          <button
            type='button'
            className='inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-interactive-hover hover:text-text-primary'
            title={expandLabel}
            aria-label={expandLabel}
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              if (previewSvg) setExpandedSvg(previewSvg);
            }}
          >
            <Maximize2 className='h-3.5 w-3.5' />
          </button>
        </div>
      )}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          shouldShowCode
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        {/* Collapse via row height only — NodeViewContent stays mounted. */}
        <div className='min-h-0 overflow-hidden'>
          <pre>
            <NodeViewContent<'code'> as='code' className='language-mermaid' />
          </pre>
        </div>
      </div>
      <MermaidCodeBlockPreview
        code={node.textContent}
        onHasDiagramChange={setHasDiagram}
        onSvgChange={setPreviewSvg}
        onOpenExpanded={setExpandedSvg}
      />
      {expandedSvg && (
        <MermaidExpandedDialog
          svg={expandedSvg}
          onClose={() => setExpandedSvg(null)}
        />
      )}
    </NodeViewWrapper>
  );
}

function CodeBlockView(props: NodeViewProps) {
  const language = (props.node.attrs.language as string | null) ?? null;

  if (language === 'mermaid') {
    return <MermaidCodeBlockView {...props} />;
  }

  // Non-mermaid languages: plain, always-visible default code block.
  return (
    <NodeViewWrapper>
      <pre className='code-block-highlighted'>
        <NodeViewContent<'code'>
          as='code'
          className={language ? `language-${language}` : undefined}
        />
      </pre>
    </NodeViewWrapper>
  );
}

/**
 * CodeBlock extension that keeps the code editable but additionally
 * renders a live mermaid diagram preview for ```mermaid blocks.
 * Scoped to the task description editor — register it alongside
 * `StarterKit.configure({ codeBlock: false })`.
 */
export const MermaidCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  HTMLAttributes: {
    class: 'code-block-highlighted',
  },
});
