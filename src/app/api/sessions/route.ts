import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';
import { CreateSessionSchema } from '@/lib/api/validate';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * POST /api/sessions
 *
 * Creates a new session (friendly match or tournament) for the authenticated user.
 * The request body must conform to `CreateSessionSchema`. On success, returns
 * the session code, join URL and join token. The join token should not be
 * exposed to untrusted clients; it is returned here for convenience.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) {
      // Flatten Zod errors into a single message
      const message = parsed.error.errors.map((e) => e.message).join('; ');
      return fail('bad_request', message, 400);
    }
    const input = parsed.data;

    // Ensure the request is authenticated (host must be logged in)
    const userId = getUserIdFromRequest(req);
    if (!userId) return fail('unauthorized', 'Authentication required', 401);

    // Insert the new session. team_filter and t_format are optional.
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        owner_id: userId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        icon_url: input.iconUrl ?? null,
        team_filter: input.teamFilter ?? {},
        t_format: input.tFormat ?? null,
        min_players: input.minPlayers ?? 2,
        max_players: input.maxPlayers ?? 32,
      })
      .select('id, code, join_token, type')
      .single();
    if (error) return fail('db_insert_failed', error.message, 500);

    // Automatically add the host as the first player in the session. We use a
    // generic display name "Host"; clients can later allow the host to edit
    // their display name via a profile or settings page.
    // Insert will pass RLS because the host is the session owner.
    const hostInsert = await supabase.from('session_players').insert({
      session_id: data.id,
      display_name: 'Host',
      join_token: data.join_token,
      user_id: userId,
    });
    // Even if this insert fails, we ignore the error and continue; failure
    // only means the host already exists or RLS prevented the insert.

    // Construct join URL based on the session type
    const joinPath = data.type === 'friendly' ? 'game' : 'tournament';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    return ok({
      code: data.code,
      join_url: `${baseUrl}/${joinPath}/${data.code}`,
      join_token: data.join_token,
    }, 201);
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}