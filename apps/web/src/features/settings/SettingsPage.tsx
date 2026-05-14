import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BadgePercent,
  CircleDollarSign,
  Gift,
  Save,
  Settings2,
  Truck,
  Utensils,
} from 'lucide-react';

import type { Setting } from './settings-api';
import { PageHero } from '@/components/layout/PageHero';

import { useSettings, useUpdateSetting } from './settings-hooks';

const formatMoney = (value: string | number): string => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? `$ ${Math.round(parsed).toLocaleString('es-AR')}`
    : String(value);
};

const settingLabels: Record<string, { title: string; description: string; suffix?: string }> = {
  delivery_fee: {
    title: 'Precio de envío',
    description: 'Se aplica automáticamente cuando el pedido es con envío.',
  },
  promo_bulk_dozen_threshold: {
    title: 'Mínimo para promo mayorista',
    description: 'Cantidad de docenas desde la cual se activa el descuento.',
    suffix: 'docenas',
  },
  promo_bulk_discount_percent: {
    title: 'Descuento por 3+ docenas',
    description: 'Descuento automático sobre el total de empanadas.',
    suffix: '%',
  },
  promo_combined_dozen_quantity: {
    title: 'Cantidad docena combinada',
    description: 'Unidades que forman la promo surtida.',
    suffix: 'unidades',
  },
  promo_combined_dozen_price: {
    title: 'Precio docena combinada',
    description: 'Precio fijo para 1 docena surtida de variedades.',
  },
  addon_yasgua_salsa_price: {
    title: 'Yasgua salsa',
    description: 'Precio de adicional para sumar al futuro flujo de pedidos.',
  },
  addon_yasgua_cremosa_price: {
    title: 'Yasgua cremosa',
    description: 'Precio de adicional para sumar al futuro flujo de pedidos.',
  },
  store_name: {
    title: 'Nombre del negocio',
    description: 'Texto operativo interno.',
  },
};

const moneyKeys = new Set([
  'delivery_fee',
  'promo_combined_dozen_price',
  'addon_yasgua_salsa_price',
  'addon_yasgua_cremosa_price',
]);

const formatSettingValue = (setting: Setting): string => {
  if (moneyKeys.has(setting.key)) return formatMoney(setting.value);
  const meta = settingLabels[setting.key];
  return meta?.suffix ? `${setting.value} ${meta.suffix}` : setting.value;
};

type SettingCardProps = {
  setting: Setting;
};

const SettingCard = ({ setting }: SettingCardProps) => {
  const [value, setValue] = useState(setting.value);
  const updateSetting = useUpdateSetting();
  const meta = settingLabels[setting.key] ?? {
    title: setting.key,
    description: 'Valor configurable del sistema.',
  };

  useEffect(() => setValue(setting.value), [setting.value]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateSetting.mutateAsync({ key: setting.key, value });
  };

  return (
    <article
      aria-label={`Setting ${setting.key}`}
      className="rounded-3xl border border-border/70 bg-white/90 p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex h-full flex-col gap-4">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-primary">
            {setting.key}
          </p>
          <h4 className="mt-1 text-lg font-black text-foreground">{meta.title}</h4>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{meta.description}</p>
          <p className="mt-3 text-2xl font-black text-primary tabular-nums">
            {formatSettingValue(setting)}
          </p>
        </div>

        <form
          className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={handleSubmit}
        >
          <label className="flex-1 text-xs font-black uppercase tracking-wide text-muted-foreground">
            Valor
            <input
              className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/15"
              inputMode={moneyKeys.has(setting.key) || meta.suffix ? 'numeric' : 'text'}
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-black text-white shadow-primary-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={updateSetting.isPending || value === setting.value}
            type="submit"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Guardar
          </button>
        </form>
      </div>
    </article>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Truck;
}) => (
  <article className="rounded-3xl border border-border/70 bg-white/90 p-4 shadow-card">
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  </article>
);

export const SettingsPage = () => {
  const settingsQuery = useSettings();
  const settings = settingsQuery.data ?? [];
  const settingsByKey = useMemo(
    () => new Map(settings.map((setting) => [setting.key, setting])),
    [settings],
  );

  const deliveryFee = settingsByKey.get('delivery_fee');
  const bulkDiscount = settingsByKey.get('promo_bulk_discount_percent');
  const combinedDozen = settingsByKey.get('promo_combined_dozen_price');
  const addonCount = settings.filter((setting) => setting.key.startsWith('addon_')).length;

  const groups = [
    {
      title: 'Delivery',
      description: 'Costo operativo de envío.',
      icon: Truck,
      keys: ['delivery_fee'],
    },
    {
      title: 'Promos',
      description: 'Reglas comerciales que impactan el total del pedido.',
      icon: BadgePercent,
      keys: [
        'promo_bulk_dozen_threshold',
        'promo_bulk_discount_percent',
        'promo_combined_dozen_quantity',
        'promo_combined_dozen_price',
      ],
    },
    {
      title: 'Adicionales',
      description: 'Precios listos para incorporar al flujo de pedidos.',
      icon: Utensils,
      keys: ['addon_yasgua_salsa_price', 'addon_yasgua_cremosa_price'],
    },
  ];

  const ungroupedSettings = settings.filter(
    (setting) => !groups.some((group) => group.keys.includes(setting.key)),
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHero
        title="Settings"
        description="Ajustá delivery, promociones y adicionales sin tocar código. Los pedidos nuevos toman estas reglas automáticamente."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Truck}
          label="Delivery"
          value={deliveryFee ? formatMoney(deliveryFee.value) : '—'}
        />
        <StatCard
          icon={BadgePercent}
          label="3+ docenas"
          value={`${bulkDiscount?.value ?? '10'}%`}
        />
        <StatCard
          icon={Gift}
          label="Docena surtida"
          value={combinedDozen ? formatMoney(combinedDozen.value) : '$ 15.000'}
        />
        <StatCard icon={Utensils} label="Adicionales" value={String(addonCount)} />
      </section>

      {settingsQuery.isLoading ? (
        <p className="rounded-2xl border border-border/70 bg-white/85 px-4 py-3 text-sm font-semibold text-muted-foreground shadow-card">
          Cargando settings...
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-6">
          {groups.map((group) => {
            const Icon = group.icon;
            const groupSettings = group.keys
              .map((key) => settingsByKey.get(key))
              .filter((setting): setting is Setting => Boolean(setting));

            if (groupSettings.length === 0) return null;

            return (
              <section
                className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-card sm:p-5"
                key={group.title}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-foreground">{group.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {groupSettings.map((setting) => (
                    <SettingCard key={setting.key} setting={setting} />
                  ))}
                </div>
              </section>
            );
          })}

          {ungroupedSettings.length > 0 ? (
            <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-card sm:p-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-foreground">
                <Settings2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Otros valores
              </h2>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {ungroupedSettings.map((setting) => (
                  <SettingCard key={setting.key} setting={setting} />
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-primary/20 bg-primary/8 p-5 shadow-card">
            <CircleDollarSign className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-black text-foreground">Reglas activas</h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-muted-foreground">
              <li>• 3 docenas o más aplican {bulkDiscount?.value ?? '10'}% de descuento.</li>
              <li>
                • 1 docena combinada cuesta{' '}
                {combinedDozen ? formatMoney(combinedDozen.value) : '$ 15.000'}.
              </li>
              <li>
                • Las salsas quedan configuradas para el próximo paso de adicionales en pedido.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};
