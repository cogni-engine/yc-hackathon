import type { Editor } from '@tiptap/react';

const DEMO_SENTENCE =
  'AI draft: This paragraph is a noisy rough note that should be tighter.';
const DELETE_TEXT = 'noisy rough ';
const INSERT_TEXT = 'clean ';
const AI_CURSOR_COLOR = '#0ea5e9';

let activeDemoRun = 0;

declare global {
  interface Window {
    runAiCursorDemo?: () => Promise<void>;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function findLastTextRange(
  editor: Editor,
  needle: string
): { from: number; to: number } | null {
  let found: { from: number; to: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    let index = node.text.indexOf(needle);
    while (index !== -1) {
      found = {
        from: pos + index,
        to: pos + index + needle.length,
      };
      index = node.text.indexOf(needle, index + 1);
    }
  });

  return found;
}

async function glideCursor(
  editor: Editor,
  from: number,
  to: number,
  isActive: () => boolean
): Promise<void> {
  const direction = from <= to ? 1 : -1;

  for (let pos = from; direction > 0 ? pos <= to : pos >= to; pos += direction) {
    if (!isActive()) return;
    editor.commands.moveAiCursor(pos);
    await wait(18);
  }
}

async function deleteTextBackwards(
  editor: Editor,
  from: number,
  to: number,
  isActive: () => boolean
): Promise<void> {
  for (let pos = to; pos > from; pos -= 1) {
    if (!isActive()) return;
    editor.commands.moveAiCursor(pos);
    editor.chain().focus().deleteRange({ from: pos - 1, to: pos }).run();
    await wait(45);
  }

  if (isActive()) {
    editor.commands.moveAiCursor(from);
  }
}

async function typeTextAt(
  editor: Editor,
  pos: number,
  text: string,
  isActive: () => boolean
): Promise<void> {
  editor.chain().focus().setTextSelection(pos).run();

  for (const char of text) {
    if (!isActive()) return;
    editor.commands.moveAiCursor(editor.state.selection.from);
    editor.chain().focus().insertContent(char).run();
    editor.commands.moveAiCursor(editor.state.selection.from);
    await wait(55);
  }
}

export async function runAiCursorDemo(editor: Editor): Promise<void> {
  const runId = ++activeDemoRun;
  const isActive = () => runId === activeDemoRun && !editor.isDestroyed;

  editor
    .chain()
    .focus('end')
    .insertContent({
      type: 'paragraph',
      content: [{ type: 'text', text: DEMO_SENTENCE }],
    })
    .run();

  await wait(100);
  if (!isActive()) return;

  const insertedRange = findLastTextRange(editor, DEMO_SENTENCE);
  if (!insertedRange) return;

  editor.commands.showAiCursor({
    pos: insertedRange.from,
    name: 'AI',
    color: AI_CURSOR_COLOR,
  });

  await wait(250);
  await glideCursor(editor, insertedRange.from, insertedRange.to, isActive);
  await wait(350);

  const deleteRange = findLastTextRange(editor, DELETE_TEXT);
  if (deleteRange && isActive()) {
    await glideCursor(editor, insertedRange.to, deleteRange.to, isActive);
    await deleteTextBackwards(editor, deleteRange.from, deleteRange.to, isActive);
    await typeTextAt(editor, deleteRange.from, INSERT_TEXT, isActive);
  }

  await wait(700);
  if (isActive()) {
    editor.commands.hideAiCursor();
  }
}
