import { Link } from 'react-router-dom';

export const HomePage = () => {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--color-brand-100),transparent_32rem),var(--color-background)] px-4 py-8 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center text-center">
        <div className="rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-sm font-medium text-brand-700 shadow-sm">
          Te Pinta 2.0
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-brand-950 sm:text-6xl font-display">
          Te Pinta
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Gestión diaria de empanadas para administrar pedidos, clientes, menú, ingredientes y
          dashboard operativo desde una sola app interna.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
            to="/dashboard"
          >
            Ir al dashboard
          </Link>
          <Link
            className="rounded-2xl border border-brand-200 bg-white px-5 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
            to="/orders"
          >
            Ver pedidos
          </Link>
          <Link
            className="rounded-2xl border border-brand-200 bg-oro-horno px-5 py-3 text-sm font-bold text-foreground transition hover:bg-brand-50"
            to="/sorteo"
          >
            Filmar sorteo
          </Link>
        </div>
      </section>
    </main>
  );
};
