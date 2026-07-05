'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, PencilRuler, Plug } from 'lucide-react';
import { NotesList } from '@/features/notes/NotesList';

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
      <div className='min-h-0 flex-1'>
        <NotesList />
      </div>
      <nav className='border-t border-border-default px-2 py-3'>
        <Link
          href='/integrations'
          className={`flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
            integrationsActive
              ? 'bg-surface-secondary text-text-primary'
              : 'text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
          }`}
        >
          <Plug className='size-3.5 shrink-0' />
          <span className='min-w-0 truncate'>Integrations</span>
        </Link>
      </nav>
    </aside>
  );
}
