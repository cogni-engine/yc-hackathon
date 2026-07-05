import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { HocuspocusProvider } from '@hocuspocus/provider';

export interface AiFocus {
  blockId: string;
  state: 'editing' | 'done';
  color: string;
}

export interface AiFocusOptions {
  /**
   * Hocuspocus provider carrying awareness. May be null on the first render
   * (created in an effect a tick after the Y.Doc); the extension simply renders
   * nothing until the editor rebuilds with a live provider.
   */
  provider: HocuspocusProvider | null;
}

interface AiFocusAction {
  type: 'set';
  focus: AiFocus | null;
}

const aiFocusPluginKey = new PluginKey<AiFocus | null>('aiFocus');

function parseAiFocus(value: unknown): AiFocus | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.blockId !== 'string' || candidate.blockId.length === 0) {
    return null;
  }
  if (candidate.state !== 'editing' && candidate.state !== 'done') return null;
  if (typeof candidate.color !== 'string') return null;

  return {
    blockId: candidate.blockId,
    state: candidate.state,
    color: candidate.color,
  };
}

/**
 * Read the first non-null `aiFocus` awareness field broadcast by OTHER
 * clients (e.g. the remote AI agent). Our own state is ignored.
 */
function readRemoteAiFocus(provider: HocuspocusProvider | null): AiFocus | null {
  const awareness = provider?.awareness;
  if (!awareness) return null;

  for (const [clientId, state] of awareness.getStates()) {
    if (clientId === awareness.clientID) continue;
    const focus = parseAiFocus(state.aiFocus);
    if (focus) return focus;
  }

  return null;
}

function isSameFocus(a: AiFocus | null, b: AiFocus | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.blockId === b.blockId && a.state === b.state && a.color === b.color;
}

/**
 * Visual feedback for AI block edits. The AI agent broadcasts an `aiFocus`
 * awareness field ({ blockId, state: 'editing' | 'done', color }); this
 * extension decorates the matching block with a colored ring while the AI is
 * editing and a brief fading highlight once it's done. Purely presentational —
 * no schema changes, all state lives in awareness.
 */
export const AiFocusExtension = Extension.create<AiFocusOptions>({
  name: 'aiFocus',

  addOptions() {
    return {
      provider: null,
    };
  },

  addProseMirrorPlugins() {
    const provider = this.options.provider;

    return [
      new Plugin<AiFocus | null>({
        key: aiFocusPluginKey,

        state: {
          init: () => readRemoteAiFocus(provider),

          apply: (tr, previous) => {
            const action = tr.getMeta(aiFocusPluginKey) as
              | AiFocusAction
              | undefined;
            return action ? action.focus : previous;
          },
        },

        view(editorView) {
          const awareness = provider?.awareness;
          if (!awareness) return {};

          // Mirror AiCursorExtension: on shared-state change, force a
          // re-render by dispatching a transaction with a plugin meta.
          const syncFocusFromAwareness = () => {
            const focus = readRemoteAiFocus(provider);
            const previous =
              aiFocusPluginKey.getState(editorView.state) ?? null;
            if (isSameFocus(previous, focus)) return;

            editorView.dispatch(
              editorView.state.tr.setMeta(aiFocusPluginKey, {
                type: 'set',
                focus,
              } satisfies AiFocusAction)
            );
          };

          awareness.on('change', syncFocusFromAwareness);

          return {
            destroy() {
              awareness.off('change', syncFocusFromAwareness);
            },
          };
        },

        props: {
          decorations(state) {
            const focus = aiFocusPluginKey.getState(state);
            if (!focus) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (decorations.length > 0) return false;
              if (node.attrs.blockId !== focus.blockId) return true;

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: `ai-focus ai-focus--${focus.state}`,
                  style: `--ai-focus-color: ${focus.color}`,
                })
              );
              return false;
            });

            if (decorations.length === 0) return DecorationSet.empty;
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
