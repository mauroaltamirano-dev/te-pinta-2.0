import { describe, expect, it } from 'vitest';

import {
  calculateAverageCostCents,
  calculateAverageMarginPercent,
  calculateAverageProfitCents,
  calculateAverageSalePriceCents,
  calculateDashboardAverages,
  calculateDozenSimulatorScenarios,
  calculateMarginPercent,
  calculateProfitCents,
  calculateTargetSalePriceCents,
  calculateVarietyMetrics,
} from './dashboardMath';

const baseVariety = {
  id: 'humita',
  name: 'Humita',
  baseCostPerDozenCents: 72_000,
  recipeCostPerDozenCents: 50_000,
  priceDozenCents: 1_200_000,
  servicePercent: 20,
  targetMarginPercent: 50,
  cookingFeePerDozenCents: 200_000,
  deliveryFeeCents: 150_000,
  hasRecipe: true,
  warningsCount: 0,
};

describe('dashboardMath', () => {
  it('deducts services from dozen profit instead of loading them over direct cost', () => {
    const metrics = calculateVarietyMetrics(baseVariety);

    expect(metrics.directCostCents).toBe(122_000);
    expect(metrics.serviceCostCents).toBe(215_600);
    expect(metrics.totalCostCents).toBe(337_600);
    expect(metrics.profitCents).toBe(862_400);
    expect(metrics.marginPercent).toBe(71.9);
    expect(metrics.targetSalePriceCents).toBe(325_333);
    expect(calculateProfitCents(1_200_000, 337_600)).toBe(862_400);
    expect(calculateMarginPercent(862_400, 1_200_000)).toBe(71.9);
    expect(calculateTargetSalePriceCents(122_000, 50, 20)).toBe(325_333);
  });

  it('averages dashboard KPIs across varieties and returns zeros for empty input', () => {
    const humita = calculateVarietyMetrics(baseVariety);
    const carne = calculateVarietyMetrics({
      ...baseVariety,
      id: 'carne',
      name: 'Carne',
      recipeCostPerDozenCents: 200_000,
      priceDozenCents: 900_000,
    });

    expect(calculateAverageMarginPercent([humita, carne])).toBe(63.9);
    expect(calculateAverageCostCents([humita, carne])).toBe(197_000);
    expect(calculateAverageSalePriceCents([humita, carne])).toBe(1_050_000);
    expect(calculateAverageProfitCents([humita, carne])).toBe(682_400);
    expect(calculateDashboardAverages([humita, carne])).toEqual({
      averageMarginPercent: 63.9,
      averageCostCents: 197_000,
      averageSalePriceCents: 1_050_000,
      averageProfitCents: 682_400,
    });
    expect(calculateDashboardAverages([])).toEqual({
      averageMarginPercent: 0,
      averageCostCents: 0,
      averageSalePriceCents: 0,
      averageProfitCents: 0,
    });
  });

  it('simulates N docenas with cooking charged per started dozen and delivery charged once', () => {
    const scenarios = calculateDozenSimulatorScenarios({
      dozens: 2.25,
      priceDozenCents: 1_200_000,
      totalCostPerDozenCents: 146_400,
      cookingFeePerDozenCents: 200_000,
      deliveryFeeCents: 150_000,
    });

    expect(scenarios).toEqual([
      expect.objectContaining({
        key: 'raw-pickup',
        saleCents: 2_700_000,
        feeCents: 0,
        costCents: 329_400,
        profitCents: 2_370_600,
        marginPercent: 87.8,
      }),
      expect.objectContaining({
        key: 'cooked-pickup',
        saleCents: 3_300_000,
        feeCents: 600_000,
        costCents: 329_400,
        profitCents: 2_970_600,
        marginPercent: 90,
      }),
      expect.objectContaining({
        key: 'raw-delivery',
        saleCents: 2_850_000,
        feeCents: 150_000,
        costCents: 329_400,
        profitCents: 2_520_600,
        marginPercent: 88.4,
      }),
      expect.objectContaining({
        key: 'cooked-delivery',
        saleCents: 3_450_000,
        feeCents: 750_000,
        costCents: 329_400,
        profitCents: 3_120_600,
        marginPercent: 90.5,
      }),
    ]);
  });
});
