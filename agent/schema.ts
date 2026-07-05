import type * as Y from 'yjs';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Collaboration from '@tiptap/extension-collaboration';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Markdown } from '@tiptap/markdown';
import { common, createLowlight } from 'lowlight';
import {
  imageMarkdown,
  ExcalidrawBlock,
  IframeEmbed,
  LinkCard,
  Column,
  ColumnsContainer,
} from '../src/vendor/editor-schema/src';
import { CognoSectionMarker } from '../src/features/tasks/components/CognoSectionMarker';
import { BlockIdExtension } from '../src/lib/tiptap/BlockIdExtension';

/**
 * Headless twin of `createCollaborativeExtensions` (src/features/notes/lib/).
 *
 * MUST stay schema-identical to the browser editor — same node type names,
 * attributes and content expressions — otherwise the y-prosemirror binding
 * would "normalize" (i.e. corrupt) documents for everyone in the room.
 *
 * The browser versions of the custom blocks are all `<vendor base>.extend({
 * addNodeView })` — NodeViews are pure rendering, no schema surface — so the
 * agent uses the vendor bases directly. UI-only extensions (Placeholder,
 * SlashCommand, MarkdownClipboard, CollaborationCaret) are omitted: none of
 * them contribute schema. Presence is broadcast manually (see session.ts).
 */
export function buildAgentExtensions(ydoc: Y.Doc) {
  return [
    // Mirror of the browser config: undo/redo off (Y.js owns history),
    // headings 1-6, codeBlock replaced by the lowlight-based block below.
    StarterKit.configure({
      undoRedo: false,
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      codeBlock: false,
    }),

    Markdown,

    Image.extend({
      ...imageMarkdown,
    }).configure({
      inline: true,
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),

    TaskList.configure({
      HTMLAttributes: {
        class: 'task-list',
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'task-item',
      },
    }),

    TableKit.configure({
      table: {
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      },
    }),

    Collaboration.configure({
      document: ydoc,
    }),

    // Browser uses MermaidCodeBlock = CodeBlockLowlight.extend({ addNodeView })
    // — same 'codeBlock' node type. The lowlight instance is required (the
    // plugin throws without one) but only produces decorations.
    CodeBlockLowlight.configure({
      lowlight: createLowlight(common),
      HTMLAttributes: {
        class: 'code-block-highlighted',
      },
    }),

    ExcalidrawBlock,
    IframeEmbed,
    LinkCard,
    CognoSectionMarker,
    ColumnsContainer,
    Column,

    BlockIdExtension,
  ];
}
