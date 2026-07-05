import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { Markdown } from '@tiptap/markdown';
import { imageMarkdown } from '@cogni/editor-schema';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { BlockIdExtension } from '@/lib/tiptap/BlockIdExtension';
import { MermaidCodeBlock } from '@/features/tasks/components/MermaidCodeBlock';
import { ExcalidrawBlock } from '@/features/tasks/components/ExcalidrawBlock';
import { IframeEmbedBlock } from '@/features/tasks/components/IframeEmbedBlock';
import { LinkCardBlock } from '@/features/tasks/components/LinkCardBlock';
import { CognoSectionMarker } from '@/features/tasks/components/CognoSectionMarker';
import {
  Column,
  ColumnsContainer,
} from '@/features/tasks/components/ColumnsBlock';
import { SlashCommand } from '@/lib/tiptap/SlashCommand';
import type { SlashCommandItem } from '@/types/slashCommand';

/** A lone bare URL (the entire clipboard is just one http(s) link). */
const SINGLE_URL_RE = /^https?:\/\/\S+$/i;

/** Pasted standard <iframe …> embed code (e.g. a YouTube share snippet). */
const IFRAME_EMBED_RE = /^<iframe[\s>][\s\S]*<\/iframe>\s*$/i;

/** Heuristic: does pasted plain text look like markdown / our rich-HTML blocks? */
const MARKDOWN_HINT_RE =
  /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\||- \[[ xX]\])|\[[^\]]+\]\([^)]+\)|!\[[^\]]*\]\([^)]+\)|<div\s+data-type=|<iframe[\s>]/;

function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINT_RE.test(text);
}

/**
 * Markdown clipboard: paste markdown → rich nodes, copy → markdown, paste back
 * → rich again. Native in-editor copies (ProseMirror tags its HTML with
 * `data-pm-slice`) and rich web HTML fall through to default handling.
 */
const MarkdownClipboard = Extension.create({
  name: 'markdownClipboard',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain') ?? '';
            if (!text) return false;
            const html = event.clipboardData?.getData('text/html') ?? '';
            const trimmed = text.trim();

            // Native in-editor copy → keep ProseMirror's exact node slice.
            if (html.includes('data-pm-slice')) return false;

            // Pasted <iframe> embed code → parse as HTML so the iframe node's
            // parseHTML turns it into a live embed.
            if (
              IFRAME_EMBED_RE.test(trimmed) &&
              /\bsrc(?:doc)?\s*=/i.test(trimmed)
            ) {
              editor.commands.insertContent(trimmed);
              return true;
            }
            // Lone URL with no selection → iframe embed.
            if (SINGLE_URL_RE.test(trimmed) && view.state.selection.empty) {
              editor.commands.insertIframeEmbed({ src: trimmed });
              return true;
            }
            if (!looksLikeMarkdown(trimmed)) return false;

            // Otherwise treat the text as markdown (the editor's content model).
            editor.commands.insertContent(text, { contentType: 'markdown' });
            return true;
          },
          // Copy/cut → markdown in the clipboard's text/plain.
          clipboardTextSerializer: slice => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const manager = (editor.storage as any)?.markdown?.manager;
            const fallback = () =>
              slice.content.textBetween(0, slice.content.size, '\n', '\n');
            if (!manager) return fallback();
            try {
              const md = manager.serialize({
                type: 'doc',
                content: slice.content.toJSON() ?? [],
              });
              return typeof md === 'string' && md.length > 0 ? md : fallback();
            } catch {
              return fallback();
            }
          },
        },
      }),
    ];
  },
});

interface UserInfo {
  name: string;
  color: string;
  id: string;
}

interface CreateCollaborativeExtensionsProps {
  ydoc: Y.Doc;
  /**
   * Hocuspocus provider for presence cursors. May be null on the first render
   * (it is created in an effect a tick after the Y.Doc); the collaboration
   * caret is omitted until it exists, then the editor rebuilds to add it.
   */
  provider: HocuspocusProvider | null;
  user: UserInfo;
  /** Placeholder shown when the document is empty. */
  placeholder?: string;
  /** Additional slash command items for editor-specific actions. */
  slashCommandExtraItemsRef?: React.MutableRefObject<SlashCommandItem[]>;
}

export function createCollaborativeExtensions({
  ydoc,
  provider,
  user,
  placeholder = 'Start typing to collaborate...',
  slashCommandExtraItemsRef,
}: CreateCollaborativeExtensionsProps) {
  return [
    // StarterKit provides basic formatting. History is disabled (Y.js handles
    // it); codeBlock is dropped so MermaidCodeBlock takes over ```mermaid.
    StarterKit.configure({
      history: false,
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      codeBlock: false,
    } as Parameters<typeof StarterKit.configure>[0]),

    Markdown,

    Placeholder.configure({
      placeholder,
    }),

    // Image with markdown round-trip (attachment-backed images dropped).
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

    // Y.js Collaboration extension - syncs editor content via Y.Doc
    Collaboration.configure({
      document: ydoc,
    }),

    // Collaboration caret - shows other users' cursors and selections.
    // Omitted until the provider exists (created in an effect post-mount).
    ...(provider
      ? [
          CollaborationCaret.configure({
            provider,
            user: {
              name: user.name,
              color: user.color,
            },
            render: user => {
              const cursor = document.createElement('span');
              cursor.classList.add('collaboration-cursor');

              const caret = document.createElement('span');
              caret.classList.add('collaboration-cursor__caret');
              caret.style.backgroundColor = user.color;

              const label = document.createElement('span');
              label.classList.add('collaboration-cursor__label');
              label.style.backgroundColor = user.color;
              label.textContent = user.name;

              cursor.appendChild(caret);
              cursor.appendChild(label);

              return cursor;
            },
          }),
        ]
      : []),

    // Mermaid-rendering code block (replaces StarterKit's codeBlock).
    MermaidCodeBlock,

    // Excalidraw drawing block. Scene stored as JSON in a node attribute, syncs
    // via Y.js like any other node.
    ExcalidrawBlock,

    // Inline iframe embed for arbitrary URLs.
    IframeEmbedBlock,

    // Link card: renders a URL as a clickable card.
    LinkCardBlock,

    // Hidden section marker used by backend-owned description regions.
    CognoSectionMarker,

    // Multi-column / grid layout blocks.
    ColumnsContainer,
    Column,

    // Convert pasted markdown fenced code blocks into real nodes.
    MarkdownClipboard,

    // Notion-style slash (/) menu.
    SlashCommand.configure({
      extraItemsRef: slashCommandExtraItemsRef,
    }),

    // BlockId extension - assigns unique IDs to all blocks. Must come AFTER
    // other node extensions so it can process them.
    BlockIdExtension,
  ];
}
