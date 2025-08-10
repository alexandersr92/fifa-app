'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';

export default function NewTournament() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [format, setFormat] = useState('single_elim');
  const [minStars, setMinStars] = useState(1);
  const [maxStars, setMaxStars] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { session, loading } = useAuth();

  const handleCreate = async () => {
    setError(null);
    try {
      if (!session && !loading) {
        router.push('/login');
        return;
      }
      const token = session?.access_token;
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'tournament',
          title,
          description,
          tFormat: format,
          minPlayers,
          maxPlayers,
          teamFilter: {
            minStars,
            maxStars,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(`/tournament/${json.data.code}/host`);
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'Error al crear el torneo';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado');
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Nuevo torneo</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Título del torneo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
      />
      <div>
        <label className="block text-sm mb-1">Mínimo de jugadores: {minPlayers}</label>
        <input
          type="number"
          min={2}
          max={64}
          value={minPlayers}
          onChange={(e) => setMinPlayers(Number(e.target.value))}
          className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Máximo de jugadores: {maxPlayers}</label>
        <input
          type="number"
          min={2}
          max={64}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Formato</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="bg-card border border-gray-700 rounded p-3 w-full text-text focus:outline-none"
        >
          <option value="league">Liga (todos contra todos)</option>
          <option value="single_elim">Eliminación directa</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Estrellas mínimas: {minStars}</label>
        <input
          type="range"
          min={1}
          max={5}
          value={minStars}
          onChange={(e) => setMinStars(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Estrellas máximas: {maxStars}</label>
        <input
          type="range"
          min={1}
          max={5}
          value={maxStars}
          onChange={(e) => setMaxStars(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <button
        onClick={handleCreate}
        className="bg-secondary hover:bg-secondary-dark transition-colors text-white font-semibold py-3 rounded w-full"
      >
        Crear torneo
      </button>
    </div>
  );
}
