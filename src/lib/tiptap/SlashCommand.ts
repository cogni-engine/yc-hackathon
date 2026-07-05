import { Extension } from '@tiptap/core';
import type { MutableRefObject } from 'react';
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
  Text as TextIcon,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Workflow,
  PencilRuler,
  Table as TableIcon,
  Minus,
  Columns2,
  Columns3,
} from 'lucide-react';
import {
  Heading1Glyph,
  Heading2Glyph,
  Heading3Glyph,
} from '@/components/tiptap/SlashHeadingIcons';
import {
  SlashCommandMenu,
  type SlashCommandMenuRef,
} from '@/components/tiptap/SlashCommandMenu';
import type { SlashCommandItem } from '@/types/slashCommand';

/**
 * Notion-style slash menu: type `/` to insert a block. Built on TipTap's
 * Suggestion primitive (same as @-mentions), so it works in any collaborative
 * editor it's registered on (notes + tasks).
 */
/**
 * Group each slash item belongs to, for menu dividers. Keep the titles in sync
 * with SLASH_ITEMS below.
 */
export const SLASH_GROUP_OF: Record<string, string> = {
  Text: 'basic',
  'Heading 1': 'basic',
  'Heading 2': 'basic',
  'Heading 3': 'basic',
  'Bulleted list': 'lists',
  'Numbered list': 'lists',
  'To-do list': 'lists',
  Quote: 'blocks',
  Code: 'blocks',
  'Mermaid diagram': 'blocks',
  Drawing: 'blocks',
  Table: 'blocks',
  '2 columns': 'blocks',
  '3 columns': 'blocks',
  Divider: 'blocks',
};

const SLASH_ITEMS: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain paragraph',
    icon: TextIcon,
    keywords: ['paragraph', 'p', 'body'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('paragraph').run(),
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1Glyph,
    keywords: ['h1', 'title', 'big'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2Glyph,
    keywords: ['h2', 'subtitle'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3Glyph,
    keywords: ['h3'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run(),
  },
  {
    title: 'Bulleted list',
    description: 'A simple bulleted list',
    icon: List,
    keywords: ['ul', 'unordered', 'bullet', 'list'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    description: 'A list with numbering',
    icon: ListOrdered,
    keywords: ['ol', 'ordered', 'numbered', 'list'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'To-do list',
    description: 'Track tasks with checkboxes',
    icon: ListTodo,
    keywords: ['todo', 'task', 'checkbox', 'check'],
    command: ({ editor, range }) => {
      // toggleTaskList comes from the TaskList extension; not on the base type.
      const chain = editor.chain().focus().deleteRange(range) as ReturnType<
        typeof editor.chain
      > & { toggleTaskList: () => { run: () => boolean } };
      chain.toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quotation',
    icon: Quote,
    keywords: ['blockquote', 'citation'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code',
    description: 'Code block',
    icon: Code,
    keywords: ['codeblock', 'snippet', 'pre'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('codeBlock').run(),
  },
  {
    title: 'Mermaid diagram',
    description: 'Diagram from text (flowchart, sequence…)',
    icon: Workflow,
    keywords: ['mermaid', 'diagram', 'flowchart', 'chart', 'graph'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('codeBlock', { language: 'mermaid' })
        .run(),
  },
  {
    title: 'Drawing',
    description: 'Sketch with an Excalidraw canvas',
    icon: PencilRuler,
    keywords: [
      'draw',
      'sketch',
      'excalidraw',
      'whiteboard',
      'diagram',
      'canvas',
    ],
    command: ({ editor, range }) => {
      // insertExcalidraw comes from the ExcalidrawBlock extension.
      const chain = editor.chain().focus().deleteRange(range) as ReturnType<
        typeof editor.chain
      > & { insertExcalidraw: () => { run: () => boolean } };
      chain.insertExcalidraw().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table with a header row',
    icon: TableIcon,
    keywords: ['table', 'grid', 'rows', 'columns', 'spreadsheet'],
    command: ({ editor, range }) => {
      // insertTable comes from the Table extension; not on the base chain type.
      const chain = editor.chain().focus().deleteRange(range) as ReturnType<
        typeof editor.chain
      > & {
        insertTable: (options: {
          rows: number;
          cols: number;
          withHeaderRow: boolean;
        }) => { run: () => boolean };
      };
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: '2 columns',
    description: 'Side-by-side layout (resize / switch to grid after)',
    icon: Columns2,
    keywords: ['columns', 'grid', 'layout', 'split', 'two', '2'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setColumns({ template: [1, 1] })
        .run(),
  },
  {
    title: '3 columns',
    description: 'Three-column layout (resize / switch to grid after)',
    icon: Columns3,
    keywords: ['columns', 'grid', 'layout', 'split', 'three', '3'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setColumns({ template: [1, 1, 1] })
        .run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: Minus,
    keywords: ['hr', 'divider', 'rule', 'line', 'separator'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

const slashCommandPluginKey = new PluginKey('slashCommand');

export interface SlashCommandOptions {
  extraItemsRef?: MutableRefObject<SlashCommandItem[]>;
  getExtraItems?: () => SlashCommandItem[];
}

function getSlashItems(options: SlashCommandOptions): SlashCommandItem[] {
  return [
    ...SLASH_ITEMS,
    ...(options.extraItemsRef?.current ?? []),
    ...(options.getExtraItems?.() ?? []),
  ].map(item => ({
    ...item,
    group: item.group ?? SLASH_GROUP_OF[item.title],
  }));
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      extraItemsRef: undefined,
      getExtraItems: undefined,
    };
  },

  addProseMirrorPlugins() {
    const suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'> = {
      char: '/',
      pluginKey: slashCommandPluginKey,
      // Only open the menu when `/` is the first character of the block (cursor
      // at the far left) — never mid-text.
      startOfLine: true,
      // Don't trigger inside a code block, where `/` is literal text.
      allow: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        return $from.parent.type.name !== 'codeBlock';
      },
      items: ({ query }) => {
        const items = getSlashItems(this.options);
        const q = query.toLowerCase().trim();
        if (!q) return items;
        // Filter to matches, then sort the best matches to the top: exact
        // title → title prefix → title substring → keyword prefix → keyword
        // substring. Ties keep the original menu order.
        const score = (item: SlashCommandItem) => {
          const title = item.title.toLowerCase();
          if (title === q) return 4;
          if (title.startsWith(q)) return 3;
          if (title.includes(q)) return 2;
          const kw = (item.keywords ?? []).map(k => k.toLowerCase());
          if (kw.some(k => k.startsWith(q))) return 1;
          if (kw.some(k => k.includes(q))) return 0;
          return -1;
        };
        return items
          .map((item, index) => ({ item, index, s: score(item) }))
          .filter(entry => entry.s >= 0)
          .sort((a, b) => b.s - a.s || a.index - b.index)
          .map(entry => entry.item);
      },
      command: ({ editor, range, props }) => {
        props.command({ editor, range });
      },
      render: () => {
        let component: ReactRenderer<SlashCommandMenuRef> | undefined;
        let popup: TippyInstance[] | undefined;

        return {
          onStart: (props: SuggestionProps<SlashCommandItem>) => {
            component = new ReactRenderer(SlashCommandMenu, {
              props,
              editor: props.editor,
            });
            if (!props.clientRect) return;
            popup = tippy('body', {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              // Append to <body> so popper sizes against the viewport and can
              // never be clipped by the (short, overflow-hidden) task canvas.
              // The Radix modal's react-remove-scroll blocks wheel events here,
              // so the menu scrolls itself via a manual wheel handler (see
              // SlashCommandMenu); pointer-events-auto re-enables hover/click
              // under the modal's body { pointer-events: none }.
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
            });
          },
          onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
            component?.updateProps(props);
            if (!props.clientRect) return;
            popup?.[0]?.setProps({
              getReferenceClientRect: props.clientRect as () => DOMRect,
            });
          },
          onKeyDown: (props: { event: KeyboardEvent }) => {
            if (props.event.key === 'Escape') {
              popup?.[0]?.hide();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            popup?.[0]?.destroy();
            component?.destroy();
          },
        };
      },
    };

    return [
      Suggestion({
        editor: this.editor,
        ...suggestion,
      }),
    ];
  },
});
