import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Extension that automatically assigns unique block IDs to nodes
 * This works by intercepting transactions and adding blockIds to new nodes
 */
export const BlockIdExtension = Extension.create({
  name: 'blockId',

  addGlobalAttributes() {
    return [
      {
        // Apply to all block-level nodes
        types: [
          'paragraph',
          'heading',
          'bulletList',
          'orderedList',
          'listItem',
          'taskList',
          'blockquote',
          'codeBlock',
          'horizontalRule',
          'diffSuggestionBlock',
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: element => element.getAttribute('data-block-id'),
            renderHTML: attributes => {
              if (!attributes.blockId) {
                return {};
              }
              return {
                'data-block-id': attributes.blockId,
              };
            },
            keepOnSplit: false,
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockId'),

        appendTransaction: (transactions, oldState, newState) => {
          // Only run if something actually changed
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) {
            return null;
          }

          const tr = newState.tr;
          let modified = false;

          // Check all nodes in the new document
          newState.doc.descendants((node, pos) => {
            // Only process nodes that support blockId
            if (
              node.isBlock &&
              node.type.spec.attrs?.blockId !== undefined &&
              !node.attrs.blockId
            ) {
              // Generate new unique ID
              const newId = `blk-${crypto.randomUUID().slice(0, 8)}`;

              // Update the node with the new ID
              try {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  blockId: newId,
                });
                modified = true;
              } catch (error) {
                // If setNodeMarkup fails (e.g., schema validation), skip this node
                console.warn(
                  `Failed to set blockId for ${node.type.name}:`,
                  error
                );
              }
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
