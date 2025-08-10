export default function Home() {
  return (
    <main className="max-w-sm mx-auto p-4 py-8 space-y-6">
      <h1 className="text-4xl font-bold text-center mb-6">FC25</h1>
      <div className="space-y-4">
        <a
          href="/game/new"
          className="block bg-primary hover:bg-primary-dark transition-colors text-white font-semibold py-4 rounded text-center"
        >
          Nuevo partido
        </a>
        <a
          href="/tournament/new"
          className="block bg-secondary hover:bg-secondary-dark transition-colors text-white font-semibold py-4 rounded text-center"
        >
          Nuevo torneo
        </a>
      </div>
      <div className="space-y-2 pt-6">
        <a
          href="/login"
          className="block text-center text-primary hover:underline"
        >
          Iniciar sesión
        </a>
        <a
          href="/signup"
          className="block text-center text-primary hover:underline"
        >
          Registrarse
        </a>
      </div>
    </main>
  );
}
