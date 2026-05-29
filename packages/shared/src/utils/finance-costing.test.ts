import { describe, expect, it } from 'vitest';

import {
  calculateAverageProductCost,
  calculateBaseRawMaterialCost,
  calculateLatestProductCost,
  calculateOrderCostBreakdown,
  calculatePackagingCost,
  calculatePackagingUnits,
  calculateProfitSummary,
  calculatePurchaseItemCost,
  calculateRecipeCostPerDozen,
  calculateRecipeCostPerUnit,
  normalizeMoneyToCents,
} from './finance-costing';

const tapaRule = {
  id: 'rule-tapa',
  productId: 'product-tapa',
  name: 'Tapas de empanadas',
  componentType: 'base_raw_material' as const,
  appliesTo: 'per_empanada' as const,
  quantity: 1,
  latestCostCents: 13_333,
};

const boxRule = {
  id: 'rule-box',
  productId: 'product-box',
  name: 'Caja delivery docena',
  componentType: 'packaging' as const,
  appliesTo: 'per_started_dozen' as const,
  quantity: 1,
  groupSizeUnits: 12,
  roundingMode: 'ceil' as const,
  latestCostCents: 13_800,
};

const paperRule = {
  id: 'rule-paper',
  productId: 'product-paper',
  name: 'Papel parafinado',
  componentType: 'packaging' as const,
  appliesTo: 'per_started_dozen' as const,
  quantity: 1,
  groupSizeUnits: 12,
  roundingMode: 'ceil' as const,
  latestCostCents: 5_583,
};

describe('finance money helpers', () => {
  it('normalizes decimal money input to integer cents without using floats as storage', () => {
    expect(normalizeMoneyToCents('1600')).toBe(160_000);
    expect(normalizeMoneyToCents('55.83')).toBe(5_583);
    expect(normalizeMoneyToCents(133.335)).toBe(13_334);
  });
});

describe('calculatePurchaseItemCost', () => {
  it('calculates pack purchase totals and base-unit cost from a unit pack price', () => {
    expect(
      calculatePurchaseItemCost({
        purchaseQuantity: 24,
        unitsPerPackage: 12,
        unitPriceCents: 160_000,
      }),
    ).toEqual({
      purchaseQuantity: 24,
      unitsPerPackage: 12,
      totalBaseUnits: 288,
      totalPriceCents: 3_840_000,
      costPerBaseUnitCents: 13_333,
    });
  });

  it('calculates base-unit cost from a total purchase price', () => {
    expect(
      calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 100,
        totalPriceCents: 13_800,
      }),
    ).toMatchObject({
      totalBaseUnits: 100,
      totalPriceCents: 13_800,
      costPerBaseUnitCents: 138,
    });
  });

  it('rejects contradictory purchase item prices and zero-cent prices', () => {
    expect(() =>
      calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 100,
        unitPriceCents: 160_000,
        totalPriceCents: 13_800,
      }),
    ).toThrow('Exactly one of unitPriceCents or totalPriceCents is required');
    expect(() =>
      calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 100,
        unitPriceCents: 0,
      }),
    ).toThrow('unitPriceCents must be a positive integer amount of cents');
    expect(() =>
      calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 100,
        totalPriceCents: 0,
      }),
    ).toThrow('totalPriceCents must be a positive integer amount of cents');
  });
});

describe('packaging and base costs', () => {
  it('calculates packaging by started dozen', () => {
    expect([12, 18, 24, 25].map((quantity) => calculatePackagingUnits(quantity))).toEqual([
      1, 2, 2, 3,
    ]);
  });

  it('calculates base raw material and packaging costs for 12 empanadas', () => {
    const rawMaterial = calculateBaseRawMaterialCost({
      totalEmpanadas: 12,
      rules: [tapaRule],
    });
    const packaging = calculatePackagingCost({
      totalEmpanadas: 12,
      rules: [boxRule, paperRule],
    });

    expect(rawMaterial.totalCostCents).toBe(159_996);
    expect(packaging).toMatchObject({
      packagingUnits: 1,
      totalCostCents: 19_383,
      warnings: [],
    });
  });

  it('calculates base raw material and packaging costs for 18 empanadas', () => {
    const rawMaterial = calculateBaseRawMaterialCost({
      totalEmpanadas: 18,
      rules: [tapaRule],
    });
    const packaging = calculatePackagingCost({
      totalEmpanadas: 18,
      rules: [boxRule, paperRule],
    });

    expect(rawMaterial.totalCostCents).toBe(239_994);
    expect(packaging).toMatchObject({
      packagingUnits: 2,
      totalCostCents: 38_766,
      warnings: [],
    });
  });

  it('supports base raw material rules by started dozen for pack-based inputs', () => {
    const packTapaRule = {
      ...tapaRule,
      appliesTo: 'per_started_dozen' as const,
      quantity: 1,
      groupSizeUnits: 12,
      roundingMode: 'ceil' as const,
      latestCostCents: 162_600,
    };

    const rawMaterial = calculateBaseRawMaterialCost({
      totalEmpanadas: 18,
      rules: [packTapaRule],
    });

    expect(rawMaterial).toMatchObject({
      totalCostCents: 325_200,
      warnings: [],
    });
    expect(rawMaterial.components[0]).toMatchObject({
      totalQuantity: 2,
      unitCostCents: 162_600,
    });
  });
});

describe('recipes and mixed order costing', () => {
  const saltenaCostPerUnit = calculateRecipeCostPerUnit({
    recipeItems: [
      { productId: 'roast-beef', name: 'Roast beef', quantityBase: 1_000, latestCostCents: 20 },
      { productId: 'cebolla', name: 'Cebolla', quantityBase: 500, latestCostCents: 6 },
    ],
  });
  const jamonQuesoCostPerUnit = calculateRecipeCostPerUnit({
    recipeItems: [
      { productId: 'jamon', name: 'Jamón', quantityBase: 600, latestCostCents: 18 },
      { productId: 'queso', name: 'Queso', quantityBase: 600, latestCostCents: 22 },
    ],
  });
  const criollaCostPerUnit = calculateRecipeCostPerUnit({
    recipeItems: [
      { productId: 'carne', name: 'Carne', quantityBase: 900, latestCostCents: 19 },
      { productId: 'aceituna', name: 'Aceituna', quantityBase: 120, latestCostCents: 25 },
    ],
  });

  it('calculates recipe cost per dozen and per unit from latest ingredient costs', () => {
    const recipe = calculateRecipeCostPerDozen({
      recipeItems: [
        { productId: 'roast-beef', name: 'Roast beef', quantityBase: 1_000, latestCostCents: 20 },
        { productId: 'cebolla', name: 'Cebolla', quantityBase: 500, latestCostCents: 6 },
      ],
    });

    expect(recipe).toMatchObject({
      totalCostCents: 23_000,
      warnings: [],
    });
    expect(calculateRecipeCostPerUnit({ recipeItems: recipe.items }).totalCostCents).toBe(1_917);
  });

  it('calculates packaging by total order quantity and recipe costs by variety', () => {
    const breakdown = calculateOrderCostBreakdown({
      saleTotalCents: 1_500_000,
      items: [
        {
          menuItemId: 'saltena',
          name: 'Salteña',
          quantity: 6,
          recipeCostPerUnitCents: saltenaCostPerUnit.totalCostCents,
        },
        {
          menuItemId: 'jamon-queso',
          name: 'Jamón y queso',
          quantity: 3,
          recipeCostPerUnitCents: jamonQuesoCostPerUnit.totalCostCents,
        },
        {
          menuItemId: 'criolla',
          name: 'Criolla dulce',
          quantity: 3,
          recipeCostPerUnitCents: criollaCostPerUnit.totalCostCents,
        },
      ],
      baseRawMaterialRules: [tapaRule],
      packagingRules: [boxRule, paperRule],
    });

    expect(breakdown).toMatchObject({
      totalEmpanadas: 12,
      packagingUnits: 1,
      baseRawMaterialCostCents: 159_996,
      packagingCostCents: 19_383,
      recipeCostCents: 22_527,
      totalCostCents: 201_906,
      warnings: [],
    });
    expect(breakdown.profitSummary).toMatchObject({
      saleTotalCents: 1_500_000,
      totalCostCents: 201_906,
      grossProfitCents: 1_298_094,
      profitMarginPercent: 86.54,
      costRatioPercent: 13.46,
    });
  });

  it('returns partial order costs with warnings when finance data is incomplete', () => {
    const breakdown = calculateOrderCostBreakdown({
      saleTotalCents: 1_500_000,
      items: [{ menuItemId: 'humita', name: 'Humita', quantity: 6 }],
      baseRawMaterialRules: [],
      packagingRules: [],
    });

    expect(breakdown.totalCostCents).toBe(0);
    expect(breakdown.packagingUnits).toBe(1);
    expect(breakdown.warnings.map((warning) => warning.code)).toEqual([
      'missing_base_raw_material_rules',
      'missing_packaging_rules',
      'missing_recipe_cost',
    ]);
  });
});

describe('latest and average product costs', () => {
  it('uses the latest purchase cost for future calculations and keeps average informational', () => {
    const firstPurchase = calculatePurchaseItemCost({
      purchaseQuantity: 1,
      unitsPerPackage: 12,
      unitPriceCents: 160_000,
    });
    const secondPurchase = calculatePurchaseItemCost({
      purchaseQuantity: 1,
      unitsPerPackage: 12,
      unitPriceCents: 150_000,
    });
    const history = [
      { ...firstPurchase, purchasedAt: '2026-05-01T12:00:00.000Z' },
      { ...secondPurchase, purchasedAt: '2026-05-10T12:00:00.000Z' },
    ];

    expect(calculateLatestProductCost(history)).toMatchObject({
      costPerBaseUnitCents: 12_500,
      purchasedAt: '2026-05-10T12:00:00.000Z',
    });
    expect(calculateAverageProductCost(history)).toBe(12_917);
  });

  it('uses createdAt and id as deterministic latest-cost tie-breakers for same-day purchases', () => {
    const sameDayMorning = {
      ...calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 12,
        unitPriceCents: 160_000,
      }),
      id: 'purchase-item-a',
      purchasedAt: '2026-05-27',
      createdAt: '2026-05-27T09:00:00.000Z',
    };
    const sameDayAfternoon = {
      ...calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 12,
        unitPriceCents: 180_000,
      }),
      id: 'purchase-item-b',
      purchasedAt: '2026-05-27',
      createdAt: '2026-05-27T18:00:00.000Z',
    };
    const sameTimestampHigherId = {
      ...calculatePurchaseItemCost({
        purchaseQuantity: 1,
        unitsPerPackage: 12,
        unitPriceCents: 190_000,
      }),
      id: 'purchase-item-c',
      purchasedAt: '2026-05-27',
      createdAt: '2026-05-27T18:00:00.000Z',
    };

    expect(calculateLatestProductCost([sameDayAfternoon, sameDayMorning])).toMatchObject({
      costPerBaseUnitCents: 15_000,
      createdAt: '2026-05-27T18:00:00.000Z',
    });
    expect(calculateLatestProductCost([sameDayAfternoon, sameTimestampHigherId])).toMatchObject({
      costPerBaseUnitCents: 15_833,
      createdAt: '2026-05-27T18:00:00.000Z',
    });
  });

  it('calculates profit summary percentages from sale total and cost total', () => {
    expect(calculateProfitSummary({ saleTotalCents: 15_000, totalCostCents: 10_000 })).toEqual({
      saleTotalCents: 15_000,
      totalCostCents: 10_000,
      grossProfitCents: 5_000,
      profitMarginPercent: 33.33,
      costRatioPercent: 66.67,
    });
  });
});
