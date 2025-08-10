import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';
import { JoinGuestSchema } from '@/lib/api/validate';

/**
 * POST /api/sessions/[code]/join
 *
 * Allows a guest (unregistered user) to join a session by providing a display
 * name. The session must exist and cannot be full. Guests do not need to
 * authenticate; the server uses the session's `join_token` to satisfy the
 * RLS policy when inserting into `session_players`.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    const body = await req.json().catch(() => ({}));
    const parsed = JoinGuestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join('; ');
      return fail('bad_request', message, 400);
    }
    const { displayName } = parsed.data;

    // Fetch session id, join_token and max_players
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('id, join_token, max_players')
      .eq('code', params.code)
      .single();
    if (sessErr || !session) return fail('not_found', 'Session not found', 404);

    // Check if capacity reached
    const { count, error: cntErr } = await supabase
      .from('session_players')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);
    if (cntErr) return fail('db_error', cntErr.message, 500);
    if (typeof count === 'number' && session.max_players && count >= session.max_players) {
      return fail('capacity_reached', 'This session is full', 409);
    }

    // Attempt to insert the guest. RLS policy ensures join_token matches.
    const { error: insertErr } = await supabase
      .from('session_players')
      .insert({
        session_id: session.id,
        display_name: displayName,
        join_token: session.join_token,
      });
    if (insertErr) {
      const msg = insertErr.message.includes('unique constraint')
        ? 'Display name already taken'
        : insertErr.message;
      return fail('insert_failed', msg, 400);
    }
    return ok({ joined: true }, 201);
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}