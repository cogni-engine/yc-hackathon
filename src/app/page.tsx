'use client';

import dynamic from 'next/dynamic';

// The collaborative editor relies on websockets and browser APIs — client only.
const CanvasEditor = dynamic(
  () => import('@/features/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
);

// The landing page IS the canvas. Everyone lands in the same shared room; open
// two tabs (or share the URL) to edit live together. Named rooms still live at
// /canvas/<room>.
const DEFAULT_ROOM = 'main';

export default function Home() {
  return (
    <main className='mx-auto min-h-screen w-full max-w-3xl px-6 py-10'>
      <CanvasEditor room={DEFAULT_ROOM} />
    </main>
  );
}
