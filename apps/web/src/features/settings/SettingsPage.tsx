import { useState, type FormEvent } from 'react';

import type { Setting } from './settings-api';
import { useSettings, useUpdateSetting } from './settings-hooks';

const formatMoney = (value: string): string => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? `$ ${Math.round(parsed).toLocaleString('es-AR')}` : value;
};

type SettingCardProps = {
  setting: Setting;
};

const SettingCard = ({ setting }: SettingCardProps) => {
  const [value, setValue] = useState(setting.value);
  const updateSetting = useUpdateSetting();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateSetting.mutateAsync({ key: setting.key, value });
  };

  return (
    <article
      aria-label={`Setting ${setting.key}`}
      className="rounded-3xl border border-border bg-background p-4"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-black text-foreground">{setting.key}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Valor actual:{' '}
            <span className="font-black text-primary">
              {setting.key === 'delivery_fee' ? formatMoney(setting.value) : setting.value}
            </span>
          </p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
          <label className="text-sm font-bold text-foreground">
            Valor
            <input
              className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          </label>
          <button
            className="self-end rounded-2xl bg-primary px-5 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={updateSetting.isPending}
            type="submit"
          >
            Guardar
          </button>
        </form>
      </div>
    </article>
  );
};

export const SettingsPage = () => {
  const settingsQuery = useSettings();
  const settings = settingsQuery.data ?? [];
  const deliveryFee = settings.find((setting) => setting.key === 'delivery_fee');

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Phase 4.6</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
          Settings
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Configuración operativa del MVP. Reports y expenses siguen diferidos.
        </p>
      </section>

      {deliveryFee ? (
        <section className="rounded-3xl border border-primary/30 bg-muted p-6 shadow-sm">
          <p className="text-sm font-bold text-primary">Delivery fee actual</p>
          <p className="mt-2 text-4xl font-black text-foreground">
            {formatMoney(deliveryFee.value)}
          </p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-black text-foreground">Valores configurables</h3>
        {settingsQuery.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando settings...</p>
        ) : null}
        <div className="mt-5 grid gap-3">
          {settings.map((setting) => (
            <SettingCard key={setting.key} setting={setting} />
          ))}
        </div>
      </section>
    </div>
  );
};
