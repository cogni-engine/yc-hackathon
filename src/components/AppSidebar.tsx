'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Plug, Slack } from 'lucide-react';
import { NotesList } from '@/features/notes/NotesList';

const tabs = [
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/integrations', label: 'Integrations', icon: Plug },
];

function isActiveTab(pathname: string, href: string) {
  if (href === '/notes') return pathname === '/' || pathname.startsWith('/notes');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function IntegrationsPanel() {
  return (
    <div className='px-2 pb-3'>
      <div className='rounded-md border border-border-default bg-surface-primary p-3'>
        <div className='flex items-center gap-2'>
          <div className='inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-text-primary'>
            <Slack className='size-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-text-primary'>
              Slack
            </div>
            <div className='truncate text-xs text-text-muted'>
              Workspace messages
            </div>
          </div>
        </div>
        <button
          type='button'
          className='mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-text-primary px-3 text-sm font-medium text-surface-primary transition-colors hover:opacity-90'
        >
          Connect
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const showIntegrations = pathname.startsWith('/integrations');

  return (
    <aside className='flex w-64 shrink-0 flex-col border-r border-border-default bg-surface-primary'>
      <Link
        href='/'
        className='px-3 pt-3 text-lg font-semibold text-text-primary'
      >
        Pillow
      </Link>
      <nav className='grid grid-cols-2 gap-1 px-2 py-3'>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActiveTab(pathname, tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
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
        {showIntegrations ? <IntegrationsPanel /> : <NotesList />}
      </div>
    </aside>
  );
}
