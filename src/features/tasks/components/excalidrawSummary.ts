/**
 * Distill a stored Excalidraw scene into a compact, LLM-readable text digest.
 *
 * The editor's plain-text mirror (`taskDescriptionMirrorText`) is the only
 * representation of a task description that reaches the LLM — the raw Y.Doc /
 * scene JSON never does. An Excalidraw node is an atom with no children, so
 * without this it serializes to an empty string and the drawing is invisible to
 * the model. This turns the scene into the text the user effectively "wrote" on
 * the canvas: the labels inside shapes, free-standing text, and the arrows that
 * connect them — plus a short census of the non-text marks (freehand, images)
 * so the model knows there's visual content it can't fully read.
 *
 * Deliberately lossy: this is context for the LLM, NOT a persistence format. The
 * full scene still lives in the node's `scene` attribute / Y.Doc for redrawing.
 */

/** Permissive view of an Excalidraw element — the scene JSON is untrusted. */
interface SceneElement {
  type?: string;
  id?: string;
  text?: string;
  containerId?: string | null;
  isDeleted?: boolean;
  startBinding?: { elementId?: string } | null;
  endBinding?: { elementId?: string } | null;
}

interface StoredScene {
  elements?: readonly SceneElement[];
}

const HEAD = 'Excalidraw drawing';

const plural = (n: number, noun: string): string =>
  `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * @param raw - the node's `scene` attribute (a JSON string), or null/undefined.
 * @returns a bracketed, multi-line digest, e.g.
 *   [Excalidraw drawing]
 *   Text: "Q3 plan"
 *   Shapes: rectangle "User", diamond "Auth?", rectangle "Dashboard"
 *   Connections: "User" → "Auth?"; "Auth?" →(ok) "Dashboard"
 *   Other: 2 freehand strokes
 * Empty / unparseable scenes collapse to `[Excalidraw drawing (empty)]`.
 */
export function summarizeExcalidrawScene(
  raw: string | null | undefined
): string {
  let elements: readonly SceneElement[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredScene;
      if (Array.isArray(parsed?.elements)) elements = parsed.elements;
    } catch {
      // Malformed scene → treat as empty rather than throwing in the serializer.
    }
  }

  const live = elements.filter(el => el && !el.isDeleted);
  if (live.length === 0) return `[${HEAD} (empty)]`;

  // A text element bound to a shape or arrow (containerId set) is that element's
  // label; an unbound text element is free-standing text the user typed.
  const labelById = new Map<string, string>();
  const freeText: string[] = [];
  for (const el of live) {
    if (el.type === 'text' && el.text && el.text.trim()) {
      const text = el.text.trim().replace(/\s+/g, ' ');
      if (el.containerId) labelById.set(String(el.containerId), text);
      else freeText.push(text);
    }
  }
  const labelFor = (id: string | undefined): string | null =>
    id ? (labelById.get(String(id)) ?? null) : null;

  const shapes: string[] = [];
  const connections: string[] = [];
  let freedraw = 0;
  let images = 0;
  let other = 0;

  for (const el of live) {
    switch (el.type) {
      case 'text':
        break; // already consumed above
      case 'rectangle':
      case 'ellipse':
      case 'diamond': {
        const label = labelFor(el.id);
        shapes.push(label ? `${el.type} "${label}"` : el.type);
        break;
      }
      case 'arrow':
      case 'line': {
        const from = labelFor(el.startBinding?.elementId);
        const to = labelFor(el.endBinding?.elementId);
        const via = labelFor(el.id);
        // Only call it a connection if it actually binds a labelled shape;
        // a bare line/arrow is just a mark.
        if (from || to) {
          connections.push(
            `"${from ?? '?'}" ${via ? `→(${via})` : '→'} "${to ?? '?'}"`
          );
        } else {
          other += 1;
        }
        break;
      }
      case 'freedraw':
        freedraw += 1;
        break;
      case 'image':
        images += 1;
        break;
      default:
        other += 1;
    }
  }

  const lines: string[] = [`[${HEAD}]`];
  if (freeText.length) {
    lines.push(`Text: ${freeText.map(t => `"${t}"`).join(', ')}`);
  }
  if (shapes.length) lines.push(`Shapes: ${shapes.join(', ')}`);
  if (connections.length) {
    lines.push(`Connections: ${connections.join('; ')}`);
  }
  const extras: string[] = [];
  if (freedraw) extras.push(plural(freedraw, 'freehand stroke'));
  if (images) extras.push(plural(images, 'image'));
  if (other) extras.push(plural(other, 'other shape'));
  if (extras.length) lines.push(`Other: ${extras.join(', ')}`);

  // Only non-text marks (e.g. a pure freehand sketch) → one-line census.
  if (lines.length === 1) {
    return `[${HEAD}: ${extras.join(', ') || 'empty'}]`;
  }
  return lines.join('\n');
}
