'use client';

import { cn } from '@/lib/utils';

/**
 * Text-based heading glyphs (H₁ / H₂ / H₃) for the slash menu — character marks
 * rather than boxed icons, matching the Linear-style block menu. Accepts the
 * same `className` the menu passes to lucide icons so it drops in as an `icon`.
 */
function makeHeadingGlyph(level: number) {
  function HeadingGlyph({ className }: { className?: string }) {
    return (
      <span
        aria-hidden='true'
        className={cn(
          'inline-flex items-baseline justify-center font-semibold leading-none tracking-tight',
          className
        )}
      >
        <span className='text-[13px]'>H</span>
        <span className='text-[9px]'>{level}</span>
      </span>
    );
  }
  HeadingGlyph.displayName = `Heading${level}Glyph`;
  return HeadingGlyph;
}

export const Heading1Glyph = makeHeadingGlyph(1);
export const Heading2Glyph = makeHeadingGlyph(2);
export const Heading3Glyph = makeHeadingGlyph(3);
