'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Make a scroll container scrollable by the mouse wheel even when it is
 * portalled inside a Radix modal (e.g. the task canvas). Radix modals use
 * react-remove-scroll, which blocks native wheel events on anything outside the
 * dialog — including popovers/menus rendered to <body> (the slash menu, the
 * canvas pill pickers, …). We scroll the element ourselves through a
 * non-passive listener (so `preventDefault` works); calling preventDefault
 * everywhere keeps it single-scroll on non-modal pages too.
 *
 * Shared by every scrollable menu so they all behave the same — see the slash
 * menu and the cmdk `CommandList`.
 */
export function useModalWheelScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      el.scrollTop += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);
}
