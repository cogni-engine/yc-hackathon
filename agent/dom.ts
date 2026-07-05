import { JSDOM } from 'jsdom';

/**
 * Install a jsdom window as the global DOM so TipTap / ProseMirror can run
 * headless in Node. Must be called BEFORE any @tiptap/* or prosemirror-*
 * module is imported (they sniff `navigator`/`document` at module load), so
 * the entrypoint calls this first and then `import()`s the rest dynamically.
 *
 * Same pattern cogno-core uses for its server-side markdown converter.
 */
export function installDom(): void {
  if ((globalThis as { __agentDomInstalled?: boolean }).__agentDomInstalled) {
    return;
  }

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
    // Gives us requestAnimationFrame & friends.
    pretendToBeVisual: true,
  });
  const { window } = dom;

  const define = (key: string, value: unknown) => {
    // Node 21+ ships some of these (navigator) as readonly getters on
    // globalThis — plain assignment throws, defineProperty replaces cleanly.
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  };

  define('window', window);
  define('document', window.document);
  define('navigator', window.navigator);

  // Everything ProseMirror's view/model layer touches at runtime.
  const bridged = [
    'Element',
    'HTMLElement',
    'SVGElement',
    'Text',
    'Comment',
    'Node',
    'Document',
    'DocumentFragment',
    'DOMParser',
    'XMLSerializer',
    'MutationObserver',
    'Range',
    'CustomEvent',
    'Event',
    'KeyboardEvent',
    'MouseEvent',
    'InputEvent',
    'ClipboardEvent',
    'CompositionEvent',
    'DragEvent',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'getSelection',
  ] as const;

  for (const key of bridged) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined && (globalThis as Record<string, unknown>)[key] === undefined) {
      define(key, typeof value === 'function' ? (value as CallableFunction).bind(window) : value);
    }
  }

  (globalThis as { __agentDomInstalled?: boolean }).__agentDomInstalled = true;
}
