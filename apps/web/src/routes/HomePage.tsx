import { ArrowRight, ClipboardList, Gauge, PackageCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import logo from '@/assets/logo-te-pinta.png';

const quickLinks = [
  {
    to: '/dashboard',
    label: 'Ir al dashboard',
    description: 'Resumen del día, ventas, pendientes y próximos pasos.',
    icon: Gauge,
    className: 'bg-primary text-primary-foreground shadow-primary-glow hover:bg-primary/90',
  },
  {
    to: '/orders',
    label: 'Ver pedidos',
    description: 'Cargá, prepará y seguí entregas sin perder contexto.',
    icon: ClipboardList,
    className:
      'bg-white text-foreground ring-1 ring-border hover:border-primary/30 hover:text-primary',
  },
] as const;

const highlights = [
  { label: 'Pedidos', value: 'Carga rápida', icon: PackageCheck },
  { label: 'Operación', value: 'Todo en un panel', icon: Gauge },
  { label: 'Gestión', value: 'Sin rodeos', icon: Sparkles },
] as const;

export const HomePage = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fff8ef_0%,#fffbf4_45%,#f3e7d1_100%)] px-4 py-6 text-foreground sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 18%, rgba(210, 138, 45, 0.20), transparent 22rem), radial-gradient(circle at 82% 12%, rgba(181, 74, 50, 0.14), transparent 20rem), radial-gradient(circle at 72% 88%, rgba(23, 50, 92, 0.10), transparent 24rem)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #22160f 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl items-center py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_30rem]">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-primary shadow-card backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Gestión interna · Te Pinta 2.0
            </div>

            <div className="mt-8 flex justify-center lg:justify-start">
              <img
                src={logo}
                alt="Te Pinta"
                className="h-auto w-52 drop-shadow-[0_18px_45px_rgba(34,22,15,0.14)] sm:w-64"
              />
            </div>

            <h1 className="mt-8 font-display text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Pedidos claros,
              <span className="block text-primary">cocina tranquila.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-muted-foreground sm:text-lg lg:text-xl">
              Administrá pedidos, clientes, menú, ingredientes y dashboard operativo desde una app
              interna pensada para el ritmo diario de Te Pinta.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              {quickLinks.map(({ to, label, icon: Icon, className }) => (
                <Link
                  key={to}
                  className={`group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 ${className}`}
                  to={to}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>

          <aside className="mx-auto w-full max-w-md rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-premium backdrop-blur sm:p-5 lg:mx-0">
            <div className="overflow-hidden rounded-[1.6rem] bg-sidebar text-card shadow-premium">
              <div
                className="relative p-5"
                style={{
                  background:
                    'radial-gradient(circle at 18% -8%, rgba(210, 138, 45, 0.34), transparent 13rem), radial-gradient(circle at 110% 12%, rgba(181, 74, 50, 0.24), transparent 12rem), linear-gradient(135deg, rgba(255,248,239,0.08), rgba(0,0,0,0.12))',
                }}
              >
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sidebar-muted">
                  Accesos rápidos
                </p>
                <h2 className="mt-3 font-display text-3xl font-black text-white">
                  Arrancá por lo importante
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-sidebar-muted">
                  Dos entradas para operar sin rodeos: dashboard y pedidos.
                </p>
              </div>

              <div className="space-y-3 bg-white p-4 text-foreground">
                {quickLinks.map(({ to, label, description, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-card"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-foreground">{label}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-muted-foreground">
                        {description}
                      </span>
                    </span>
                    <ArrowRight
                      className="mt-2 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {highlights.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border/70 bg-white/85 p-3 text-center shadow-card"
                >
                  <Icon className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="mt-2 text-[0.68rem] font-black uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-xs font-black leading-tight text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};
