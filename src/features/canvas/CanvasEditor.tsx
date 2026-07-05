'use client';

import { useMemo, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import {
  useCollaborativeEditor,
  generateUserColor,
} from '@/features/notes/hooks/useCollaborativeEditor';
import { TableControls } from '@/components/tiptap/TableControls';
import { ImageControls } from '@/components/tiptap/ImageControls';
import { EditorStyles } from '@/features/notes/lib/editorStyles';
import { CollaborativeEditorStyles } from '@/features/notes/lib/collaborativeEditorStyles';

interface CanvasEditorProps {
  /** Room id — the Hocuspocus document is `canvas:{room}`. */
  room: string;
  /** Display name for the presence cursor. */
  userName?: string;
  placeholder?: string;
}

/**
 * Realtime collaborative canvas — the same TipTap + Y.js + Hocuspocus stack as
 * cogno's task description editor, stripped of auth / tasks / attachments.
 * Multiple clients on the same `room` edit one shared document live. Use the "/"
 * slash menu to insert headings, tables, mermaid diagrams, Excalidraw drawings,
 * columns, etc.
 */
export function CanvasEditor({
  room,
  userName,
  placeholder = 'Type "/" for blocks, or just start writing…',
}: CanvasEditorProps) {
  // A stable random identity per browser session (no auth).
  const userInfo = useMemo(() => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return {
      id,
      name: userName || `Guest ${id.slice(0, 4)}`,
      color: generateUserColor(id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extensionOptions = useMemo(() => ({ placeholder }), [placeholder]);

  const { editor, isSynced, connectionStatus } = useCollaborativeEditor({
    room,
    user: userInfo,
    extensions: extensionOptions,
    proseSizeClassName: 'prose-base',
  });

  const [showStatus] = useState(true);

  return (
    <div className='relative min-h-full w-full'>
      <EditorStyles />
      <CollaborativeEditorStyles />
      {showStatus && (
        <div className='pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs text-neutral-500 dark:bg-white/10 dark:text-neutral-400'>
          <span
            className={`inline-block size-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-500'
                : connectionStatus === 'connecting'
                  ? 'bg-amber-500'
                  : 'bg-neutral-400'
            }`}
          />
          {connectionStatus === 'connected'
            ? isSynced
              ? 'Live'
              : 'Syncing…'
            : connectionStatus === 'connecting'
              ? 'Connecting…'
              : 'Offline'}
        </div>
      )}
      {editor ? (
        <>
          <EditorContent editor={editor} className='canvas-editor' />
          <TableControls editor={editor} />
          <ImageControls editor={editor} />
        </>
      ) : (
        <div className='text-sm text-neutral-400'>{placeholder}</div>
      )}
    </div>
  );
}
