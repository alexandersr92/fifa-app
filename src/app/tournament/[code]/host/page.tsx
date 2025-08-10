// Host management page for tournaments. The host can assign random teams to
// participants, review the assignment, start the tournament (which
// generates the fixtures) and track progress through the bracket. It
// supports both league and single elimination formats.

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface SessionInfo {
  id: string;
  title: string;
  description: string;
  code: string;
  t_format: string;
}
interface Player {
  id: string;
  display_name: string;
  team_id?: number | null;
}
interface Assignment {
  playerId: string;
  playerName: string;
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamIconUrl: string | null;
}
interface Fixture {
  id: string;
  round_name: string;
  position: number;
  status: string;
  home_player_id: string;
  away_player_id: string;
  home_team_id: number;
  away_team_id: number;
  home_goals: number;
  away_goals: number;
  went_penalties: boolean;
  home_pen: number;
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

export default function HostTournamentPage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : (params.code as string);
  const router = useRouter();
  const { session, loading } = useAuth();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Fetch session info, players, fixtures and stats on mount or refresh
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Session details
        const res = await fetch(`/api/sessions/${code}`);
        const json = await res.json();
        if (res.ok) {
          setSessionInfo(json.data as SessionInfo);
          setPlayers(json.data.players as Player[]);
        }
        // Fixtures
        const resFix = await fetch(`/api/sessions/${code}/fixtures`);
        const jsonFix = await resFix.json();
        if (resFix.ok) {
          setFixtures(jsonFix.data as Fixture[]);
        }
        // Stats
        const resStats = await fetch(`/api/sessions/${code}/stats`);
        const jsonStats = await resStats.json();
        if (resStats.ok) {
          setStats(jsonStats.data as PlayerStat[]);
        }
      } catch {
        // ignore fetch errors
      }
    };
    fetchAll();
  }, [code, refreshFlag]);

  // Assign random teams for tournament
  const handleAssign = async () => {
    setError(null);
    setAssigning(true);
    try {
      if (!session && !loading) {
        router.push('/login');
        return;
      }
      const token = session?.access_token;
      const res = await fetch(`/api/sessions/${code}/tournament/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok) {
        setAssignments(json.data as Assignment[]);
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'No se pudo asignar equipos';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado al asignar equipos');
    } finally {
      setAssigning(false);
    }
  };

  // Start tournament with current assignments
  const handleStart = async () => {
    if (!assignments || assignments.length === 0) {
      setError('No hay asignaciones para iniciar el torneo');
      return;
    }
    setError(null);
    setStarting(true);
    try {
      if (!session && !loading) {
        router.push('/login');
        return;
      }
      const token = session?.access_token;
      const res = await fetch(`/api/sessions/${code}/tournament/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ assignments: assignments.map((a) => ({ playerId: a.playerId, teamId: a.teamId })) }),
      });
      const json = await res.json();
      if (res.ok) {
        // clear assignments and refresh fixtures
        setAssignments(null);
        setRefreshFlag((f) => f + 1);
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'No se pudo iniciar el torneo';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado al iniciar el torneo');
    } finally {
      setStarting(false);
    }
  };

  // Helper to get player display name from id
  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.display_name || '';

  // Render assignment preview table
  const renderAssignments = () => {
    if (!assignments) return null;
    return (
      <div className="bg-card p-4 rounded-md space-y-2">
        <h2 className="text-lg font-semibold mb-2">Asignaciones</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1">Jugador</th>
              <th className="py-1">Equipo</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.playerId} className="border-t border-gray-700">
                <td className="py-1">{a.playerName}</td>
                <td className="py-1">{a.teamName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleAssign}
            disabled={assigning}
            className="bg-secondary hover:bg-secondary-dark transition-colors text-white font-semibold py-2 rounded flex-1"
          >
            Reasignar
          </button>
          <button
            onClick={handleStart}
            disabled={starting}
            className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-2 rounded flex-1"
          >
            Iniciar torneo
          </button>
        </div>
      </div>
    );
  };

  // Build bracket structure from fixtures (single elimination) or schedule (league)
  const renderBracket = () => {
    if (fixtures.length === 0) return null;
    if (!sessionInfo) return null;
    if (sessionInfo.t_format === 'league') {
      // For league, group fixtures by round_name (MD1, MD2, ...)
      const rounds: Record<string, Fixture[]> = {};
      for (const fix of fixtures) {
        if (!rounds[fix.round_name]) rounds[fix.round_name] = [];
        rounds[fix.round_name].push(fix);
      }
      const roundNames = Object.keys(rounds).sort();
      return (
        <div className="space-y-4">
          {roundNames.map((rn) => (
            <div key={rn} className="bg-card p-4 rounded-md">
              <h3 className="font-semibold mb-2">{rn}</h3>
              {rounds[rn].map((fix) => (
                <div key={fix.id} className="flex justify-between items-center mb-2">
                  <span>{getPlayerName(fix.home_player_id)}</span>
                  <span className="text-sm text-text-muted">vs</span>
                  <span>{getPlayerName(fix.away_player_id)}</span>
                  {fix.status === 'finished' ? (
                    <span className="ml-2">{fix.home_goals}-{fix.away_goals}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    // For single elimination, group fixtures by round_name (R1, QF, SF, Final)
    const rounds: Record<string, Fixture[]> = {};
    for (const fix of fixtures) {
      if (!rounds[fix.round_name]) rounds[fix.round_name] = [];
      rounds[fix.round_name].push(fix);
    }
    // Sort rounds according to bracket order
    const order = ['R1', 'R16', 'QF', 'SF', 'Final'];
    const roundNames = Object.keys(rounds).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return ia - ib;
    });
    return (
      <div className="overflow-x-auto">
        <div className="flex gap-4">
          {roundNames.map((rn) => (
            <div key={rn} className="min-w-[180px] bg-card p-4 rounded-md">
              <h3 className="font-semibold mb-2">{rn}</h3>
              {rounds[rn].map((fix) => (
                <div key={fix.id} className="mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{getPlayerName(fix.home_player_id)}</span>
                    <span className="text-sm">{getPlayerName(fix.away_player_id)}</span>
                  </div>
                  {fix.status === 'finished' ? (
                    <div className="text-center text-sm mt-1">{fix.home_goals} - {fix.away_goals}</div>
                  ) : (
                    <div className="text-center text-sm mt-1 text-text-muted">Pendiente</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render stats table
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

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <button onClick={() => router.push('/')} className="text-sm text-primary hover:underline">← Inicio</button>
      {sessionInfo ? (
        <>
          <h1 className="text-2xl font-bold mb-1">{sessionInfo.title}</h1>
          {sessionInfo.description && <p className="text-text-muted mb-2">{sessionInfo.description}</p>}
          <p className="text-text-muted mb-2">Código: {sessionInfo.code}</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="bg-card p-4 rounded-md space-y-2">
            <h2 className="text-lg font-semibold">Participantes</h2>
            {players.length > 0 ? (
              <ul className="list-disc ml-4 text-sm">
                {players.map((p) => (
                  <li key={p.id}>{p.display_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted">Aún no hay inscritos.</p>
            )}
          </div>
          {/* Assignment controls only if tournament not started (fixtures length === 0) */}
          {fixtures.length === 0 ? (
            <>
              {assignments ? (
                renderAssignments()
              ) : (
                <button
                  onClick={handleAssign}
                  disabled={assigning || players.length < 2}
                  className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-3 rounded w-full"
                >
                  Asignar equipos
                </button>
              )}
            </>
          ) : (
            <>{renderBracket()}</>
          )}
          {renderStats()}
        </>
      ) : (
        <p>Cargando datos…</p>
      )}
    </div>
  );
}