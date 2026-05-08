import { Link } from 'react-router-dom';

export type PlaceholderPageProps = {
  title: string;
  description: string;
};

export const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Te Pinta</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
        <Link className="mt-8 inline-flex text-sm font-bold text-primary" to="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
};
