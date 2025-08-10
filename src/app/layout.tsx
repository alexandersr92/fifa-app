import '@/app/globals.css';

// Base layout for all pages. We set a dark background and light text colors
// according to the Tailwind theme defined in `tailwind.config.js`. This
// component is a server component by default and does not use any client
// hooks. All interactive behaviour is implemented in the child pages.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-surface text-text min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
