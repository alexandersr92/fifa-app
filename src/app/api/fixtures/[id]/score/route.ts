import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';
import { SubmitScoreSchema } from '@/lib/api/validate';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * PATCH /api/fixtures/[id]/score
 *
 * Updates the score of a given fixture. Only the owner of the parent session
 * can submit scores. The body must include home_goals and away_goals, and
 * optional penalty information. The fixture status will be set to 'finished'.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = SubmitScoreSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      return fail('bad_request', msg, 400);
    }
    const input = parsed.data;

    const supabase = createClient();
    const userId = getUserIdFromRequest(req);
    if (!userId) return fail('unauthorized', 'Authentication required', 401);

    // Retrieve the fixture and its session to verify ownership
    const { data: fixture, error: fErr } = await supabase
      .from('fixtures')
      .select('id, session_id')
      .eq('id', params.id)
      .single();
    if (fErr || !fixture) return fail('not_found', 'Fixture not found', 404);

    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('owner_id')
      .eq('id', fixture.session_id)
      .single();
    if (sErr || !session) return fail('not_found', 'Session not found', 404);
    if (session.owner_id !== userId)
      return fail('forbidden', 'Only the session owner can submit scores', 403);

    // Update the fixture with new score and mark as finished
    const { error: updErr } = await supabase
      .from('fixtures')
      .update({
        home_goals: input.home_goals,
        away_goals: input.away_goals,
        went_penalties: input.went_penalties ?? false,
        home_pen: input.home_pen ?? 0,
        away_pen: input.away_pen ?? 0,
        status: 'finished',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);
    if (updErr) return fail('db_error', updErr.message, 500);

    return ok({ updated: true });
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}