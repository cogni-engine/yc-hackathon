import { getQueryLog } from '@/lib/gbrain';

export const runtime = 'nodejs';

// Recent gbrain queries (AI + manual) for the /gbrain dev page.
export async function GET() {
  return Response.json({ entries: getQueryLog() });
}
