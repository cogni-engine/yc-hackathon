import type { Editor } from '@tiptap/react';
import type {
  AiCursorAnchor,
  AiEditOccurrence,
  AiEditStep,
} from './aiEditSteps';

const AI_CURSOR_COLOR = '#0ea5e9';
const AI_CURSOR_NAME = 'AI';

let activeAiEditRun = 0;

interface TextRange {
  from: number;
  to: number;
}

interface RunAiEditStepsOptions {
  hideCursorOnComplete?: boolean;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function clampPos(editor: Editor, pos: number): number {
  return Math.max(0, Math.min(Math.round(pos), editor.state.doc.content.size));
}

function resolvePosition(
  editor: Editor,
  anchor?: AiCursorAnchor,
  position?: number
): number {
  if (typeof position === 'number' && Number.isFinite(position)) {
    return clampPos(editor, position);
  }

  switch (anchor) {
    case 'document_start':
      return 0;
    case 'document_end':
      return editor.state.doc.content.size;
    case 'selection':
    default:
      return editor.state.selection.from;
  }
}

function findTextRanges(editor: Editor, needle: string): TextRange[] {
  const ranges: TextRange[] = [];
  if (!needle) return ranges;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    let index = node.text.indexOf(needle);
    while (index !== -1) {
      ranges.push({
        from: pos + index,
        to: pos + index + needle.length,
      });
      index = node.text.indexOf(needle, index + 1);
    }
  });

  return ranges;
}

function pickRanges(
  ranges: TextRange[],
  occurrence: AiEditOccurrence | undefined
): TextRange[] {
  if (ranges.length === 0) return [];
  if (occurrence === 'all') return ranges;
  if (occurrence === 'last') return [ranges[ranges.length - 1]];
  return [ranges[0]];
}

async function glideCursor(
  editor: Editor,
  from: number,
  to: number,
  isActive: () => boolean
): Promise<void> {
  const start = clampPos(editor, from);
  const end = clampPos(editor, to);
  const distance = Math.abs(end - start);

  if (distance === 0) {
    editor.commands.moveAiCursor(end);
    return;
  }

  const step = start <= end ? 1 : -1;
  const stride = Math.max(1, Math.ceil(distance / 120));

  for (
    let pos = start;
    step > 0 ? pos <= end : pos >= end;
    pos += step * stride
  ) {
    if (!isActive()) return;
    editor.commands.moveAiCursor(pos);
    await wait(12);
  }

  if (isActive()) {
    editor.commands.moveAiCursor(end);
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
    await wait(35);
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
  editor.chain().focus().setTextSelection(clampPos(editor, pos)).run();

  for (const char of text) {
    if (!isActive()) return;
    editor.commands.moveAiCursor(editor.state.selection.from);
    editor.chain().focus().insertContent(char).run();
    editor.commands.moveAiCursor(editor.state.selection.from);
    await wait(35);
  }
}

async function insertMarkdownAt(
  editor: Editor,
  pos: number,
  markdown: string,
  isActive: () => boolean
): Promise<void> {
  if (!isActive()) return;

  const targetPos = clampPos(editor, pos);
  await glideCursor(editor, editor.state.selection.from, targetPos, isActive);
  if (!isActive()) return;

  editor
    .chain()
    .focus()
    .setTextSelection(targetPos)
    .insertContent(markdown, { contentType: 'markdown' })
    .run();
  editor.commands.moveAiCursor(editor.state.selection.from);
  await wait(180);
}

async function replaceRangeWithText(
  editor: Editor,
  range: TextRange,
  replacement: string,
  isActive: () => boolean
): Promise<void> {
  await glideCursor(editor, editor.state.selection.from, range.to, isActive);
  if (!isActive()) return;
  await deleteTextBackwards(editor, range.from, range.to, isActive);
  if (!isActive()) return;
  await typeTextAt(editor, range.from, replacement, isActive);
}

async function replaceSelectionWithMarkdown(
  editor: Editor,
  markdown: string,
  isActive: () => boolean
): Promise<void> {
  const { from, to } = editor.state.selection;
  await glideCursor(editor, from, to, isActive);
  if (!isActive()) return;

  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent(markdown, { contentType: 'markdown' })
    .run();
  editor.commands.moveAiCursor(editor.state.selection.from);
  await wait(180);
}

export function cancelAiEditRun(): void {
  activeAiEditRun += 1;
}

export async function runAiEditSteps(
  editor: Editor,
  steps: AiEditStep[],
  options: RunAiEditStepsOptions = {}
): Promise<void> {
  const runId = ++activeAiEditRun;
  const isActive = () => runId === activeAiEditRun && !editor.isDestroyed;
  const hideCursorOnComplete = options.hideCursorOnComplete ?? true;

  editor.commands.showAiCursor({
    pos: editor.state.selection.from,
    name: AI_CURSOR_NAME,
    color: AI_CURSOR_COLOR,
  });

  try {
    for (const step of steps) {
      if (!isActive()) return;

      switch (step.tool) {
        case 'show_cursor': {
          editor.commands.showAiCursor({
            pos: resolvePosition(editor, step.anchor, step.position),
            name: AI_CURSOR_NAME,
            color: AI_CURSOR_COLOR,
          });
          await wait(160);
          break;
        }

        case 'move_cursor': {
          await glideCursor(
            editor,
            editor.state.selection.from,
            resolvePosition(editor, step.anchor, step.position),
            isActive
          );
          break;
        }

        case 'insert_markdown': {
          await insertMarkdownAt(
            editor,
            resolvePosition(editor, step.anchor, step.position),
            step.markdown,
            isActive
          );
          break;
        }

        case 'append_markdown': {
          await insertMarkdownAt(
            editor,
            editor.state.doc.content.size,
            `\n\n${step.markdown.trim()}\n\n`,
            isActive
          );
          break;
        }

        case 'replace_text': {
          const ranges = pickRanges(
            findTextRanges(editor, step.target),
            step.occurrence
          );
          if (ranges.length === 0) {
            throw new Error(`AI target text not found: ${step.target}`);
          }

          for (const range of ranges.reverse()) {
            if (!isActive()) return;
            await replaceRangeWithText(editor, range, step.replacement, isActive);
          }
          break;
        }

        case 'replace_selection': {
          await replaceSelectionWithMarkdown(editor, step.markdown, isActive);
          break;
        }

        case 'delete_text': {
          const ranges = pickRanges(
            findTextRanges(editor, step.target),
            step.occurrence
          );
          if (ranges.length === 0) {
            throw new Error(`AI target text not found: ${step.target}`);
          }

          for (const range of ranges.reverse()) {
            if (!isActive()) return;
            await glideCursor(
              editor,
              editor.state.selection.from,
              range.to,
              isActive
            );
            await deleteTextBackwards(editor, range.from, range.to, isActive);
          }
          break;
        }

        case 'hide_cursor':
          editor.commands.hideAiCursor();
          await wait(100);
          break;
      }
    }
  } finally {
    if (hideCursorOnComplete && isActive()) {
      await wait(250);
      editor.commands.hideAiCursor();
    }
  }
}
