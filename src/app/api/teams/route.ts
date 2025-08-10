import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';

/**
 * GET /api/teams
 *
 * Optional query parameter `ids` may contain a comma-separated list of team
 * IDs. If provided, only those teams will be returned. Otherwise, all teams
 * will be returned. This endpoint is useful for clients that need to
 * resolve team names or icons given their IDs (e.g. when showing a match
 * result).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      // Parse comma-separated IDs into a number array
      const ids = idsParam
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((n) => !isNaN(n));
      if (ids.length === 0) return ok([]);
      const { data, error } = await supabase.from('teams').select('*').in('id', ids);
      if (error) return fail('db_error', error.message, 500);
      return ok(data);
    }
    // No ids specified: return all teams
    const { data, error } = await supabase.from('teams').select('*');
    if (error) return fail('db_error', error.message, 500);
    return ok(data);
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}