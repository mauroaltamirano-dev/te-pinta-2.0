export type FeaturePageProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export const FeaturePage = ({ eyebrow = 'Te Pinta', title, description }: FeaturePageProps) => {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-brand-950 md:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
    </section>
  );
};
