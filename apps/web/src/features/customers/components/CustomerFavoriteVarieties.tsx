import { cn } from '@/lib/utils';

import type { CustomerProfile } from '../types';

type CustomerFavoriteVarietiesProps = {
  profile: CustomerProfile;
};

export const CustomerFavoriteVarieties = ({ profile }: CustomerFavoriteVarietiesProps) => {
  if (!profile.varietyRanking.length) {
    return (
      <section className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
          Variedades más pedidas
        </h3>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          Este cliente todavía no tiene variedades destacadas.
        </p>
      </section>
    );
  }

  const topVariety = profile.varietyRanking[0]?.variety;

  return (
    <section
      aria-label="Variedades más pedidas"
      className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
    >
      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
        Variedades más pedidas
      </h3>
      <div className="mt-4 space-y-3">
        {profile.varietyRanking.map((item, index) => (
          <div key={item.variety}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span
                className={cn(
                  'font-black',
                  item.variety === topVariety ? 'text-primary' : 'text-foreground',
                )}
              >
                {item.variety}
              </span>
              <span className="font-bold text-muted-foreground">
                {item.units} u. · {item.percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  index === 0 ? 'bg-primary' : 'bg-success/70',
                )}
                style={{ width: `${Math.max(item.percent, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground">{profile.varietyInsight}</p>
    </section>
  );
};
