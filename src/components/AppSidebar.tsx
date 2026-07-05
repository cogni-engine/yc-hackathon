'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, FileText, PencilRuler, Plug } from 'lucide-react';
import { NotesList } from '@/features/notes/NotesList';
import { integrationTools } from '@/features/integrations/tools';

const tabs = [
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/mermaid', label: 'Diagrams', icon: PencilRuler },
];

function isActiveTab(pathname: string, href: string) {
  if (href === '/notes') {
    return pathname === '/' || pathname.startsWith('/notes');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Quiet integrations entry: a single collapsed "Integrations" row; expanding
 * reveals a muted preview of a few tools (Slack etc.) plus a link to the
 * full page — the tool list shouldn't compete with the notes.
 */
function SidebarIntegrations({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const preview = integrationTools.slice(0, 5);
  // Mock connection state for the demo — the first few read as already wired.
  const connected = new Set(integrationTools.slice(0, 4).map(t => t.name));

  return (
    <nav className='px-2 pb-1'>
      <button
        type='button'
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          active
            ? 'bg-surface-secondary text-text-primary'
            : 'text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
        }`}
      >
        <Plug className='size-3.5 shrink-0' />
        <span className='min-w-0 flex-1 truncate text-left'>Integrations</span>
        <ChevronRight
          className={`size-3.5 shrink-0 opacity-60 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>
      {open && (
        <div className='mt-1 space-y-0.5 pl-2'>
          {preview.map(tool => {
            const Icon = tool.Icon;
            return (
              <Link
                key={tool.name}
                href='/integrations'
                className='flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-[13px] text-text-secondary transition-colors hover:bg-interactive-hover hover:text-text-primary'
              >
                <span className='inline-flex size-4 shrink-0 items-center justify-center'>
                  <Icon className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1 truncate'>{tool.name}</span>
                {connected.has(tool.name) && (
                  <span className='shrink-0 rounded-full border border-border-default px-1.5 py-px text-[10px] leading-4 text-text-secondary opacity-70'>
                    Connected
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href='/integrations'
            className='flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-text-secondary transition-colors hover:bg-interactive-hover hover:text-text-primary'
          >
            <span className='inline-flex size-4 shrink-0 items-center justify-center'>
              …
            </span>
            <span>View all</span>
          </Link>
        </div>
      )}
    </nav>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const integrationsActive = isActiveTab(pathname, '/integrations');

  return (
    <aside className='flex w-64 shrink-0 flex-col border-r border-border-default bg-surface-primary'>
      <Link
        href='/'
        className='px-3 pt-3 text-lg font-semibold text-text-primary'
      >
        Pillow
      </Link>
      <nav className='px-2 py-3'>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActiveTab(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-surface-secondary text-text-primary'
                  : 'text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
              }`}
            >
              <Icon className='size-3.5 shrink-0' />
              <span className='min-w-0 truncate'>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      <SidebarIntegrations active={integrationsActive} />
      <div className='min-h-0 flex-1 border-t border-border-default'>
        <NotesList />
      </div>
    </aside>
  );
}
