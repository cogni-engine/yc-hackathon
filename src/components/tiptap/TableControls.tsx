'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import {
  BetweenVerticalStart,
  BetweenVerticalEnd,
  BetweenHorizontalStart,
  BetweenHorizontalEnd,
  Columns3,
  Rows3,
  TableCellsMerge,
  PanelTop,
  PanelLeft,
  Trash2,
  Plus,
} from 'lucide-react';

/**
 * Table controls for the collaborative editor:
 *
 *  - A floating action toolbar above the table the cursor is inside, with
 *    insert/delete column & row, merge/split cells, header toggles, and delete
 *    table.
 *  - Notion-style "+" handles on the right and bottom edges of any hovered
 *    table, to quickly append a column or row.
 *
 * Both surfaces are portaled to <body> so transformed/filtered ancestors (e.g.
 * liquid-glass effects) don't become the containing block for position: fixed.
 *
 * The table commands come from @tiptap/extension-table's command augmentation;
 * we type them locally so this file doesn't depend on the augmentation being
 * visible at the call site.
 */
type TableCommandName =
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteColumn'
  | 'deleteRow'
  | 'deleteTable'
  | 'mergeOrSplit'
  | 'toggleHeaderRow'
  | 'toggleHeaderColumn';

type TableChain = Record<TableCommandName, () => { run: () => boolean }>;

type LucideIcon = typeof Columns3;

interface TableControlsProps {
  editor: Editor | null;
}

// The editor object can exist before its ProseMirror view is mounted, and the
// view tears down/rebuilds (e.g. when the Hocuspocus provider attaches). Reading
// editor.view.* in those windows throws, so all view access goes through guards.
function safeViewDom(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null;
  try {
    return editor.view.dom as HTMLElement;
  } catch {
    return null;
  }
}

function findSelectedTableElement(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed || !editor.isActive('table')) return null;
  try {
    const { from } = editor.state.selection;
    const { node } = editor.view.domAtPos(from);
    const el = (
      node.nodeType === Node.TEXT_NODE ? node.parentNode : node
    ) as HTMLElement | null;
    return el?.closest('table') ?? null;
  } catch {
    return null;
  }
}

function lastCellOf(tableEl: HTMLElement): HTMLElement | null {
  const cells = tableEl.querySelectorAll<HTMLElement>('td, th');
  return cells.length ? cells[cells.length - 1] : null;
}

const INSERT_BUTTONS: Array<{
  command: TableCommandName;
  label: string;
  Icon: LucideIcon;
  danger?: boolean;
}> = [
  {
    command: 'addColumnBefore',
    label: 'Insert column left',
    Icon: BetweenVerticalStart,
  },
  {
    command: 'addColumnAfter',
    label: 'Insert column right',
    Icon: BetweenVerticalEnd,
  },
  {
    command: 'deleteColumn',
    label: 'Delete column',
    Icon: Columns3,
    danger: true,
  },
];

const ROW_BUTTONS: typeof INSERT_BUTTONS = [
  {
    command: 'addRowBefore',
    label: 'Insert row above',
    Icon: BetweenHorizontalStart,
  },
  {
    command: 'addRowAfter',
    label: 'Insert row below',
    Icon: BetweenHorizontalEnd,
  },
  { command: 'deleteRow', label: 'Delete row', Icon: Rows3, danger: true },
];

const CELL_BUTTONS: typeof INSERT_BUTTONS = [
  {
    command: 'mergeOrSplit',
    label: 'Merge / split cells',
    Icon: TableCellsMerge,
  },
  { command: 'toggleHeaderRow', label: 'Toggle header row', Icon: PanelTop },
  {
    command: 'toggleHeaderColumn',
    label: 'Toggle header column',
    Icon: PanelLeft,
  },
];

export function TableControls({ editor }: TableControlsProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const addColRef = useRef<HTMLButtonElement | null>(null);
  const addRowRef = useRef<HTMLButtonElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [selectedTable, setSelectedTable] = useState<HTMLElement | null>(null);
  const [hoverTable, setHoverTable] = useState<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Track when the editor's view is actually mounted so view-dependent effects
  // run at the right time (and re-run if the view is rebuilt).
  useEffect(() => {
    if (!editor) {
      setViewReady(false);
      return;
    }
    if (safeViewDom(editor)) {
      setViewReady(true);
      return;
    }
    setViewReady(false);
    const onCreate = () => setViewReady(true);
    editor.on('create', onCreate);
    return () => {
      editor.off('create', onCreate);
    };
  }, [editor]);

  const run = useCallback(
    (command: TableCommandName) => {
      if (!editor) return;
      const chain = editor.chain().focus() as ReturnType<Editor['chain']> &
        TableChain;
      chain[command]().run();
    },
    [editor]
  );

  // Append a column/row at the far edge regardless of the current selection:
  // drop the caret in the bottom-right cell (last row AND last column) first.
  const appendAtEdge = useCallback(
    (tableEl: HTMLElement, command: 'addColumnAfter' | 'addRowAfter') => {
      if (!editor || editor.isDestroyed) return;
      const cell = lastCellOf(tableEl);
      if (!cell) return;
      let pos = -1;
      try {
        pos = editor.view.posAtDOM(cell, 0);
      } catch {
        return;
      }
      if (pos < 0) return;
      const chain = editor.chain().focus().setTextSelection(pos) as ReturnType<
        Editor['chain']
      > &
        TableChain;
      chain[command]().run();
    },
    [editor]
  );

  // Track which table the selection is inside (drives the toolbar).
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setSelectedTable(
        editor.isEditable ? findSelectedTableElement(editor) : null
      );
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.on('focus', update);
    editor.on('blur', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('focus', update);
      editor.off('blur', update);
    };
  }, [editor]);

  // Track the hovered table (drives the "+" append handles).
  useEffect(() => {
    if (!editor || !viewReady || !editor.isEditable) return;
    const dom = safeViewDom(editor);
    if (!dom) return;
    const clearHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = null;
    };
    const scheduleHide = () => {
      clearHide();
      hideTimer.current = setTimeout(() => setHoverTable(null), 200);
    };
    const onOver = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const table = target?.closest?.('table') as HTMLElement | null;
      if (table) {
        clearHide();
        setHoverTable(table);
      }
    };
    const onOut = (event: Event) => {
      const to = (event as MouseEvent).relatedTarget as HTMLElement | null;
      // Leaving to anything that isn't a table cell schedules a hide; the
      // handles' own onMouseEnter cancels it when the pointer lands on them.
      if (!to || !to.closest?.('table')) scheduleHide();
    };
    dom.addEventListener('mouseover', onOver);
    dom.addEventListener('mouseout', onOut);
    return () => {
      dom.removeEventListener('mouseover', onOver);
      dom.removeEventListener('mouseout', onOut);
      clearHide();
    };
  }, [editor, viewReady]);

  // Position the toolbar above the selected table.
  useEffect(() => {
    const tableEl = selectedTable;
    const el = toolbarRef.current;
    if (!tableEl || !el) return;
    return autoUpdate(tableEl, el, () => {
      void computePosition(tableEl, el, {
        strategy: 'fixed',
        placement: 'top-start',
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      });
    });
  }, [selectedTable]);

  // Position the "+" handles on the right/bottom edges of the handle table.
  const handleTable = hoverTable ?? selectedTable;
  useEffect(() => {
    const tableEl = handleTable;
    const colEl = addColRef.current;
    const rowEl = addRowRef.current;
    if (!tableEl || !colEl || !rowEl) return;
    const stops = [
      autoUpdate(tableEl, colEl, () => {
        void computePosition(tableEl, colEl, {
          strategy: 'fixed',
          placement: 'right',
          middleware: [offset(6)],
        }).then(({ x, y }) => {
          colEl.style.left = `${x}px`;
          colEl.style.top = `${y}px`;
        });
      }),
      autoUpdate(tableEl, rowEl, () => {
        void computePosition(tableEl, rowEl, {
          strategy: 'fixed',
          placement: 'bottom',
          middleware: [offset(6)],
        }).then(({ x, y }) => {
          rowEl.style.left = `${x}px`;
          rowEl.style.top = `${y}px`;
        });
      }),
    ];
    return () => stops.forEach(stop => stop());
  }, [handleTable]);

  if (!mounted) return null;

  const toolbarOpen = !!selectedTable;
  const handlesOpen = !!handleTable;

  const groupButton = (button: (typeof INSERT_BUTTONS)[number]) => (
    <button
      key={button.command}
      type='button'
      title={button.label}
      aria-label={button.label}
      onClick={() => run(button.command)}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-secondary ${
        button.danger ? 'hover:text-red-500' : 'hover:text-text-primary'
      }`}
    >
      <button.Icon className='h-4 w-4' />
    </button>
  );

  const divider = (key: string) => (
    <span key={key} className='mx-0.5 h-5 w-px bg-border-default' />
  );

  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return createPortal(
    <>
      <div
        ref={toolbarRef}
        role='toolbar'
        aria-label='Table controls'
        onMouseDown={keepSelection}
        className='fixed left-0 top-0 z-50 flex items-center gap-0.5 rounded-lg border border-border-default bg-surface-primary p-1 shadow-md'
        style={{
          visibility: toolbarOpen ? 'visible' : 'hidden',
          pointerEvents: toolbarOpen ? 'auto' : 'none',
        }}
      >
        {INSERT_BUTTONS.map(groupButton)}
        {divider('d1')}
        {ROW_BUTTONS.map(groupButton)}
        {divider('d2')}
        {CELL_BUTTONS.map(groupButton)}
        {divider('d3')}
        <button
          type='button'
          title='Delete table'
          aria-label='Delete table'
          onClick={() => run('deleteTable')}
          className='inline-flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-secondary hover:text-red-500'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      </div>

      <button
        ref={addColRef}
        type='button'
        title='Add column'
        aria-label='Add column'
        onMouseDown={keepSelection}
        onMouseEnter={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }}
        onClick={() =>
          handleTable && appendAtEdge(handleTable, 'addColumnAfter')
        }
        className='fixed left-0 top-0 z-50 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface-primary text-text-muted shadow-sm transition-colors hover:bg-surface-secondary hover:text-text-primary'
        style={{
          visibility: handlesOpen ? 'visible' : 'hidden',
          pointerEvents: handlesOpen ? 'auto' : 'none',
        }}
      >
        <Plus className='h-3.5 w-3.5' />
      </button>

      <button
        ref={addRowRef}
        type='button'
        title='Add row'
        aria-label='Add row'
        onMouseDown={keepSelection}
        onMouseEnter={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }}
        onClick={() => handleTable && appendAtEdge(handleTable, 'addRowAfter')}
        className='fixed left-0 top-0 z-50 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-surface-primary text-text-muted shadow-sm transition-colors hover:bg-surface-secondary hover:text-text-primary'
        style={{
          visibility: handlesOpen ? 'visible' : 'hidden',
          pointerEvents: handlesOpen ? 'auto' : 'none',
        }}
      >
        <Plus className='h-3.5 w-3.5' />
      </button>
    </>,
    document.body
  );
}
