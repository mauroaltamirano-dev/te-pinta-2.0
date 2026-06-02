import { useMemo, useState } from 'react';
import { useSettings, useUpdateSetting } from '../../settings/settings-hooks';

export type FinanceAssumptions = {
  servicePercent: number;
  targetMarginPercent: number;
};

const SERVICE_PERCENT_KEY = 'finance_dashboard_service_percent';
const TARGET_MARGIN_PERCENT_KEY = 'finance_dashboard_target_margin_percent';

const parsePercent = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const useFinanceAssumptions = () => {
  const settingsQuery = useSettings();
  const updateSetting = useUpdateSetting();
  const [optimisticAssumptions, setOptimisticAssumptions] = useState<Partial<FinanceAssumptions>>(
    {},
  );

  const settingsByKey = useMemo(
    () => new Map((settingsQuery.data ?? []).map((setting) => [setting.key, setting.value])),
    [settingsQuery.data],
  );

  const persistedAssumptions = useMemo<FinanceAssumptions>(
    () => ({
      servicePercent: parsePercent(settingsByKey.get(SERVICE_PERCENT_KEY), 20),
      targetMarginPercent: parsePercent(settingsByKey.get(TARGET_MARGIN_PERCENT_KEY), 50),
    }),
    [settingsByKey],
  );

  const assumptions = { ...persistedAssumptions, ...optimisticAssumptions };

  const updateAssumption = (key: keyof FinanceAssumptions, value: number) => {
    setOptimisticAssumptions((current) => ({ ...current, [key]: value }));
    updateSetting.mutate({
      key: key === 'servicePercent' ? SERVICE_PERCENT_KEY : TARGET_MARGIN_PERCENT_KEY,
      value: String(value),
    });
  };

  return {
    assumptions,
    isLoading: settingsQuery.isLoading,
    isUpdating: updateSetting.isPending,
    updateAssumption,
  };
};
