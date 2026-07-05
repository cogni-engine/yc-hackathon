'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createElement } from 'react';
import type { SlashCommandItem } from '@/types/slashCommand';
import { useModalWheelScroll } from '@/hooks/useModalWheelScroll';

export type { SlashCommandItem } from '@/types/slashCommand';

export interface SlashCommandMenuProps {
  /** Items already filtered by the suggestion's `items({ query })`. */
  items: SlashCommandItem[];
  /** Invokes the suggestion command with the chosen item. */
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SlashCommandMenuProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  const upHandler = () => {
    if (props.items.length === 0) return;
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    );
  };

  const downHandler = () => {
    if (props.items.length === 0) return;
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  // Stays scrollable even though it's portalled into the Radix modal canvas.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useModalWheelScroll(scrollContainerRef);

  const scrollRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (node) node.scrollIntoView({ block: 'nearest' });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIndex]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  // pointer-events-auto on the menu: tippy portals it to <body>, but the task
  // canvas is a Radix modal that sets body { pointer-events: none } — re-enable
  // here so scroll / hover / click work inside the dialog.
  return (
    <div className='pointer-events-auto w-56 rounded-xl border border-dropdown-border bg-popover p-1.5 text-text-primary shadow-lg'>
      <div
        ref={scrollContainerRef}
        className='max-h-[min(360px,75vh)] overflow-y-auto overscroll-contain scrollbar-hide'
      >
        {props.items.length ? (
          props.items.map((item, index) => {
            const prevGroup =
              index > 0 ? props.items[index - 1]?.group : undefined;
            const showDivider =
              index > 0 && item.group != null && item.group !== prevGroup;
            return (
              <React.Fragment key={item.title}>
                {showDivider && (
                  <div className='mx-1 my-1 border-t border-border-default/60' />
                )}
                <button
                  ref={index === selectedIndex ? scrollRef : undefined}
                  type='button'
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => selectItem(index)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-surface-secondary text-text-primary'
                      : 'text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary'
                  }`}
                >
                  {/* Plain glyph, no square box around it. */}
                  <span className='flex size-5 shrink-0 items-center justify-center text-text-muted'>
                    {createElement(item.icon, { className: 'size-4' })}
                  </span>
                  {/* Single line (title only) to match the Linear-style menu. */}
                  <span className='min-w-0 truncate text-sm font-medium text-text-primary'>
                    {item.title}
                  </span>
                </button>
              </React.Fragment>
            );
          })
        ) : (
          <div className='px-2 py-2 text-[13px] text-text-muted'>
            No results
          </div>
        )}
      </div>
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
