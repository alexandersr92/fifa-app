// Page for guests to join a friendly match. It displays the session
// details (title, current players) and provides a form to enter a
// display name to join the match without requiring an account. Once
// joined, the guest will see a confirmation message. The host uses a
// different route (/host) to manage the match.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface SessionInfo {
  id: string;
  title: string;
  type: string;
  min_players: number;
  max_players: number;
  players_count: number;
  players: { id: string; display_name: string }[];
}

export default function JoinGamePage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : params.code as string;
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const router = useRouter();

  // Fetch session details on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        const json = await res.json();
        if (res.ok) {
          setSessionInfo(json.data as SessionInfo);
        }
      } catch {
        // ignore
      }
    };
    fetchSession();
  }, [code]);

  const handleJoin = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Debes ingresar un nombre');
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setJoined(true);
        setDisplayName('');
        // Refresh players list
        const res2 = await fetch(`/api/sessions/${code}`);
        const json2 = await res2.json();
        if (res2.ok) setSessionInfo(json2.data as SessionInfo);
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'No se pudo unir';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado al unirse');
    }
  };

  // Navigate back to home
  const goBack = () => router.push('/');

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <button onClick={goBack} className="text-sm text-primary hover:underline">← Volver</button>
      {sessionInfo ? (
        <>
          <h1 className="text-3xl font-bold mb-2">{sessionInfo.title}</h1>
          <p className="text-text-muted mb-4">Código: {code}</p>
          <div className="space-y-2 mb-4">
            <h2 className="text-lg font-semibold">Jugadores actuales:</h2>
            {sessionInfo.players.length > 0 ? (
              <ul className="list-disc ml-4 text-sm">
                {sessionInfo.players.map((p) => (
                  <li key={p.id}>{p.display_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-text-muted">Nadie se ha unido aún.</p>
            )}
          </div>
          {!joined ? (
            <>
              <input
                type="text"
                placeholder="Tu nombre o apodo"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={handleJoin}
                className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-3 rounded w-full"
              >
                Unirse al partido
              </button>
            </>
          ) : (
            <>
              <p className="text-green-500">¡Te has unido! Espera a que el anfitrión inicie el partido.</p>
            </>
          )}
        </>
      ) : (
        <p>Cargando información…</p>
      )}
    </div>
  );
}