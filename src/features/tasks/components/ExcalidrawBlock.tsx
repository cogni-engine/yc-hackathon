'use client';

import '@excalidraw/excalidraw/index.css';

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { ExcalidrawBlock as ExcalidrawSchema } from '@cogni/editor-schema';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState } from '@excalidraw/excalidraw/types';
import { useI18n } from '@/i18n';
import type { Locale } from '@/i18n';

const SAVE_DEBOUNCE_MS = 500;
const CANVAS_HEIGHT_PX = 480;

// Map our two app locales to Excalidraw's language codes (it uses BCP-47-style
// codes, e.g. `ja-JP` rather than `ja`). Falls back to English.
const EXCALIDRAW_LANG_BY_LOCALE: Record<Locale, string> = {
  en: 'en',
  ja: 'ja-JP',
};

// Trim the toolbar for an embedded sketch block. Drawing/erasing tools stay; we
// hide the actions that don't make sense inline:
//   - theme toggle: theme is driven by the app theme (see `theme` prop below)
//   - load/export scene + save-to-file: this canvas is not a standalone .excalidraw file
//   - image tool: embedded images are base64-inlined into the scene, which bloats
//     the JSON we sync through Y.js — keep the persisted blob small.
// `saveAsImage` and `changeViewBackgroundColor`/`clearCanvas` stay (useful + cheap).
const UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: true,
    clearCanvas: true,
    export: false,
    loadScene: false,
    saveToActiveFile: false,
    toggleTheme: false,
    saveAsImage: true,
  },
  tools: {
    image: false,
  },
} as const;

// Excalidraw has no SSR support and touches `window` on import, so it must be
// loaded lazily on the client only (same pattern as other ssr:false widgets).
const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then(m => ({ default: m.Excalidraw })),
  {
    ssr: false,
    loading: () => (
      <div
        className='flex items-center justify-center rounded-xl border border-border-default bg-surface-secondary text-sm text-text-muted'
        style={{ height: CANVAS_HEIGHT_PX }}
      >
        Loading canvas…
      </div>
    ),
  }
);

/** Minimal slice of the Excalidraw scene we persist into the node attribute. */
interface StoredScene {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
}

function parseScene(raw: string | null): StoredScene | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredScene;
    if (!parsed || !Array.isArray(parsed.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function ExcalidrawNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const saveTimer = useRef<number | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const { locale } = useI18n();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const langCode = EXCALIDRAW_LANG_BY_LOCALE[locale] ?? 'en';

  // Parse the persisted scene exactly once so Excalidraw owns its own state
  // after mount — feeding attrs back in on every change would loop.
  const initialData = useMemo(() => {
    const scene = parseScene(node.attrs.scene as string | null);
    if (!scene) return null;
    return {
      elements: scene.elements,
      appState: { ...scene.appState, collaborators: new Map() },
      scrollToContent: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default to a read-only preview; clicking the canvas enters the full editor.
  // A freshly-inserted (empty) drawing opens straight in edit mode so there's no
  // extra click before you can draw.
  const [isEditing, setIsEditing] = useState(initialData === null);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const scene: StoredScene = {
          // Drop deleted tombstones to keep the persisted blob small.
          elements: elements.filter(el => !el.isDeleted),
          appState: { viewBackgroundColor: appState.viewBackgroundColor },
        };
        updateAttributes({ scene: JSON.stringify(scene) });
      }, SAVE_DEBOUNCE_MS);
    },
    [updateAttributes]
  );

  // While editing, drop back to the read-only preview when the user interacts
  // outside this drawing. Excalidraw renders almost all of its UI inside our
  // host (`.excalidraw-container`), but a few overlays (eye-dropper, cursor
  // helpers) portal to <body> with an `excalidraw`-prefixed class — treat those
  // as "inside" so e.g. using the color pipette doesn't kick us out of editing.
  useEffect(() => {
    if (!isEditing) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (hostRef.current?.contains(target)) return;
      if (target.closest('[class*="excalidraw"]')) return;
      setIsEditing(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isEditing]);

  return (
    <NodeViewWrapper
      className='group/excalidraw relative my-3'
      data-type='excalidraw'
    >
      <button
        type='button'
        contentEditable={false}
        className='absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-default bg-background/85 text-text-muted opacity-0 shadow-card backdrop-blur-sm transition-opacity hover:bg-interactive-hover hover:text-text-primary group-hover/excalidraw:opacity-100'
        title='Delete drawing'
        aria-label='Delete drawing'
        onMouseDown={event => event.preventDefault()}
        onClick={() => deleteNode()}
      >
        <Trash2 className='h-3.5 w-3.5' />
      </button>
      <div
        ref={hostRef}
        contentEditable={false}
        // `data-readonly` lets CSS hide Excalidraw's bottom zoom/footer bar while
        // previewing (the overlay blocks interaction, so the controls are dead).
        data-readonly={isEditing ? undefined : 'true'}
        className='excalidraw-host relative overflow-hidden rounded-xl border border-border-default'
        style={{ height: CANVAS_HEIGHT_PX }}
        // Keep ProseMirror from hijacking canvas keystrokes (e.g. Backspace).
        onKeyDown={event => event.stopPropagation()}
      >
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          viewModeEnabled={!isEditing}
          theme={theme}
          langCode={langCode}
          UIOptions={UI_OPTIONS}
        />
        {!isEditing && (
          // Transparent overlay over the read-only canvas: captures the first
          // click to enter edit mode, and lets wheel/scroll pass through to the
          // page (instead of zooming the canvas) while previewing.
          <button
            type='button'
            contentEditable={false}
            aria-label='Edit drawing'
            className='absolute inset-0 z-[5] flex cursor-pointer items-end justify-center bg-transparent pb-3'
            onMouseDown={event => event.preventDefault()}
            onClick={() => setIsEditing(true)}
          >
            <span className='inline-flex items-center gap-1.5 rounded-full border border-border-default bg-background/90 px-3 py-1 text-xs font-medium text-text-muted opacity-0 shadow-card backdrop-blur-sm transition-opacity group-hover/excalidraw:opacity-100'>
              <Pencil className='h-3 w-3' />
              Click to edit
            </span>
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidraw: {
      /** Insert an empty Excalidraw drawing block. */
      insertExcalidraw: () => ReturnType;
    };
  }
}

/**
 * Atom block node that embeds an Excalidraw canvas in the task description.
 * The whole scene is persisted as a JSON string in the `scene` attribute, which
 * rides through Y.js / Hocuspocus like any other node attribute (last-writer-
 * wins per drawing — fine for single-author sketches). Register it alongside
 * the other collaborative extensions.
 */
export const ExcalidrawBlock = ExcalidrawSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView);
  },

  addCommands() {
    return {
      insertExcalidraw:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
