'use client';

// Per-browser identity for cursor labels only. No auth — this does not gate
// access to anything. Stored in localStorage: a stable id + an editable name.

const ID_KEY = 'pillow_client_id';
const NAME_KEY = 'pillow_display_name';

export function getDisplayName(): { id: string; name: string } {
  if (typeof window === 'undefined') return { id: 'anon', name: 'Guest' };
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    localStorage.setItem(ID_KEY, id);
  }
  const name = localStorage.getItem(NAME_KEY) || `Guest ${id.slice(0, 4)}`;
  return { id, name };
}

export function setDisplayName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim());
}
