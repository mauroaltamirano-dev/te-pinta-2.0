import { calculateBaseRawMaterialCost, calculatePackagingCost } from '@te-pinta/shared';

import type { FinanceBaseCostRule } from '../types';

export type DashboardVarietyInput = {
  id: string;
  name: string;
  baseCostPerDozenCents: number;
  recipeCostPerDozenCents: number;
  priceDozenCents: number;
  servicePercent: number;
  targetMarginPercent: number;
  cookingFeePerDozenCents: number;
  deliveryFeeCents: number;
  hasRecipe: boolean;
  warningsCount: number;
};

export type DashboardScenarioKey =
  | 'raw-pickup'
  | 'cooked-pickup'
  | 'raw-delivery'
  | 'cooked-delivery';

export type DashboardScenario = {
  key: DashboardScenarioKey;
  label: string;
  hint: string;
  saleCents: number;
  feeCents: number;
  costCents: number;
  profitCents: number;
  marginPercent: number;
};

export type DashboardVarietyMetrics = DashboardVarietyInput & {
  directCostCents: number;
  serviceCostCents: number;
  totalCostCents: number;
  profitCents: number;
  marginPercent: number;
  targetSalePriceCents: number | null;
  scenarios: DashboardScenario[];
};

export type DashboardAverages = {
  averageMarginPercent: number;
  averageCostCents: number;
  averageSalePriceCents: number;
  averageProfitCents: number;
};

const DOZEN_SIZE = 12;

const roundPercent = (value: number): number => Math.round(value * 10) / 10;
const safeNonNegative = (value: number): number =>
  Number.isFinite(value) ? Math.max(value, 0) : 0;
const averageNumber = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

export const calculateProfitCents = (salePriceCents: number, totalCostCents: number): number =>
  Math.round(salePriceCents - totalCostCents);

export const calculateMarginPercent = (profitCents: number, salePriceCents: number): number =>
  salePriceCents > 0 ? roundPercent((profitCents / salePriceCents) * 100) : 0;

export const calculateTargetSalePriceCents = (
  directCostCents: number,
  targetMarginPercent: number,
  servicePercent = 0,
): number | null => {
  const safeServiceRate = safeNonNegative(servicePercent) / 100;
  const retainedProfitRate = Math.max(1 - safeServiceRate, 0);
  const safeMarginRate = safeNonNegative(targetMarginPercent) / 100;

  if (retainedProfitRate <= 0 || safeMarginRate >= retainedProfitRate) {
    return null;
  }

  return Math.round(
    (safeNonNegative(directCostCents) * retainedProfitRate) /
      (retainedProfitRate - safeMarginRate),
  );
};

export const calculateBaseCostPerDozenCents = (rules: FinanceBaseCostRule[]): number => {
  const activeRules = rules.filter((rule) => rule.isActive && rule.latestCostCents !== null);
  const baseRawMaterial = calculateBaseRawMaterialCost({
    totalEmpanadas: DOZEN_SIZE,
    rules: activeRules,
  });
  const packaging = calculatePackagingCost({
    totalEmpanadas: DOZEN_SIZE,
    rules: activeRules,
  });

  return baseRawMaterial.totalCostCents + packaging.totalCostCents;
};

export const calculateDozenSimulatorScenarios = ({
  dozens,
  priceDozenCents,
  totalCostPerDozenCents,
  cookingFeePerDozenCents,
  deliveryFeeCents,
  servicePercent = 0,
}: {
  dozens: number;
  priceDozenCents: number;
  totalCostPerDozenCents: number;
  cookingFeePerDozenCents: number;
  deliveryFeeCents: number;
  servicePercent?: number;
}): DashboardScenario[] => {
  const safeDozens = safeNonNegative(dozens);
  const startedDozens = safeDozens > 0 ? Math.ceil(safeDozens) : 0;
  const productionCostCents = Math.round(totalCostPerDozenCents * safeDozens);
  const baseSaleCents = Math.round(priceDozenCents * safeDozens);
  const cookingFeeCents = Math.round(cookingFeePerDozenCents * startedDozens);
  const flatDeliveryFeeCents = Math.round(safeNonNegative(deliveryFeeCents));

  return [
    {
      key: 'raw-pickup' as const,
      label: 'Cruda retiro',
      hint: 'Sin cocción ni envío',
      feeCents: 0,
    },
    {
      key: 'cooked-pickup' as const,
      label: 'Cocinada retiro',
      hint: `${startedDozens.toLocaleString('es-AR')} docena(s) de cocción`,
      feeCents: cookingFeeCents,
    },
    {
      key: 'raw-delivery' as const,
      label: 'Cruda con envío',
      hint: 'Envío aplicado una vez',
      feeCents: flatDeliveryFeeCents,
    },
    {
      key: 'cooked-delivery' as const,
      label: 'Cocinada con envío',
      hint: 'Cocción por docena iniciada + envío',
      feeCents: cookingFeeCents + flatDeliveryFeeCents,
    },
  ].map((scenario) => {
    const saleCents = baseSaleCents + scenario.feeCents;
    const grossProfitCents = calculateProfitCents(saleCents, productionCostCents);
    const serviceCostCents = Math.round(
      Math.max(grossProfitCents, 0) * (safeNonNegative(servicePercent) / 100),
    );
    const costCents = productionCostCents + serviceCostCents;
    const profitCents = calculateProfitCents(saleCents, costCents);

    return {
      ...scenario,
      saleCents,
      costCents,
      profitCents,
      marginPercent: calculateMarginPercent(profitCents, saleCents),
    };
  });
};

export const calculateVarietyMetrics = (input: DashboardVarietyInput): DashboardVarietyMetrics => {
  const directCostCents = Math.round(input.baseCostPerDozenCents + input.recipeCostPerDozenCents);
  const grossProfitCents = calculateProfitCents(input.priceDozenCents, directCostCents);
  const serviceCostCents = Math.round(
    Math.max(grossProfitCents, 0) * (safeNonNegative(input.servicePercent) / 100),
  );
  const totalCostCents = directCostCents + serviceCostCents;
  const profitCents = calculateProfitCents(input.priceDozenCents, totalCostCents);

  return {
    ...input,
    directCostCents,
    serviceCostCents,
    totalCostCents,
    profitCents,
    marginPercent: calculateMarginPercent(profitCents, input.priceDozenCents),
    targetSalePriceCents: calculateTargetSalePriceCents(
      directCostCents,
      input.targetMarginPercent,
      input.servicePercent,
    ),
    scenarios: calculateDozenSimulatorScenarios({
      dozens: 1,
      priceDozenCents: input.priceDozenCents,
      totalCostPerDozenCents: directCostCents,
      cookingFeePerDozenCents: input.cookingFeePerDozenCents,
      deliveryFeeCents: input.deliveryFeeCents,
      servicePercent: input.servicePercent,
    }),
  };
};

export const calculateAverageMarginPercent = (varieties: DashboardVarietyMetrics[]): number =>
  roundPercent(averageNumber(varieties.map((variety) => variety.marginPercent)));

export const calculateAverageCostCents = (varieties: DashboardVarietyMetrics[]): number =>
  Math.round(averageNumber(varieties.map((variety) => variety.directCostCents)));

export const calculateAverageSalePriceCents = (varieties: DashboardVarietyMetrics[]): number =>
  Math.round(averageNumber(varieties.map((variety) => variety.priceDozenCents)));

export const calculateAverageProfitCents = (varieties: DashboardVarietyMetrics[]): number =>
  Math.round(averageNumber(varieties.map((variety) => variety.profitCents)));

export const calculateDashboardAverages = (
  varieties: DashboardVarietyMetrics[],
): DashboardAverages => ({
  averageMarginPercent: calculateAverageMarginPercent(varieties),
  averageCostCents: calculateAverageCostCents(varieties),
  averageSalePriceCents: calculateAverageSalePriceCents(varieties),
  averageProfitCents: calculateAverageProfitCents(varieties),
});
