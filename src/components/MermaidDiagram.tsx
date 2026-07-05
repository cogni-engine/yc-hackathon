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

// We drive everything from `base` so the palette stays consistent across
// diagram types and both color modes; `themeVariables` below is the source of
// truth rather than a partial override of a prebuilt theme.
const MERMAID_THEME: Record<MermaidColorMode, MermaidConfig['theme']> = {
  light: 'base',
  dark: 'base',
};

/**
 * Hand-drawn palettes tuned to the app's neutral design tokens (see
 * globals.css). Multi-series colors (pie/git/etc.) use a muted, cohesive
 * accent set instead of Mermaid's default saturated defaults.
 */
const MERMAID_THEME_VARIABLES: Record<
  MermaidColorMode,
  MermaidConfig['themeVariables']
> = {
  light: {
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: '15px',

    // Core node / edge palette — clean surfaces, soft indigo accent border.
    primaryColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    primaryTextColor: '#18181b',
    secondaryColor: '#f1f5f9',
    secondaryBorderColor: '#cbd5e1',
    secondaryTextColor: '#18181b',
    tertiaryColor: '#ffffff',
    tertiaryBorderColor: '#e2e8f0',
    tertiaryTextColor: '#18181b',
    lineColor: '#94a3b8',
    mainBkg: '#f8fafc',

    // Text roles.
    textColor: '#18181b',
    titleColor: '#18181b',
    nodeTextColor: '#18181b',
    edgeLabelBackground: '#ffffff',

    // Subgraph / cluster containers.
    clusterBkg: '#f8fafc',
    clusterBorder: '#e2e8f0',

    // Notes (sequence, etc.) — soft paper yellow.
    noteBkgColor: '#fef9c3',
    noteBorderColor: '#eab308',
    noteTextColor: '#18181b',

    // Sequence-specific.
    actorBkg: '#f8fafc',
    actorBorder: '#818cf8',
    actorTextColor: '#18181b',
    activationBkgColor: '#e0e7ff',
    signalColor: '#94a3b8',
    signalTextColor: '#18181b',
    labelBoxBkgColor: '#f8fafc',
    labelBoxBorderColor: '#cbd5e1',
    labelTextColor: '#18181b',
    loopTextColor: '#18181b',

    // State / flow accents.
    pieTitleTextColor: '#18181b',
    pieLegendTextColor: '#18181b',
    pieStrokeColor: '#ffffff',
    pieOuterStrokeColor: '#e2e8f0',

    // Muted, cohesive multi-series accent set.
    pie1: '#6366f1',
    pie2: '#14b8a6',
    pie3: '#f59e0b',
    pie4: '#ec4899',
    pie5: '#8b5cf6',
    pie6: '#22c55e',
    pie7: '#ef4444',
    pie8: '#0ea5e9',
    pie9: '#a3a3a3',
    pie10: '#eab308',
    pie11: '#64748b',
    pie12: '#d946ef',
    git0: '#6366f1',
    git1: '#14b8a6',
    git2: '#f59e0b',
    git3: '#ec4899',
    git4: '#8b5cf6',
    git5: '#22c55e',
    git6: '#0ea5e9',
    git7: '#ef4444',
    gitBranchLabel0: '#ffffff',
    gitBranchLabel1: '#ffffff',
    gitBranchLabel2: '#18181b',
    gitBranchLabel3: '#ffffff',
    gitBranchLabel4: '#ffffff',
    gitBranchLabel5: '#ffffff',
    gitBranchLabel6: '#ffffff',
    gitBranchLabel7: '#ffffff',
  },
  dark: {
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: '15px',
    darkMode: true,

    // Core node / edge palette — dark surfaces, soft indigo accent border.
    primaryColor: '#27272a',
    primaryBorderColor: '#6366f1',
    primaryTextColor: '#ededed',
    secondaryColor: '#3f3f46',
    secondaryBorderColor: '#52525b',
    secondaryTextColor: '#ededed',
    tertiaryColor: '#1f1f23',
    tertiaryBorderColor: '#3f3f46',
    tertiaryTextColor: '#ededed',
    lineColor: '#71717a',
    mainBkg: '#27272a',

    // Text roles.
    textColor: '#ededed',
    titleColor: '#ededed',
    nodeTextColor: '#ededed',
    edgeLabelBackground: '#1a1a1a',

    // Subgraph / cluster containers.
    clusterBkg: '#1f1f23',
    clusterBorder: '#3f3f46',

    // Notes.
    noteBkgColor: '#3f3f46',
    noteBorderColor: '#818cf8',
    noteTextColor: '#ededed',

    // Sequence-specific.
    actorBkg: '#27272a',
    actorBorder: '#6366f1',
    actorTextColor: '#ededed',
    activationBkgColor: '#3f3f46',
    signalColor: '#71717a',
    signalTextColor: '#ededed',
    labelBoxBkgColor: '#27272a',
    labelBoxBorderColor: '#52525b',
    labelTextColor: '#ededed',
    loopTextColor: '#ededed',

    // State / flow accents.
    pieTitleTextColor: '#ededed',
    pieLegendTextColor: '#ededed',
    pieStrokeColor: '#1a1a1a',
    pieOuterStrokeColor: '#3f3f46',

    // Muted, cohesive multi-series accent set.
    pie1: '#818cf8',
    pie2: '#2dd4bf',
    pie3: '#fbbf24',
    pie4: '#f472b6',
    pie5: '#a78bfa',
    pie6: '#4ade80',
    pie7: '#f87171',
    pie8: '#38bdf8',
    pie9: '#d4d4d4',
    pie10: '#facc15',
    pie11: '#94a3b8',
    pie12: '#e879f9',
    git0: '#818cf8',
    git1: '#2dd4bf',
    git2: '#fbbf24',
    git3: '#f472b6',
    git4: '#a78bfa',
    git5: '#4ade80',
    git6: '#38bdf8',
    git7: '#f87171',
    gitBranchLabel0: '#18181b',
    gitBranchLabel1: '#18181b',
    gitBranchLabel2: '#18181b',
    gitBranchLabel3: '#18181b',
    gitBranchLabel4: '#18181b',
    gitBranchLabel5: '#18181b',
    gitBranchLabel6: '#18181b',
    gitBranchLabel7: '#18181b',
  },
};

function detectMermaidColorMode(): MermaidColorMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Polish layered on top of the theme variables: rounded corners, softer
 * strokes and slightly heavier label weight for a crisp, modern look.
 * Mermaid injects this as a <style> inside the SVG (it survives DOMPurify's
 * svg profile, same as Mermaid's own generated styles).
 */
const MERMAID_THEME_CSS = `
  .node rect,
  .node polygon,
  .cluster rect,
  .er.entityBox,
  .actor,
  .labelBox,
  .note rect,
  rect.actor,
  .stateGroup rect,
  .task {
    rx: 8px;
    ry: 8px;
  }
  .node .label,
  .cluster-label .nodeLabel,
  .actor > tspan {
    font-weight: 500;
  }
  .edgePath .path,
  .flowchart-link,
  .messageLine0,
  .messageLine1,
  .relation {
    stroke-width: 1.5px;
  }
  .cluster rect {
    stroke-width: 1px;
  }
`;

function getMermaidConfig(colorMode: MermaidColorMode): MermaidConfig {
  return {
    startOnLoad: false,
    theme: MERMAID_THEME[colorMode],
    darkMode: colorMode === 'dark',
    securityLevel: 'strict',
    fontFamily: 'inherit',
    htmlLabels: false,
    themeVariables: MERMAID_THEME_VARIABLES[colorMode],
    themeCSS: MERMAID_THEME_CSS,
    flowchart: {
      // DOMPurify's SVG profile strips Mermaid's HTML labels in foreignObject.
      htmlLabels: false,
      curve: 'basis',
      padding: 16,
      nodeSpacing: 50,
      rankSpacing: 60,
      useMaxWidth: true,
    },
    sequence: {
      useMaxWidth: true,
      diagramMarginX: 24,
      diagramMarginY: 16,
      boxMargin: 12,
      mirrorActors: true,
    },
    er: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
    class: { useMaxWidth: true },
    state: { useMaxWidth: true },
    journey: { useMaxWidth: true },
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
