'use client';

import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { useCallback } from 'react';
import {
  Columns2,
  GripVertical,
  LayoutGrid,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import {
  Column as ColumnSchema,
  ColumnsContainer as ColumnsContainerSchema,
  type ColumnsLayout,
} from '@cogni/editor-schema';

// Re-export the framework-agnostic column schema unchanged (it has no node view).
export const Column = ColumnSchema;
export type { ColumnsLayout };

/**
 * Multi-column / grid layout blocks.
 *
 * A `columns` container holds one or more `column` children, each of which is a
 * normal block-content area (paragraphs, lists, images, even tables). The
 * container carries a `layout` attribute that flips its CSS between a flex row
 * and a CSS grid; either way the per-column `width` fraction drives sizing, so
 * the preset buttons today and a drag handle tomorrow mutate the same attribute.
 *
 * Both nodes live in the shared collaborative schema (registered in
 * `createCollaborativeExtensions`), so they sync through Y.js / Hocuspocus like
 * every other node — structure, `layout`, and `width` all ride along.
 */

/** Preset width templates (fractions). Reused as flex-grow and as grid `fr`. */
const PRESETS_2: { label: string; widths: number[] }[] = [
  { label: '50 / 50', widths: [1, 1] },
  { label: '70 / 30', widths: [7, 3] },
  { label: '30 / 70', widths: [3, 7] },
];

/** Build the document content for a fresh columns block from a width template. */
function buildColumnsContent(template: number[]) {
  return template.map(width => ({
    type: 'column',
    attrs: { width },
    content: [{ type: 'paragraph' }],
  }));
}

/** Read each child column's width fraction (null → 1) in document order. */
function columnWidths(node: PMNode): number[] {
  const widths: number[] = [];
  node.forEach(child => widths.push((child.attrs.width as number | null) ?? 1));
  return widths;
}

function ColumnsView({
  node,
  editor,
  getPos,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const layout = (node.attrs.layout as ColumnsLayout) ?? 'flex';
  const widths = columnWidths(node);
  const columnCount = node.childCount;
  // For grid mode; flex mode falls back to the per-column flex style.
  const gridTemplateColumns = widths.map(w => `${w}fr`).join(' ');

  // Run a transaction scoped to this container, located via getPos(). Used by
  // the toolbar actions that change the child set (the container's own `layout`
  // attribute goes through updateAttributes instead).
  const runOnContainer = useCallback(
    (fn: (tr: Transaction, container: PMNode, pos: number) => boolean) => {
      const pos = typeof getPos === 'function' ? getPos() : undefined;
      if (pos == null) return;
      const { state, view } = editor;
      const container = state.doc.nodeAt(pos);
      if (!container) return;
      const tr = state.tr;
      if (fn(tr, container, pos)) view.dispatch(tr);
    },
    [editor, getPos]
  );

  const applyTemplate = useCallback(
    (template: number[]) => {
      runOnContainer((tr, container, pos) => {
        let changed = false;
        container.forEach((child, offset, index) => {
          const width = template[index] ?? null;
          if (child.attrs.width !== width) {
            tr.setNodeMarkup(pos + 1 + offset, undefined, {
              ...child.attrs,
              width,
            });
            changed = true;
          }
        });
        return changed;
      });
    },
    [runOnContainer]
  );

  const addColumn = useCallback(() => {
    runOnContainer((tr, container, pos) => {
      const columnType = editor.schema.nodes.column;
      const newColumn = columnType.createAndFill({ width: null });
      if (!newColumn) return false;
      // Re-balance existing columns to equal widths first (positions before the
      // append point are unaffected by the later insert).
      container.forEach((child, offset) => {
        if (child.attrs.width !== null) {
          tr.setNodeMarkup(pos + 1 + offset, undefined, {
            ...child.attrs,
            width: null,
          });
        }
      });
      tr.insert(pos + container.nodeSize - 1, newColumn);
      return true;
    });
  }, [editor, runOnContainer]);

  const removeColumn = useCallback(() => {
    runOnContainer((tr, container, pos) => {
      if (container.childCount <= 1) return false;
      const last = container.child(container.childCount - 1);
      const end = pos + container.nodeSize - 1;
      tr.delete(end - last.nodeSize, end);
      // Re-balance the surviving columns to equal widths.
      container.forEach((child, offset, index) => {
        if (index < container.childCount - 1 && child.attrs.width !== null) {
          tr.setNodeMarkup(pos + 1 + offset, undefined, {
            ...child.attrs,
            width: null,
          });
        }
      });
      return true;
    });
  }, [runOnContainer]);

  const setLayout = useCallback(
    (next: ColumnsLayout) => updateAttributes({ layout: next }),
    [updateAttributes]
  );

  const presets = columnCount === 2 ? PRESETS_2 : [];

  return (
    <NodeViewWrapper
      className='columns-block'
      data-type='columns'
      data-layout={layout}
      style={{ ['--columns-template' as string]: gridTemplateColumns }}
    >
      <div className='columns-toolbar' contentEditable={false}>
        <button
          type='button'
          className='columns-toolbar__btn columns-toolbar__drag'
          data-drag-handle
          aria-label='Drag layout block'
          title='Drag'
        >
          <GripVertical size={14} />
        </button>

        <div className='columns-toolbar__group'>
          <button
            type='button'
            className='columns-toolbar__btn'
            data-active={layout === 'flex'}
            onClick={() => setLayout('flex')}
            aria-label='Flex columns'
            title='Columns'
          >
            <Columns2 size={14} />
          </button>
          <button
            type='button'
            className='columns-toolbar__btn'
            data-active={layout === 'grid'}
            onClick={() => setLayout('grid')}
            aria-label='Grid layout'
            title='Grid'
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {presets.length > 0 && (
          <div className='columns-toolbar__group'>
            {presets.map(preset => (
              <button
                key={preset.label}
                type='button'
                className='columns-toolbar__btn columns-toolbar__ratio'
                onClick={() => applyTemplate(preset.widths)}
                title={`Set ratio ${preset.label}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <div className='columns-toolbar__group'>
          <button
            type='button'
            className='columns-toolbar__btn'
            onClick={removeColumn}
            disabled={columnCount <= 1}
            aria-label='Remove column'
            title='Remove column'
          >
            <Minus size={14} />
          </button>
          <button
            type='button'
            className='columns-toolbar__btn'
            onClick={addColumn}
            aria-label='Add column'
            title='Add column'
          >
            <Plus size={14} />
          </button>
          <button
            type='button'
            className='columns-toolbar__btn columns-toolbar__danger'
            onClick={() => deleteNode()}
            aria-label='Delete layout block'
            title='Delete'
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <NodeViewContent className='columns-content' />
    </NodeViewWrapper>
  );
}

/**
 * Editor build of the columns container: the shared schema extended with the
 * React node view (inline toolbar + `NodeViewContent`) and the `setColumns`
 * command. The headless converter uses `ColumnsContainerSchema` directly.
 */
export const ColumnsContainer = ColumnsContainerSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ColumnsView);
  },

  addCommands() {
    return {
      setColumns:
        (options?: { template?: number[] }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { layout: 'flex' },
            content: buildColumnsContent(options?.template ?? [1, 1]),
          }),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      /** Insert a columns layout block from a width template (default 2 equal). */
      setColumns: (options?: { template?: number[] }) => ReturnType;
    };
  }
}
