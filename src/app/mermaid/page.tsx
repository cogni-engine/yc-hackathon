'use client';

import { PencilRuler } from 'lucide-react';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { MERMAID_CATEGORIES } from './examples';

export default function MermaidGalleryPage() {
  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-8'>
      <header className='flex flex-col gap-2'>
        <div className='flex items-center gap-2 text-text-primary'>
          <PencilRuler className='size-6' />
          <h1 className='text-2xl font-semibold'>Mermaid gallery</h1>
        </div>
        <p className='max-w-2xl text-sm text-text-secondary'>
          The full breadth of what Mermaid 11 can draw, rendered with the app&apos;s
          polished theme. Every block below is live Mermaid source — the same
          renderer powers <code className='text-text-primary'>```mermaid</code>{' '}
          code blocks in your notes.
        </p>
      </header>

      {MERMAID_CATEGORIES.map(category => (
        <div key={category.id} className='flex flex-col gap-4'>
          <h2 className='text-xs font-semibold uppercase tracking-wide text-text-muted'>
            {category.title}
          </h2>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            {category.examples.map(example => (
              <article
                key={example.id}
                className='flex min-w-0 flex-col rounded-xl border border-border-default bg-surface-primary p-4'
              >
                <div className='mb-1 flex items-center gap-2'>
                  <h3 className='text-sm font-medium text-text-primary'>
                    {example.title}
                  </h3>
                  {example.beta && (
                    <span className='rounded-full border border-border-default px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted'>
                      beta
                    </span>
                  )}
                </div>
                <p className='mb-1 text-xs text-text-secondary'>
                  {example.blurb}
                </p>
                <div className='min-w-0'>
                  <MermaidDiagram code={example.code} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
