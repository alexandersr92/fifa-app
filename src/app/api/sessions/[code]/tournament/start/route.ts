import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';
import { StartTournamentSchema } from '@/lib/api/validate';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * POST /api/sessions/[code]/tournament/start
 *
 * Starts a tournament by generating fixtures based on a list of player-to-team
 * assignments provided in the request body. Only the session owner can
 * invoke this endpoint. It supports `league` and `single_elim` formats.
 *
 * Body: { assignments: [{ playerId: UUID, teamId: number }, ...] }
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = StartTournamentSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join('; ');
      return fail('bad_request', msg, 400);
    }
    const { assignments } = parsed.data;

    const supabase = createClient();
    // Authenticate user
    const userId = getUserIdFromRequest(req);
    if (!userId) return fail('unauthorized', 'Authentication required', 401);

    // Retrieve session by code
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, type, owner_id, t_format')
      .eq('code', params.code)
      .single();
    if (sErr || !session) return fail('not_found', 'Session not found', 404);
    if (session.type !== 'tournament')
      return fail('invalid_session_type', 'Only tournaments can start via this endpoint', 400);
    if (session.owner_id !== userId)
      return fail('forbidden', 'Only the session owner can start the tournament', 403);
    if (!session.t_format) return fail('tournament_format_not_set', 'Tournament format is not set', 400);
    const format = session.t_format as string;

    // Validate that provided players belong to the session
    const { data: players } = await supabase
      .from('session_players')
      .select('id')
      .eq('session_id', session.id);
    const playerIds = new Set(players?.map((p) => p.id));
    for (const a of assignments) {
      if (!playerIds.has(a.playerId)) {
        return fail('invalid_assignment', `Player ${a.playerId} does not belong to this session`, 400);
      }
    }

    // Persist team assignments on the players table (session_players.team_id)
    // so that the assigned team sticks across rounds and can be queried for stats.
    for (const a of assignments) {
      const { error: updErr } = await supabase
        .from('session_players')
        .update({ team_id: a.teamId })
        .eq('id', a.playerId);
      if (updErr) {
        return fail('db_error', updErr.message, 500);
      }
    }

    // Prepare fixtures array
    const fixtures: any[] = [];
    let positionCounter = 1;

    if (format === 'league') {
      /**
       * Generate a round-robin schedule (single round). Uses the circle method to
       * pair players such that everyone plays everyone once. Odd number of
       * participants leads to a bye (ignored).
       */
      // Copy assignments to avoid mutating input
      let arr = assignments.map((a) => ({ ...a }));
      const n = arr.length;
      // If odd number of players, add a bye placeholder
      let playersArr: any[] = arr;
      let m = n;
      if (n % 2 === 1) {
        playersArr = [...arr, { playerId: null, teamId: null }];
        m = playersArr.length;
      }
      const rounds = m - 1;
      for (let r = 0; r < rounds; r++) {
        const roundName = `MD${r + 1}`;
        for (let i = 0; i < m / 2; i++) {
          const home = playersArr[i];
          const away = playersArr[m - 1 - i];
          if (!home.playerId || !away.playerId) {
            continue; // skip byes
          }
          fixtures.push({
            session_id: session.id,
            round_name: roundName,
            leg: 1,
            position: positionCounter++,
            status: 'assigned',
            home_player_id: home.playerId,
            away_player_id: away.playerId,
            home_team_id: home.teamId,
            away_team_id: away.teamId,
          });
        }
        // Rotate players for next round (except first)
        const newOrder = [playersArr[0]];
        newOrder.push(playersArr[m - 1]);
        for (let i = 1; i < m - 1; i++) {
          newOrder.push(playersArr[i]);
        }
        playersArr = newOrder;
      }
    } else if (format === 'single_elim') {
      /**
       * Generate the first round of a single-elimination bracket. Players are
       * shuffled and paired; byes are automatically advanced.
       */
      const arr = [...assignments];
      // shuffle the assignments for random seeding
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      for (let i = 0; i < arr.length; i += 2) {
        const home = arr[i];
        const away = arr[i + 1];
        if (!away) {
          // Bye: skip creating a fixture; the player automatically advances
          continue;
        }
        fixtures.push({
          session_id: session.id,
          round_name: 'R1',
          leg: 1,
          position: positionCounter++,
          status: 'assigned',
          home_player_id: home.playerId,
          away_player_id: away.playerId,
          home_team_id: home.teamId,
          away_team_id: away.teamId,
        });
      }
    } else {
      return fail('unsupported_format', `Tournament format ${format} not supported`, 400);
    }

    // Delete any existing fixtures for this session (allows restarting the tournament)
    await supabase.from('fixtures').delete().eq('session_id', session.id);

    // Insert new fixtures
    if (fixtures.length > 0) {
      const { error: insErr } = await supabase.from('fixtures').insert(fixtures);
      if (insErr) return fail('db_error', insErr.message, 500);
    }

    // Update the session's started_at timestamp
    await supabase
      .from('sessions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', session.id);

    return ok({ fixturesCount: fixtures.length });
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}