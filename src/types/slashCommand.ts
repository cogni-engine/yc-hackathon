import type { Editor, Range } from '@tiptap/core';
import type { ComponentType } from 'react';

/** A single entry in the slash (/) menu. */
export interface SlashCommandItem {
  title: string;
  description?: string;
  /** Lucide icon or a text-glyph component; rendered with a `className`. */
  icon: ComponentType<{ className?: string }>;
  /** Group key used to draw dividers between sections in the menu. */
  group?: string;
  /** Extra terms used to match the typed query. */
  keywords?: string[];
  /** Runs the block insertion against the editor at the slash range. */
  command: (props: { editor: Editor; range: Range }) => void;
}
