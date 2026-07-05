import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import * as Y from 'yjs';

const DEFAULT_AI_CURSOR_NAME = 'AI';
const DEFAULT_AI_CURSOR_COLOR = '#0ea5e9';
const DEFAULT_AI_CURSOR_MAP = 'aiCursor';

export interface AiCursorOptions {
  name?: string;
  color?: string;
  ydoc?: Y.Doc;
  mapName?: string;
}

export interface ShowAiCursorOptions {
  pos?: number;
  name?: string;
  color?: string;
}

interface AiCursorState {
  visible: boolean;
  pos: number;
  name: string;
  color: string;
}

interface AiCursorAction {
  type: 'set';
  cursor: AiCursorState;
}

const aiCursorPluginKey = new PluginKey<AiCursorState>('aiCursor');

function clampCursorPos(pos: number, docSize: number): number {
  return Math.max(0, Math.min(pos, docSize));
}

function getAiCursorMap(
  ydoc: Y.Doc | undefined,
  mapName: string
): Y.Map<unknown> | null {
  return ydoc?.getMap<unknown>(mapName) ?? null;
}

function readAiCursorMap(
  map: Y.Map<unknown> | null,
  fallback: AiCursorState,
  docSize: number
): AiCursorState {
  if (!map) return fallback;

  const pos = map.get('pos');
  const name = map.get('name');
  const color = map.get('color');

  return {
    visible: map.get('visible') === true,
    pos: clampCursorPos(typeof pos === 'number' ? pos : fallback.pos, docSize),
    name: typeof name === 'string' ? name : fallback.name,
    color: typeof color === 'string' ? color : fallback.color,
  };
}

function writeAiCursorMap(
  ydoc: Y.Doc | undefined,
  mapName: string,
  cursor: AiCursorState
): void {
  const map = getAiCursorMap(ydoc, mapName);
  if (!map) return;

  ydoc?.transact(() => {
    map.set('visible', cursor.visible);
    map.set('pos', cursor.pos);
    map.set('name', cursor.name);
    map.set('color', cursor.color);
  }, 'ai-cursor');
}

function createAiCursorElement(cursorState: AiCursorState): HTMLElement {
  const cursor = document.createElement('span');
  cursor.classList.add('ai-cursor');
  cursor.setAttribute('data-ai-cursor', 'true');

  const caret = document.createElement('span');
  caret.classList.add('ai-cursor__caret');
  caret.style.backgroundColor = cursorState.color;

  const label = document.createElement('span');
  label.classList.add('ai-cursor__label');
  label.style.backgroundColor = cursorState.color;
  label.textContent = cursorState.name;

  cursor.appendChild(caret);
  cursor.appendChild(label);

  return cursor;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiCursor: {
      showAiCursor: (options?: ShowAiCursorOptions) => ReturnType;
      moveAiCursor: (pos: number) => ReturnType;
      hideAiCursor: () => ReturnType;
    };
  }
}

/**
 * Shared AI presence marker. Human cursors stay on awareness through
 * CollaborationCaret; AI routines drive this cursor explicitly around edits.
 */
export const AiCursorExtension = Extension.create<AiCursorOptions>({
  name: 'aiCursor',

  addOptions() {
    return {
      name: DEFAULT_AI_CURSOR_NAME,
      color: DEFAULT_AI_CURSOR_COLOR,
      ydoc: undefined,
      mapName: DEFAULT_AI_CURSOR_MAP,
    };
  },

  addCommands() {
    const mapName = this.options.mapName ?? DEFAULT_AI_CURSOR_MAP;

    return {
      showAiCursor:
        (options = {}) =>
        ({ state, dispatch }) => {
          const cursor = {
            visible: true,
            pos: clampCursorPos(
              options.pos ?? state.selection.from,
              state.doc.content.size
            ),
            name: options.name ?? this.options.name ?? DEFAULT_AI_CURSOR_NAME,
            color:
              options.color ?? this.options.color ?? DEFAULT_AI_CURSOR_COLOR,
          };

          if (dispatch) {
            dispatch(
              state.tr.setMeta(aiCursorPluginKey, {
                type: 'set',
                cursor,
              } satisfies AiCursorAction)
            );
            writeAiCursorMap(this.options.ydoc, mapName, cursor);
          }

          return true;
        },

      moveAiCursor:
        pos =>
        ({ state, dispatch }) => {
          const previous = aiCursorPluginKey.getState(state) ?? {
            visible: false,
            pos: state.selection.from,
            name: this.options.name ?? DEFAULT_AI_CURSOR_NAME,
            color: this.options.color ?? DEFAULT_AI_CURSOR_COLOR,
          };
          const cursor = {
            ...previous,
            visible: true,
            pos: clampCursorPos(pos, state.doc.content.size),
          };

          if (dispatch) {
            dispatch(
              state.tr.setMeta(aiCursorPluginKey, {
                type: 'set',
                cursor,
              } satisfies AiCursorAction)
            );
            writeAiCursorMap(this.options.ydoc, mapName, cursor);
          }

          return true;
        },

      hideAiCursor:
        () =>
        ({ state, dispatch }) => {
          const previous = aiCursorPluginKey.getState(state) ?? {
            visible: false,
            pos: state.selection.from,
            name: this.options.name ?? DEFAULT_AI_CURSOR_NAME,
            color: this.options.color ?? DEFAULT_AI_CURSOR_COLOR,
          };
          const cursor = {
            ...previous,
            visible: false,
            pos: clampCursorPos(previous.pos, state.doc.content.size),
          };

          if (dispatch) {
            dispatch(
              state.tr.setMeta(aiCursorPluginKey, {
                type: 'set',
                cursor,
              } satisfies AiCursorAction)
            );
            writeAiCursorMap(this.options.ydoc, mapName, cursor);
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const initialName = this.options.name ?? DEFAULT_AI_CURSOR_NAME;
    const initialColor = this.options.color ?? DEFAULT_AI_CURSOR_COLOR;
    const mapName = this.options.mapName ?? DEFAULT_AI_CURSOR_MAP;
    const cursorMap = getAiCursorMap(this.options.ydoc, mapName);

    return [
      new Plugin<AiCursorState>({
        key: aiCursorPluginKey,

        state: {
          init: (_config, state) =>
            readAiCursorMap(
              cursorMap,
              {
                visible: false,
                pos: state.selection.from,
                name: initialName,
                color: initialColor,
              },
              state.doc.content.size
            ),

          apply: (tr, previous, _oldState, newState) => {
            const mapped = tr.docChanged
              ? {
                  ...previous,
                  pos: clampCursorPos(
                    tr.mapping.map(previous.pos),
                    newState.doc.content.size
                  ),
                }
              : previous;
            const action = tr.getMeta(aiCursorPluginKey) as
              | AiCursorAction
              | undefined;

            if (!action) return mapped;

            return {
              ...action.cursor,
              pos: clampCursorPos(
                action.cursor.pos,
                newState.doc.content.size
              ),
            };
          },
        },

        view(editorView) {
          if (!cursorMap) return {};

          const syncCursorFromMap = () => {
            const previous = aiCursorPluginKey.getState(editorView.state) ?? {
              visible: false,
              pos: editorView.state.selection.from,
              name: initialName,
              color: initialColor,
            };
            const cursor = readAiCursorMap(
              cursorMap,
              previous,
              editorView.state.doc.content.size
            );
            editorView.dispatch(
              editorView.state.tr.setMeta(aiCursorPluginKey, {
                type: 'set',
                cursor,
              } satisfies AiCursorAction)
            );
          };

          cursorMap.observe(syncCursorFromMap);

          return {
            destroy() {
              cursorMap.unobserve(syncCursorFromMap);
            },
          };
        },

        props: {
          decorations(state) {
            const cursorState = aiCursorPluginKey.getState(state);
            if (!cursorState?.visible) return DecorationSet.empty;

            const pos = clampCursorPos(
              cursorState.pos,
              state.doc.content.size
            );

            return DecorationSet.create(state.doc, [
              Decoration.widget(pos, () => createAiCursorElement(cursorState), {
                key: `ai-cursor-${cursorState.name}-${cursorState.color}`,
                side: -1,
              }),
            ]);
          },
        },
      }),
    ];
  },
});
