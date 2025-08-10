'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      // After successful login redirect to home
      router.push('/');
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Iniciar sesión</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
      />
      <button
        onClick={handleLogin}
        className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-3 rounded w-full"
      >
        Entrar
      </button>
      <p className="text-center text-sm text-text-muted">
        ¿No tienes cuenta?{' '}
        <a href="/signup" className="text-primary hover:underline">
          Regístrate
        </a>
      </p>
    </div>
  );
}
