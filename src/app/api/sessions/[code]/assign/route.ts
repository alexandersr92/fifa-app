import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/api/response';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * POST /api/sessions/[code]/assign
 *
 * Assigns teams randomly to two players in a friendly match. Only the session owner
 * can invoke this endpoint. It filters teams according to the session's
 * stored team_filter and creates or updates a single fixture with round_name = 'R1'.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient();
    // Authenticate user (host)
    const userId = getUserIdFromRequest(req);
    if (!userId) return fail('unauthorized', 'Authentication required', 401);

    // Find the session by code
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, type, owner_id, team_filter')
      .eq('code', params.code)
      .single();
    if (sErr || !session) return fail('not_found', 'Session not found', 404);
    if (session.type !== 'friendly')
      return fail('invalid_session_type', 'Only friendly matches can assign via this endpoint', 400);
    if (session.owner_id !== userId)
      return fail('forbidden', 'Only the session owner can assign teams', 403);

    // Fetch players belonging to the session
    const { data: players } = await supabase
      .from('session_players')
      .select('id, display_name')
      .eq('session_id', session.id);
    if (!players || players.length < 2) return fail('not_enough_players', 'At least two players are required', 409);

    // Fetch teams from the catalog
    const { data: teams } = await supabase.from('teams').select('*');
    if (!teams || teams.length < 2) return fail('not_enough_teams', 'Not enough teams available', 409);

    // Filter teams according to the session's stored team_filter
    const filter = (session.team_filter || {}) as any;
    const filtered = teams.filter((t) => {
      if (filter.minStars && t.stars < filter.minStars) return false;
      if (filter.maxStars && t.stars > filter.maxStars) return false;
      if (Array.isArray(filter.countries) && filter.countries.length && !filter.countries.includes(t.country)) return false;
      return true;
    });
    if (filtered.length < 2) return fail('filter_no_teams', 'No teams match the filter', 409);

    // Shuffle helper
    const shuffle = <T>(arr: T[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };
    shuffle(players);
    shuffle(filtered);
    const [home, away] = players.slice(0, 2);
    const [team1, team2] = filtered.slice(0, 2);

    // Check if a fixture already exists for round R1
    const { data: existing } = await supabase
      .from('fixtures')
      .select('id')
      .eq('session_id', session.id)
      .eq('round_name', 'R1')
      .eq('leg', 1)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('fixtures')
        .update({
          home_player_id: home.id,
          away_player_id: away.id,
          home_team_id: team1.id,
          away_team_id: team2.id,
          status: 'assigned',
        })
        .eq('id', existing.id);
      if (updErr) return fail('db_error', updErr.message, 500);
    } else {
      const { error: insErr } = await supabase
        .from('fixtures')
        .insert({
          session_id: session.id,
          round_name: 'R1',
          leg: 1,
          position: 1,
          status: 'assigned',
          home_player_id: home.id,
          away_player_id: away.id,
          home_team_id: team1.id,
          away_team_id: team2.id,
        });
      if (insErr) return fail('db_error', insErr.message, 500);
    }

    // Respond with richer team info so the client can display abbreviated names and icons
    return ok({
      home: {
        player: home.display_name,
        teamId: team1.id,
        teamName: team1.name,
        teamShortName: team1.short_name,
        teamIconUrl: team1.icon_url,
      },
      away: {
        player: away.display_name,
        teamId: team2.id,
        teamName: team2.name,
        teamShortName: team2.short_name,
        teamIconUrl: team2.icon_url,
      },
    });
  } catch (e: any) {
    return fail('server_error', e?.message ?? 'Unexpected error', 500);
  }
}