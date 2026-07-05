export type AiEditOccurrence = 'first' | 'last' | 'all';

export type AiCursorAnchor =
  | 'selection'
  | 'document_start'
  | 'document_end';

export type AiEditStep =
  | {
      tool: 'show_cursor';
      anchor?: AiCursorAnchor;
      position?: number;
    }
  | {
      tool: 'move_cursor';
      anchor?: AiCursorAnchor;
      position?: number;
    }
  | {
      tool: 'insert_markdown';
      markdown: string;
      anchor?: AiCursorAnchor;
      position?: number;
    }
  | {
      tool: 'append_markdown';
      markdown: string;
    }
  | {
      tool: 'replace_text';
      target: string;
      replacement: string;
      occurrence?: AiEditOccurrence;
    }
  | {
      tool: 'replace_selection';
      markdown: string;
    }
  | {
      tool: 'delete_text';
      target: string;
      occurrence?: AiEditOccurrence;
    }
  | {
      tool: 'hide_cursor';
    };

export interface AiEditResponse {
  steps: AiEditStep[];
}

const OCCURRENCES: ReadonlySet<string> = new Set(['first', 'last', 'all']);
const ANCHORS: ReadonlySet<string> = new Set([
  'selection',
  'document_start',
  'document_end',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOccurrence(value: unknown): AiEditOccurrence | undefined {
  return typeof value === 'string' && OCCURRENCES.has(value)
    ? (value as AiEditOccurrence)
    : undefined;
}

function readAnchor(value: unknown): AiCursorAnchor | undefined {
  return typeof value === 'string' && ANCHORS.has(value)
    ? (value as AiCursorAnchor)
    : undefined;
}

function readPosition(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value)
    : undefined;
}

export function normalizeAiEditSteps(value: unknown): AiEditStep[] {
  const rawSteps = Array.isArray(value)
    ? value
    : isObject(value) && Array.isArray(value.steps)
      ? value.steps
      : [];

  const steps: AiEditStep[] = [];

  for (const rawStep of rawSteps) {
    if (!isObject(rawStep) || typeof rawStep.tool !== 'string') continue;

    switch (rawStep.tool) {
      case 'show_cursor':
      case 'move_cursor':
        steps.push({
          tool: rawStep.tool,
          anchor: readAnchor(rawStep.anchor),
          position: readPosition(rawStep.position),
        });
        break;

      case 'insert_markdown':
        if (typeof rawStep.markdown !== 'string' || !rawStep.markdown.trim()) {
          break;
        }
        steps.push({
          tool: 'insert_markdown',
          markdown: rawStep.markdown,
          anchor: readAnchor(rawStep.anchor),
          position: readPosition(rawStep.position),
        });
        break;

      case 'append_markdown':
        if (typeof rawStep.markdown !== 'string' || !rawStep.markdown.trim()) {
          break;
        }
        steps.push({
          tool: 'append_markdown',
          markdown: rawStep.markdown,
        });
        break;

      case 'replace_text':
        if (
          typeof rawStep.target !== 'string' ||
          !rawStep.target ||
          typeof rawStep.replacement !== 'string'
        ) {
          break;
        }
        steps.push({
          tool: 'replace_text',
          target: rawStep.target,
          replacement: rawStep.replacement,
          occurrence: readOccurrence(rawStep.occurrence),
        });
        break;

      case 'replace_selection':
        if (typeof rawStep.markdown !== 'string' || !rawStep.markdown.trim()) {
          break;
        }
        steps.push({
          tool: 'replace_selection',
          markdown: rawStep.markdown,
        });
        break;

      case 'delete_text':
        if (typeof rawStep.target !== 'string' || !rawStep.target) {
          break;
        }
        steps.push({
          tool: 'delete_text',
          target: rawStep.target,
          occurrence: readOccurrence(rawStep.occurrence),
        });
        break;

      case 'hide_cursor':
        steps.push({ tool: 'hide_cursor' });
        break;
    }
  }

  return steps;
}
