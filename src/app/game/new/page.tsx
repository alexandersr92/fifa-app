'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';

export default function NewGame() {
  const [title, setTitle] = useState('');
  const [minStars, setMinStars] = useState(1);
  const [maxStars, setMaxStars] = useState(5);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { session, loading } = useAuth();

  const handleCreate = async () => {
    setError(null);
    try {
      // Ensure the user is logged in. If no session, redirect to login.
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
          type: 'friendly',
          title,
          teamFilter: {
            minStars,
            maxStars,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        router.push(`/game/${json.data.code}/host`);
      } else {
        const errorMsg = json.errors ? Object.values(json.errors)[0][0] : 'Error al crear la sesión';
        setError(errorMsg);
      }
    } catch {
      setError('Error inesperado');
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Nuevo partido</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Título del encuentro"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
      />
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
        className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-3 rounded w-full"
      >
        Crear partido
      </button>
    </div>
  );
}
