'use client';

import { useMemo } from 'react';
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
  placeholder = 'Type something…',
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

  const { editor } = useCollaborativeEditor({
    room,
    user: userInfo,
    extensions: extensionOptions,
    proseSizeClassName: 'prose-base',
  });

  return (
    <div className='relative min-h-full w-full'>
      <EditorStyles />
      <CollaborativeEditorStyles />
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
