// Host management page for a friendly match. The host can see the list
// of players that have joined, assign random teams according to the
// configured filters, register the match result and start a new game.

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabaseClient';

interface SessionInfo {
  id: string;
  title: string;
  team_filter: any;
  code: string;
}
interface Player {
  id: string;
  display_name: string;
  team_id?: number | null;
}
interface Team {
  id: number;
  name: string;
  short_name: string;
  icon_url: string | null;
}
interface Fixture {
  /** Unique identifier for this fixture */
  id: string;
  /** Round name (e.g. "R1") */
  round_name: string;
  /** Leg number (for home/away) */
  leg: number;
  /** Position for ordering */
  position: number;
  /** Current status: pending, assigned, in_progress, finished */
  status: string;
  /** Nested home player with id and display_name */
  home_player: { id: string; display_name: string } | null;
  /** Nested away player with id and display_name */
  away_player: { id: string; display_name: string } | null;
  /** Nested home team with name, short_name and icon */
  home_team: { id: number; name: string; short_name: string; icon_url: string | null } | null;
  /** Nested away team with name, short_name and icon */
  away_team: { id: number; name: string; short_name: string; icon_url: string | null } | null;
  /** Goals scored by home */
  home_goals: number;
  /** Goals scored by away */
  away_goals: number;
  /** Whether match went to penalties */
  went_penalties: boolean;
  /** Penalty goals home */
  home_pen: number;
  /** Penalty goals away */
  away_pen: number;
}
interface PlayerStat {
  player_id: string;
  display_name: string;
  games_played: number;
  wins: number;
  goals_for: number;
  goals_against: number;
}

export default function HostGamePage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : params.code as string;
  const router = useRouter();
  const { session, user, loading } = useAuth();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixture, setFixture] = useState<Fixture | null>(null);
  // We no longer maintain a teamMap because fixtures include nested team objects
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeGoals, setHomeGoals] = useState('');
  const [awayGoals, setAwayGoals] = useState('');
  const [homePen, setHomePen] = useState('');
  const [awayPen, setAwayPen] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Automatically assign teams when two players have joined and no fixture exists.
  // This effect runs whenever the list of players or fixture changes. If there
  // are at least two players, no fixture is present and we're not currently
  // assigning, trigger the assignment. This saves the host from needing to
  // press the button manually for the initial match. Subsequent matches can
  // still be triggered via the "Nuevo partido" button.
  useEffect(() => {
    if (players.length >= 2 && !fixture && !assigning) {
      // We call assignTeams without awaiting; any errors will be handled
      // internally and surfaced via the error state. The host must be logged
      // in; if not, assignTeams will redirect to login.
      assignTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, fixture]);

  // Fetch session info, players, fixture and stats
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch session details
        const res = await fetch(`/api/sessions/${code}`);
        const json = await res.json();
        if (res.ok) {
          setSessionInfo(json.data as SessionInfo);
          setPlayers(json.data.players as Player[]);
        }
        // Fetch fixture (includes nested player and team info)
        const resFix = await fetch(`/api/sessions/${code}/fixtures`);
        const jsonFix = await resFix.json();
        if (resFix.ok) {
          const fixtures = jsonFix.data as Fixture[];
          setFixture(fixtures.length > 0 ? fixtures[0] : null);
        }
        // Fetch player stats
        const resStats = await fetch(`/api/sessions/${code}/stats`);
        const jsonStats = await resStats.json();
        if (resStats.ok) {
          setStats(jsonStats.data as PlayerStat[]);
        }
      } catch {
        // ignore
      }
      setLoadingData(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /**
   * We no longer fetch teams separately because the fixture
   * endpoint returns nested `home_team` and `away_team` objects
   * with name, short_name and icon_url. Keeping this effect
   * would trigger unnecessary requests, so it has been removed.
   */

  // Helper to find player by id
  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.display_name || '';

  // Assign random teams to players
  const assignTeams = async () => {
    setError(null);
    setAssigning(true);
    try {
      if (!session && !loading) {
        router.push('/login');
        return;
      }
      const token = session?.access_token;
      const res = await fetch(`/api/sessions/${code}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok) {
        // Refresh fixture
        const resFix = await fetch(`/api/sessions/${code}/fixtures`);
        const jsonFix = await resFix.json();
        if (resFix.ok) {
          const fixtures = jsonFix.data as Fixture[];
          setFixture(fixtures.length > 0 ? fixtures[0] : null);
        }
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'No se pudo asignar equipos';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado al asignar');
    } finally {
      setAssigning(false);
    }
  };

  // Submit match result
  const submitScore = async () => {
    if (!fixture) return;
    setSubmittingScore(true);
    setError(null);
    try {
      if (!session && !loading) {
        router.push('/login');
        return;
      }
      const token = session?.access_token;
      const payload: any = {
        home_goals: parseInt(homeGoals, 10) || 0,
        away_goals: parseInt(awayGoals, 10) || 0,
      };
      // Include penalties if set
      if (homePen || awayPen) {
        payload.went_penalties = true;
        payload.home_pen = parseInt(homePen, 10) || 0;
        payload.away_pen = parseInt(awayPen, 10) || 0;
      }
      const res = await fetch(`/api/fixtures/${fixture.id}/score`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        // Refresh fixture and stats
        const resFix = await fetch(`/api/sessions/${code}/fixtures`);
        const jsonFix = await resFix.json();
        if (resFix.ok) {
          const fixtures = jsonFix.data as Fixture[];
          setFixture(fixtures.length > 0 ? fixtures[0] : null);
        }
        const resStats = await fetch(`/api/sessions/${code}/stats`);
        const jsonStats = await resStats.json();
        if (resStats.ok) {
          setStats(jsonStats.data as PlayerStat[]);
        }
        setHomeGoals('');
        setAwayGoals('');
        setHomePen('');
        setAwayPen('');
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'No se pudo registrar el marcador';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado al registrar el marcador');
    } finally {
      setSubmittingScore(false);
    }
  };

  // Copy share link to clipboard
  const copyLink = () => {
    const url = `${window.location.origin}/game/${code}`;
    navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');
  };

  // Render scoreboard input or final scores depending on fixture status.
  // We display nested team names and icons along with player names.
  const renderFixtureCard = () => {
    if (!fixture) return null;
    const homePlayerName = fixture.home_player?.display_name || '';
    const awayPlayerName = fixture.away_player?.display_name || '';
    const homeTeamShort = fixture.home_team?.short_name || '';
    const awayTeamShort = fixture.away_team?.short_name || '';
    const homeTeamIcon = fixture.home_team?.icon_url || '';
    const awayTeamIcon = fixture.away_team?.icon_url || '';
    return (
      <div className="bg-card p-4 rounded-md space-y-2">
        {/* Team info row */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col items-center flex-1">
            {homeTeamIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={homeTeamIcon} alt={homeTeamShort} className="w-10 h-10 object-contain mb-1" />
            )}
            <span className="text-sm font-medium uppercase tracking-wide">{homeTeamShort}</span>
            <span className="text-xs text-text-muted">{homePlayerName}</span>
          </div>
          <span className="flex-shrink-0 px-2">vs</span>
          <div className="flex flex-col items-center flex-1">
            {awayTeamIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={awayTeamIcon} alt={awayTeamShort} className="w-10 h-10 object-contain mb-1" />
            )}
            <span className="text-sm font-medium uppercase tracking-wide">{awayTeamShort}</span>
            <span className="text-xs text-text-muted">{awayPlayerName}</span>
          </div>
        </div>
        {/* Score or input section */}
        {fixture.status === 'assigned' || fixture.status === 'in_progress' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Goles local"
                value={homeGoals}
                onChange={(e) => setHomeGoals(e.target.value)}
                className="bg-surface border border-gray-700 rounded p-2 flex-1 text-text placeholder-gray-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Goles visitante"
                value={awayGoals}
                onChange={(e) => setAwayGoals(e.target.value)}
                className="bg-surface border border-gray-700 rounded p-2 flex-1 text-text placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Penales local (opcional)"
                value={homePen}
                onChange={(e) => setHomePen(e.target.value)}
                className="bg-surface border border-gray-700 rounded p-2 flex-1 text-text placeholder-gray-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Penales visitante (opcional)"
                value={awayPen}
                onChange={(e) => setAwayPen(e.target.value)}
                className="bg-surface border border-gray-700 rounded p-2 flex-1 text-text placeholder-gray-500 focus:outline-none"
              />
            </div>
            <button
              onClick={submitScore}
              disabled={submittingScore}
              className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-2 rounded w-full mt-2"
            >
              Registrar marcador
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-semibold">{fixture.home_goals} - {fixture.away_goals}</p>
            {fixture.went_penalties && (
              <p className="text-sm text-text-muted">Penales: {fixture.home_pen} - {fixture.away_pen}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Stats list
  const renderStats = () => {
    if (stats.length === 0) return null;
    return (
      <div className="bg-card p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1">Jugador</th>
              <th className="py-1 text-center">PJ</th>
              <th className="py-1 text-center">PG</th>
              <th className="py-1 text-center">GF</th>
              <th className="py-1 text-center">GC</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.player_id} className="border-t border-gray-700">
                <td className="py-1">{s.display_name}</td>
                <td className="py-1 text-center">{s.games_played}</td>
                <td className="py-1 text-center">{s.wins}</td>
                <td className="py-1 text-center">{s.goals_for}</td>
                <td className="py-1 text-center">{s.goals_against}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Redirect non owners away? For now we just show host page to any logged user who knows the URL. Optionally we could check `sessionInfo?.owner_id`.

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <button onClick={() => router.push('/')} className="text-sm text-primary hover:underline">← Inicio</button>
      {sessionInfo ? (
        <>
          <h1 className="text-2xl font-bold mb-2">{sessionInfo.title}</h1>
          <p className="text-text-muted mb-2">Código: {sessionInfo.code}</p>
          <button
            onClick={copyLink}
            className="bg-surface border border-gray-700 rounded px-3 py-1 text-sm text-primary hover:bg-primary hover:text-white transition-colors"
          >
            Copiar enlace
          </button>
          <div className="bg-card p-4 rounded-md space-y-2">
            <h2 className="text-lg font-semibold mb-1">Jugadores</h2>
            {players.length > 0 ? (
              <ul className="list-disc ml-4 text-sm">
                {players.map((p) => (
                  <li key={p.id}>{p.display_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted">Nadie se ha unido todavía.</p>
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {/* Assignment / fixture section */}
          {fixture ? (
            <>
              {renderFixtureCard()}
              {fixture.status === 'finished' && (
                <button
                  onClick={assignTeams}
                  disabled={assigning}
                  className="bg-secondary hover:bg-secondary-dark transition-colors text-white font-semibold py-2 rounded w-full"
                >
                  Nuevo partido
                </button>
              )}
            </>
          ) : (
            <button
              onClick={assignTeams}
              disabled={assigning || players.length < 2}
              className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-3 rounded w-full"
            >
              Asignar equipos aleatoriamente
            </button>
          )}
          {renderStats()}
        </>
      ) : (
        <p>Cargando datos…</p>
      )}
    </div>
  );
}