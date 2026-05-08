import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/auth-store';

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

const getRedirectPath = (state: unknown) => {
  const from = (state as LoginLocationState | null)?.from?.pathname;

  return from && from !== '/login' ? from : '/dashboard';
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const redirectTo = getRedirectPath(location.state);

  if (status === 'authenticated') {
    return <Navigate replace to={redirectTo} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch {
      // The auth store owns the user-facing error state.
    }
  };

  const isSubmitting = status === 'loading';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,var(--color-muted),transparent_30rem),var(--color-background)] px-4 py-8 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Te Pinta</p>
          <h1 className="mt-2 text-3xl font-black text-foreground">Login admin</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Ingresá con el único usuario admin configurado desde el `.env` del API.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@tepinta.local"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground" htmlFor="password">
              Contraseña
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              type="password"
              value={password}
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
};
