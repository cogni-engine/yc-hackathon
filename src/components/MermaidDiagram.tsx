'use client';

import DOMPurify from 'dompurify';
import { useEffect, useId, useRef, useState } from 'react';
import type { MermaidConfig } from 'mermaid';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

let mermaidInstance: typeof import('mermaid').default | null = null;
let mermaidConfiguredMode: MermaidColorMode | null = null;
const MAX_MERMAID_CACHE_ENTRIES = 100;
const mermaidValidationCache = new Map<
  string,
  { type: 'valid' } | { type: 'error'; message: string }
>();
export type MermaidColorMode = 'light' | 'dark';

/**
 * Hand-tuned `base` theme variables so diagrams sit naturally on the app's
 * light/dark panels instead of Mermaid's washed-out defaults. Edge lines get
 * an explicit `lineColor` so arrows stay clearly visible in dark mode.
 */
const MERMAID_THEME_VARIABLES: Record<
  MermaidColorMode,
  MermaidConfig['themeVariables']
> = {
  light: {
    background: 'transparent',
    fontSize: '13px',
    // Nodes
    primaryColor: '#ffffff',
    mainBkg: '#ffffff',
    primaryBorderColor: '#d5d7e5',
    nodeBorder: '#d5d7e5',
    secondaryColor: '#f4f5fa',
    tertiaryColor: '#eceef6',
    clusterBkg: '#f7f8fc',
    clusterBorder: '#d5d7e5',
    // Edges / arrows
    lineColor: '#444444',
    edgeLabelBackground: '#ffffff',
    // Text
    textColor: '#18181b',
    titleColor: '#18181b',
    primaryTextColor: '#18181b',
    secondaryTextColor: '#18181b',
    tertiaryTextColor: '#18181b',
    nodeTextColor: '#18181b',
    labelTextColor: '#18181b',
    pieTitleTextColor: '#18181b',
    pieLegendTextColor: '#18181b',
    // Sequence diagrams
    actorBkg: '#ffffff',
    actorBorder: '#d5d7e5',
    actorTextColor: '#18181b',
    signalColor: '#444444',
    signalTextColor: '#18181b',
    noteBkgColor: '#f7f4e3',
    noteTextColor: '#18181b',
    noteBorderColor: '#ddd4a8',
  },
  dark: {
    background: 'transparent',
    fontSize: '13px',
    darkMode: true,
    // Nodes: dark-panel-friendly fill with visible borders
    primaryColor: '#232530',
    mainBkg: '#232530',
    primaryBorderColor: '#6b6e85',
    nodeBorder: '#6b6e85',
    secondaryColor: '#2b2d3c',
    tertiaryColor: '#1d1f2a',
    clusterBkg: '#1d1f2a',
    clusterBorder: '#4a4d63',
    // Edges / arrows: explicit light-grey so lines never vanish grey-on-grey
    lineColor: '#8b8fa8',
    edgeLabelBackground: '#232530',
    // Text
    textColor: '#e8e8f0',
    titleColor: '#e8e8f0',
    primaryTextColor: '#e8e8f0',
    secondaryTextColor: '#e8e8f0',
    tertiaryTextColor: '#e8e8f0',
    nodeTextColor: '#e8e8f0',
    labelTextColor: '#e8e8f0',
    pieTitleTextColor: '#e8e8f0',
    pieLegendTextColor: '#e8e8f0',
    // Sequence diagrams
    actorBkg: '#232530',
    actorBorder: '#6b6e85',
    actorTextColor: '#e8e8f0',
    signalColor: '#8b8fa8',
    signalTextColor: '#e8e8f0',
    noteBkgColor: '#2f3142',
    noteTextColor: '#e8e8f0',
    noteBorderColor: '#6b6e85',
  },
};

function detectMermaidColorMode(): MermaidColorMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getMermaidConfig(colorMode: MermaidColorMode): MermaidConfig {
  return {
    startOnLoad: false,
    theme: MERMAID_THEME[colorMode],
    darkMode: colorMode === 'dark',
    securityLevel: 'strict',
    fontFamily: 'inherit',
    htmlLabels: false,
    themeVariables: MERMAID_THEME_VARIABLES[colorMode],
    flowchart: {
      // DOMPurify's SVG profile strips Mermaid's HTML labels in foreignObject.
      htmlLabels: false,
    },
  };
}

function rememberMermaidValidation(
  key: string,
  value: { type: 'valid' } | { type: 'error'; message: string }
) {
  if (mermaidValidationCache.has(key)) mermaidValidationCache.delete(key);
  mermaidValidationCache.set(key, value);
  while (mermaidValidationCache.size > MAX_MERMAID_CACHE_ENTRIES) {
    const oldest = mermaidValidationCache.keys().next().value;
    if (!oldest) break;
    mermaidValidationCache.delete(oldest);
  }
}

function scheduleIdleRender(callback: () => void) {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: 750 });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(callback, 0);
  return () => globalThis.clearTimeout(id);
}

export async function getMermaid(colorMode: MermaidColorMode) {
  if (!mermaidInstance) {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
  }
  if (mermaidConfiguredMode !== colorMode) {
    mermaidInstance.initialize(getMermaidConfig(colorMode));
    mermaidConfiguredMode = colorMode;
  }
  return mermaidInstance;
}

export function useMermaidColorMode(): MermaidColorMode {
  const [colorMode, setColorMode] = useState<MermaidColorMode>(
    detectMermaidColorMode
  );

  useEffect(() => {
    const updateColorMode = () => setColorMode(detectMermaidColorMode());
    updateColorMode();

    const observer = new MutationObserver(updateColorMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return colorMode;
}

interface MermaidDiagramProps {
  code: string;
}

export function MermaidSvgViewer({
  svg,
  className,
}: {
  svg: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setExpanded(false);
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  return (
    <>
      <button
        type='button'
        onClick={() => setExpanded(true)}
        className={cn(
          'group my-3 block w-full cursor-zoom-in overflow-x-auto rounded-xl border border-border-default bg-surface-secondary p-4 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 [&_svg]:h-auto [&_svg]:min-h-[200px] [&_svg]:w-full',
          className
        )}
        aria-label='Expand mermaid diagram'
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </button>

      {expanded &&
        createPortal(
          <div
            className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
            role='dialog'
            aria-modal='true'
            aria-labelledby={titleId}
            onClick={() => setExpanded(false)}
          >
            <h2 id={titleId} className='sr-only'>
              Expanded mermaid diagram
            </h2>
            <button
              type='button'
              className='absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 p-2 text-white shadow-card transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
              onClick={event => {
                event.stopPropagation();
                setExpanded(false);
              }}
              aria-label='Close expanded mermaid diagram'
            >
              <X className='h-5 w-5' />
            </button>
            <div
              className='max-h-[92vh] w-full max-w-[min(1400px,96vw)] cursor-zoom-out overflow-auto rounded-2xl border border-white/15 bg-surface-primary p-6 shadow-2xl [&_svg]:h-auto [&_svg]:min-h-[60vh] [&_svg]:w-full'
              onClick={event => event.stopPropagation()}
              onDoubleClick={() => setExpanded(false)}
            >
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colorMode = useMermaidColorMode();
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    let cancelled = false;
    let cancelScheduledRender: (() => void) | null = null;

    const cleanedCode = code.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    const cached = mermaidValidationCache.get(cleanedCode);
    if (cached?.type === 'error') {
      setSvg(null);
      setError(cached.message);
      return;
    }

    async function render() {
      try {
        const m = await getMermaid(colorMode);
        const cachedValidation = mermaidValidationCache.get(cleanedCode);

        // Cache validation/error state only. The SVG itself includes DOM ids
        // derived from the render id, so each component must render its own SVG.
        if (cachedValidation?.type !== 'valid') {
          const valid = await m.parse(cleanedCode, { suppressErrors: true });
          if (!valid) {
            rememberMermaidValidation(cleanedCode, {
              type: 'error',
              message: 'Invalid mermaid syntax',
            });
            if (!cancelled) {
              setSvg(null);
              setError('Invalid mermaid syntax');
            }
            return;
          }
          rememberMermaidValidation(cleanedCode, { type: 'valid' });
        }

        const { svg: rendered } = await m.render(idRef.current, cleanedCode);
        if (!cancelled) {
          setSvg(
            DOMPurify.sanitize(rendered, {
              USE_PROFILES: { svg: true, svgFilters: true },
            })
          );
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        const message =
          err instanceof Error ? err.message : 'Mermaid render error';
        rememberMermaidValidation(cleanedCode, { type: 'error', message });
        if (!cancelled) {
          setSvg(null);
          setError(message);
        }
      }
    }

    setSvg(null);
    setError(null);
    cancelScheduledRender = scheduleIdleRender(() => {
      void render();
    });

    return () => {
      cancelled = true;
      cancelScheduledRender?.();
    };
  }, [code, colorMode]);

  if (error || !svg) {
    if (error) {
      // Show raw code on error
      return (
        <pre className='overflow-x-auto rounded-xl border border-border-default bg-surface-secondary p-4 text-sm text-text-muted my-3'>
          <code>{code}</code>
        </pre>
      );
    }
    // Loading state
    return (
      <div className='my-3 flex justify-center rounded-xl border border-border-default bg-surface-secondary p-4 text-text-muted text-sm'>
        Loading diagram...
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <MermaidSvgViewer svg={svg} />
    </div>
  );
}
