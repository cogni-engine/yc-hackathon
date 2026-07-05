'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { useEditor, Editor } from '@tiptap/react';
import type { UseEditorOptions } from '@tiptap/react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { createCollaborativeExtensions } from '../lib/collaborativeExtensions';
import type { SlashCommandItem } from '@/types/slashCommand';

interface UserInfo {
  name: string;
  color: string;
  id: string;
}

interface CollaborativeExtensionOptions {
  placeholder?: string;
  slashCommandExtraItemsRef?: React.MutableRefObject<SlashCommandItem[]>;
}

interface UseCollaborativeEditorProps {
  /** Hocuspocus document name suffix; the room id. */
  room: string;
  user: UserInfo | null;
  extensions?: CollaborativeExtensionOptions;
  /**
   * Tailwind `prose-*` size class(es) for the editor content.
   */
  proseSizeClassName?: string;
}

interface UseCollaborativeEditorReturn {
  editor: Editor | null;
  provider: HocuspocusProvider | null;
  ydoc: Y.Doc | null;
  isConnected: boolean;
  isSynced: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

// Generate a consistent color from user ID
function generateUserColor(userId: string): string {
  const colors = [
    '#958DF1', // Purple
    '#F98181', // Red
    '#FBBC88', // Orange
    '#FAF594', // Yellow
    '#70CFF8', // Blue
    '#94FADB', // Teal
    '#B9F18D', // Green
    '#FFA8A8', // Pink
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function scheduleEditorMutation(callback: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
}

/**
 * Realtime collaborative editor over Hocuspocus. No auth, no REST persistence —
 * the Hocuspocus server holds the Y.Doc in memory and syncs all connected
 * clients. The document name is `canvas:{room}`.
 */
export function useCollaborativeEditor({
  room,
  user,
  extensions: extensionOptions,
  proseSizeClassName = 'prose-sm sm:prose-base lg:prose-lg xl:prose-xl',
}: UseCollaborativeEditorProps): UseCollaborativeEditorReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');

  const placeholder = extensionOptions?.placeholder;
  const slashCommandExtraItemsRef = extensionOptions?.slashCommandExtraItemsRef;

  // Create the Y.Doc synchronously so the editor always has a valid schema on
  // the first render. We intentionally do NOT destroy it on unmount (a useMemo
  // that destroyed its value would hand back a dead doc after StrictMode's
  // dev-only remount). The provider owns the network/observers and is torn down
  // explicitly.
  const ydoc = useMemo(() => {
    if (!room) return null;
    return new Y.Doc();
  }, [room]);

  // Create the Hocuspocus provider in an effect — NOT during render. The
  // constructor connects immediately and synchronously emits status events.
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!room || !ydoc) {
      setProvider(null);
      return;
    }

    const hocuspocusUrl =
      process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'ws://localhost:1234';

    const newProvider = new HocuspocusProvider({
      url: hocuspocusUrl,
      name: `canvas:${room}`,
      document: ydoc,
      connect: true,
      forceSyncInterval: 3000,

      onConnect: () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      },
      onDisconnect: () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      },
      onSynced: () => {
        setIsSynced(true);
      },
      onStatus: ({ status }) => {
        setConnectionStatus(
          status as 'connecting' | 'connected' | 'disconnected'
        );
      },
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      setProvider(null);
      setIsConnected(false);
      setIsSynced(false);
      setConnectionStatus('disconnected');
    };
  }, [room, ydoc]);

  // Create TipTap extensions with collaboration. We only require the Y.Doc here
  // (available synchronously) so the editor mounts with a valid schema right
  // away. The provider arrives a tick later; until then the collaboration-caret
  // is omitted, and the editor rebuilds to add presence once it connects.
  const extensions = useMemo(() => {
    if (!ydoc) return [];

    return createCollaborativeExtensions({
      ydoc,
      provider,
      user: user || {
        name: 'Anonymous',
        color: '#888888',
        id: 'anonymous',
      },
      placeholder,
      slashCommandExtraItemsRef,
    });
  }, [ydoc, provider, user, placeholder, slashCommandExtraItemsRef]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      // Type assertion needed due to pnpm hoisting creating duplicate
      // @tiptap/core paths.
      extensions: extensions as UseEditorOptions['extensions'],
      editorProps: {
        attributes: {
          class: `prose dark:prose-invert ${proseSizeClassName} focus:outline-none max-w-none min-h-full text-foreground`,
        },
      },
      onCreate: ({ editor }) => {
        // Fix duplicate block IDs on initial load (for existing documents)
        scheduleEditorMutation(() => {
          if (editor.isDestroyed) return;

          const seenIds = new Set<string>();
          const tr = editor.state.tr;
          let modified = false;

          editor.state.doc.descendants((node, pos) => {
            if (node.attrs && node.attrs.blockId) {
              if (seenIds.has(node.attrs.blockId)) {
                const newId = `blk-${crypto.randomUUID().slice(0, 8)}`;
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockId: newId,
                });
                modified = true;
                seenIds.add(newId);
              } else {
                seenIds.add(node.attrs.blockId);
              }
            }
          });

          if (modified && !editor.isDestroyed) {
            editor.view.dispatch(tr);
          }
        });
      },
    },
    [extensions]
  );

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  return {
    editor,
    provider,
    ydoc,
    isConnected,
    isSynced,
    connectionStatus,
  };
}

export { generateUserColor };
