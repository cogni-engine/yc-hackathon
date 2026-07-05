'use client';

import { AppSidebar } from '@/components/AppSidebar';

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen'>
      <AppSidebar />
      <main className='min-w-0 flex-1 overflow-y-auto'>{children}</main>
    </div>
  );
}
