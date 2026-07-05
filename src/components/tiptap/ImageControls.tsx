'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download, Maximize2, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';

interface TargetImage {
  el: HTMLImageElement;
  src: string;
  alt: string;
}

// The editor view is torn down and rebuilt across StrictMode double-invokes and
// remounts; `editor.view.*` throws in those windows. Guard every access.
function safeViewDom(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null;
  try {
    return editor.view.dom as HTMLElement;
  } catch {
    return null;
  }
}

/**
 * Hover controls + click-to-expand preview for editor images, mirroring the
 * Mermaid diagram lightbox. Renders nothing inline — it attaches delegated
 * listeners to the editor DOM so it works for every `img.editor-image`
 * (including attachment images whose `src` is resolved imperatively elsewhere)
 * without touching the collaborative schema. A floating toolbar with Expand and
 * Download buttons follows the hovered image.
 */
export function ImageControls({ editor }: { editor: Editor | null }) {
  const [hovered, setHovered] = useState<TargetImage | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(
    null
  );
  const hideTimer = useRef<number | null>(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setHovered(null), 120);
  }, [cancelHide]);

  // Detect which image the pointer is over, and open the preview on click.
  useEffect(() => {
    if (!editor) return;

    function imageFrom(event: MouseEvent): HTMLImageElement | null {
      const target = event.target as HTMLElement | null;
      const img = target?.closest<HTMLImageElement>('img.editor-image');
      // Ignore images that have not resolved a source yet (e.g. attachment
      // placeholders still loading).
      return img && img.currentSrc ? img : null;
    }

    function handleOver(event: MouseEvent) {
      const img = imageFrom(event);
      if (img) {
        cancelHide();
        setHovered({ el: img, src: img.currentSrc, alt: img.alt || '' });
        setRect(img.getBoundingClientRect());
      } else {
        scheduleHide();
      }
    }

    function handleMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;
      const img = imageFrom(event);
      if (!img) return;
      event.preventDefault();
      event.stopPropagation();
      setPreview({ src: img.currentSrc, alt: img.alt || '' });
    }

    // The view may not be mounted yet (or may be rebuilt). Attach to the live
    // DOM now if it's ready, and re-attach whenever the view is (re)created.
    let attached: HTMLElement | null = null;
    const attach = () => {
      if (attached) return;
      const dom = editor ? safeViewDom(editor) : null;
      if (!dom) return;
      dom.addEventListener('mouseover', handleOver);
      dom.addEventListener('mousedown', handleMouseDown, true);
      attached = dom;
    };
    const detach = () => {
      if (!attached) return;
      attached.removeEventListener('mouseover', handleOver);
      attached.removeEventListener('mousedown', handleMouseDown, true);
      attached = null;
    };
    const reattach = () => {
      detach();
      attach();
    };

    attach();
    editor.on('create', reattach);
    return () => {
      editor.off('create', reattach);
      detach();
    };
  }, [editor, cancelHide, scheduleHide]);

  // Keep the toolbar pinned to the image as the page scrolls or resizes.
  useEffect(() => {
    if (!hovered) return;
    function reposition() {
      setRect(hovered!.el.getBoundingClientRect());
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [hovered]);

  const handleDownload = useCallback(async (src: string, alt: string) => {
    const filename = alt?.trim() || 'image';
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Cross-origin or network failure — fall back to opening the image.
      window.open(src, '_blank', 'noopener');
    }
  }, []);

  return (
    <>
      {hovered &&
        rect &&
        createPortal(
          <div
            className='fixed z-[60] flex gap-1'
            style={{
              top: rect.top + 8,
              left: rect.right - 8,
              transform: 'translateX(-100%)',
            }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <button
              type='button'
              title='Expand'
              aria-label='Expand image'
              className='rounded-md border border-white/15 bg-black/60 p-1.5 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
              onClick={() => setPreview({ src: hovered.src, alt: hovered.alt })}
            >
              <Maximize2 className='h-4 w-4' />
            </button>
            <button
              type='button'
              title='Download'
              aria-label='Download image'
              className='rounded-md border border-white/15 bg-black/60 p-1.5 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
              onClick={() => handleDownload(hovered.src, hovered.alt)}
            >
              <Download className='h-4 w-4' />
            </button>
          </div>,
          document.body
        )}
      {preview && (
        <ImageExpandedDialog
          src={preview.src}
          alt={preview.alt}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

function ImageExpandedDialog({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <h2 id={titleId} className='sr-only'>
        {alt || 'Expanded image'}
      </h2>
      <button
        type='button'
        className='absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 p-2 text-white shadow-card transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
        onClick={event => {
          event.stopPropagation();
          onClose();
        }}
        aria-label='Close expanded image'
      >
        <X className='h-5 w-5' />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className='max-h-[92vh] max-w-[min(1400px,96vw)] cursor-zoom-out rounded-2xl border border-white/15 object-contain shadow-2xl'
        onClick={event => event.stopPropagation()}
        onDoubleClick={onClose}
      />
    </div>,
    document.body
  );
}
