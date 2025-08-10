'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Ask the user for a display name to store in their profile. This will be used
  // as the default name when they create matches or tournaments.
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async () => {
    setError(null);
    setMessage(null);
    // Send the sign up request to Supabase Auth. We also capture the returned
    // user data so we can insert the display name into the `profiles` table.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // On successful sign up Supabase sends a confirmation email. We also persist
    // the provided display name into the `profiles` table for the new user.
    const userId = signUpData?.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({ id: userId, display_name: displayName });
    }
    setMessage('Registro exitoso. Revisa tu correo para confirmar tu cuenta.');
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <div className="max-w-sm mx-auto p-4 py-8 space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Crear cuenta</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {message && <p className="text-green-500 text-sm">{message}</p>}
      <input
        type="text"
        placeholder="Nombre (display name)"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="bg-card border border-gray-700 rounded p-3 w-full text-text placeholder-gray-500 focus:outline-none"
      />
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
        onClick={handleSignup}
        className="bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-3 rounded w-full"
      >
        Registrarse
      </button>
      <p className="text-center text-sm text-text-muted">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-primary hover:underline">
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
