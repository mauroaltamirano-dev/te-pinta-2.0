export const FINANCE_DEFAULT_PACKAGING_GROUP_SIZE = 12;

export type FinanceCostWarningCode =
  | 'invalid_sale_total'
  | 'missing_base_raw_material_rules'
  | 'missing_cost'
  | 'missing_packaging_rules'
  | 'missing_recipe_cost';

export type FinanceCostWarning = {
  code: FinanceCostWarningCode;
  message: string;
  context?: Record<string, string | number | boolean | null>;
};

export type FinanceCostComponentKind = 'base_raw_material' | 'packaging';
export type FinanceCostRuleAppliesToKind = 'per_empanada' | 'per_started_dozen';
export type FinanceCostingRoundingMode = 'exact' | 'ceil';

export type FinancePurchaseItemCostInput = {
  purchaseQuantity: number;
  unitsPerPackage: number;
  unitPriceCents?: number;
  totalPriceCents?: number;
};

export type FinancePurchaseItemCost = {
  purchaseQuantity: number;
  unitsPerPackage: number;
  totalBaseUnits: number;
  totalPriceCents: number;
  costPerBaseUnitCents: number;
};

export type FinanceProductCostHistoryItem = FinancePurchaseItemCost & {
  id?: string;
  purchasedAt?: string;
  createdAt?: string;
};

export type FinanceLatestProductCost = {
  id?: string;
  costPerBaseUnitCents: number | null;
  purchasedAt?: string;
  createdAt?: string;
  warnings: FinanceCostWarning[];
};

export type FinanceCostRule = {
  id?: string;
  productId: string;
  name: string;
  componentType: FinanceCostComponentKind;
  appliesTo: FinanceCostRuleAppliesToKind;
  quantity: number;
  groupSizeUnits?: number;
  roundingMode?: FinanceCostingRoundingMode;
  latestCostCents?: number | null;
  isActive?: boolean;
};

export type FinanceCostComponentResult = {
  ruleId?: string;
  productId: string;
  name: string;
  quantity: number;
  totalQuantity: number;
  unitCostCents: number;
  totalCostCents: number;
};

export type FinanceBaseRawMaterialCostInput = {
  totalEmpanadas: number;
  rules: FinanceCostRule[];
};

export type FinanceBaseRawMaterialCost = {
  totalEmpanadas: number;
  totalCostCents: number;
  components: FinanceCostComponentResult[];
  warnings: FinanceCostWarning[];
};

export type FinancePackagingCostInput = {
  totalEmpanadas: number;
  rules: FinanceCostRule[];
};

export type FinancePackagingCost = {
  totalEmpanadas: number;
  packagingUnits: number;
  totalCostCents: number;
  components: FinanceCostComponentResult[];
  warnings: FinanceCostWarning[];
};

export type FinanceRecipeCostItem = {
  productId: string;
  name?: string;
  quantityBase: number;
  unit?: string;
  latestCostCents?: number | null;
};

export type FinanceRecipeCostItemResult = FinanceRecipeCostItem & {
  totalCostCents: number;
};

export type FinanceRecipeCost = {
  totalCostCents: number;
  items: FinanceRecipeCostItemResult[];
  warnings: FinanceCostWarning[];
};

export type FinanceRecipeUnitCost = FinanceRecipeCost & {
  totalCostPerDozenCents: number;
};

export type FinanceOrderCostItem = {
  menuItemId: string;
  name?: string;
  quantity: number;
  recipeCostPerUnitCents?: number | null;
};

export type FinanceProfitSummary = {
  saleTotalCents: number;
  totalCostCents: number;
  grossProfitCents: number;
  profitMarginPercent: number;
  costRatioPercent: number;
};

export type FinanceOrderCostBreakdownInput = {
  saleTotalCents: number;
  items: FinanceOrderCostItem[];
  baseRawMaterialRules: FinanceCostRule[];
  packagingRules: FinanceCostRule[];
};

export type FinanceOrderCostBreakdown = {
  totalEmpanadas: number;
  packagingUnits: number;
  baseRawMaterialCostCents: number;
  packagingCostCents: number;
  recipeCostCents: number;
  totalCostCents: number;
  profitSummary: FinanceProfitSummary;
  warnings: FinanceCostWarning[];
};

const MONEY_PATTERN = /^(\d+)(?:\.(\d+))?$/;

export function normalizeMoneyToCents(value: number | string): number {
  const raw = typeof value === 'number' ? String(value) : value.trim().replace(',', '.');

  if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) {
    throw new Error('Money value must be a non-negative finite number');
  }

  const match = raw.match(MONEY_PATTERN);
  if (!match) {
    throw new Error('Money value must be a non-negative decimal');
  }

  const whole = match[1] ?? '0';
  const fraction = match[2] ?? '';
  const cents = Number.parseInt(whole, 10) * 100 + parseCentsFraction(fraction);
  const roundingDigit = fraction[2];

  return roundingDigit !== undefined && Number.parseInt(roundingDigit, 10) >= 5 ? cents + 1 : cents;
}

export function formatMoney(
  cents: number,
  options: { locale?: string; currency?: string } = {},
): string {
  assertIntegerCents(cents, 'cents');

  return new Intl.NumberFormat(options.locale ?? 'es-AR', {
    style: 'currency',
    currency: options.currency ?? 'ARS',
  }).format(cents / 100);
}

export function calculatePurchaseItemCost(
  input: FinancePurchaseItemCostInput,
): FinancePurchaseItemCost {
  assertPositiveNumber(input.purchaseQuantity, 'purchaseQuantity');
  assertPositiveNumber(input.unitsPerPackage, 'unitsPerPackage');

  const hasUnitPrice = input.unitPriceCents !== undefined;
  const hasTotalPrice = input.totalPriceCents !== undefined;
  if (hasUnitPrice === hasTotalPrice) {
    throw new Error('Exactly one of unitPriceCents or totalPriceCents is required');
  }

  const totalBaseUnits = input.purchaseQuantity * input.unitsPerPackage;
  const totalPriceCents =
    input.totalPriceCents !== undefined
      ? input.totalPriceCents
      : calculateTotalPriceFromUnitPrice(input.unitPriceCents, input);

  assertPositiveIntegerCents(totalPriceCents, 'totalPriceCents');

  return {
    purchaseQuantity: input.purchaseQuantity,
    unitsPerPackage: input.unitsPerPackage,
    totalBaseUnits,
    totalPriceCents,
    costPerBaseUnitCents: Math.round(totalPriceCents / totalBaseUnits),
  };
}

export function calculateLatestProductCost(
  history: FinanceProductCostHistoryItem[],
): FinanceLatestProductCost {
  const latest = history.reduce<{
    item: FinanceProductCostHistoryItem;
    index: number;
  } | null>((current, item, index) => {
    if (current === null) {
      return { item, index };
    }

    return compareHistoryItems(item, index, current.item, current.index) > 0
      ? { item, index }
      : current;
  }, null);

  if (latest === null) {
    return {
      costPerBaseUnitCents: null,
      warnings: [
        createWarning('missing_cost', 'No purchase history is available for this product.'),
      ],
    };
  }

  return {
    id: latest.item.id,
    costPerBaseUnitCents: latest.item.costPerBaseUnitCents,
    purchasedAt: latest.item.purchasedAt,
    createdAt: latest.item.createdAt,
    warnings: [],
  };
}

export function calculateAverageProductCost(
  history: FinanceProductCostHistoryItem[],
): number | null {
  if (history.length === 0) {
    return null;
  }

  const totals = history.reduce(
    (current, item) => ({
      baseUnits: current.baseUnits + item.totalBaseUnits,
      priceCents: current.priceCents + item.totalPriceCents,
    }),
    { baseUnits: 0, priceCents: 0 },
  );

  if (totals.baseUnits <= 0) {
    return null;
  }

  return Math.round(totals.priceCents / totals.baseUnits);
}

export function calculatePackagingUnits(
  totalEmpanadas: number,
  groupSizeUnits = FINANCE_DEFAULT_PACKAGING_GROUP_SIZE,
): number {
  assertNonNegativeNumber(totalEmpanadas, 'totalEmpanadas');
  assertPositiveNumber(groupSizeUnits, 'groupSizeUnits');

  return Math.ceil(totalEmpanadas / groupSizeUnits);
}

export function calculateBaseRawMaterialCost(
  input: FinanceBaseRawMaterialCostInput,
): FinanceBaseRawMaterialCost {
  assertNonNegativeNumber(input.totalEmpanadas, 'totalEmpanadas');

  const rules = input.rules.filter(
    (rule) => rule.isActive !== false && rule.componentType === 'base_raw_material',
  );
  const warnings: FinanceCostWarning[] = [];

  if (rules.length === 0) {
    warnings.push(
      createWarning('missing_base_raw_material_rules', 'No active base raw material rules exist.'),
    );
  }

  const components = rules.flatMap((rule) => {
    const unitCostCents = rule.latestCostCents;
    if (unitCostCents === undefined || unitCostCents === null) {
      warnings.push(createMissingCostWarning(rule));
      return [];
    }

    const groupSizeUnits = rule.groupSizeUnits ?? FINANCE_DEFAULT_PACKAGING_GROUP_SIZE;
    if (rule.appliesTo === 'per_started_dozen') {
      assertPositiveNumber(groupSizeUnits, 'groupSizeUnits');
    }

    const groups =
      rule.appliesTo === 'per_started_dozen'
        ? rule.roundingMode === 'exact'
          ? input.totalEmpanadas / groupSizeUnits
          : calculatePackagingUnits(input.totalEmpanadas, groupSizeUnits)
        : input.totalEmpanadas;
    const totalQuantity = groups * rule.quantity;

    return [
      {
        ruleId: rule.id,
        productId: rule.productId,
        name: rule.name,
        quantity: rule.quantity,
        totalQuantity,
        unitCostCents,
        totalCostCents: multiplyCents(unitCostCents, totalQuantity),
      },
    ];
  });

  return {
    totalEmpanadas: input.totalEmpanadas,
    totalCostCents: sumCents(components),
    components,
    warnings,
  };
}

export function calculatePackagingCost(input: FinancePackagingCostInput): FinancePackagingCost {
  assertNonNegativeNumber(input.totalEmpanadas, 'totalEmpanadas');

  const rules = input.rules.filter(
    (rule) =>
      rule.isActive !== false &&
      rule.componentType === 'packaging' &&
      rule.appliesTo === 'per_started_dozen',
  );
  const warnings: FinanceCostWarning[] = [];

  if (rules.length === 0) {
    warnings.push(createWarning('missing_packaging_rules', 'No active packaging rules exist.'));
  }

  let packagingUnits = rules.length === 0 ? calculatePackagingUnits(input.totalEmpanadas) : 0;
  const components = rules.flatMap((rule) => {
    const groupSizeUnits = rule.groupSizeUnits ?? FINANCE_DEFAULT_PACKAGING_GROUP_SIZE;
    const ruleGroups =
      rule.roundingMode === 'exact'
        ? input.totalEmpanadas / groupSizeUnits
        : calculatePackagingUnits(input.totalEmpanadas, groupSizeUnits);
    packagingUnits = Math.max(packagingUnits, Math.ceil(ruleGroups));

    const unitCostCents = rule.latestCostCents;
    if (unitCostCents === undefined || unitCostCents === null) {
      warnings.push(createMissingCostWarning(rule));
      return [];
    }

    const totalQuantity = ruleGroups * rule.quantity;

    return [
      {
        ruleId: rule.id,
        productId: rule.productId,
        name: rule.name,
        quantity: rule.quantity,
        totalQuantity,
        unitCostCents,
        totalCostCents: multiplyCents(unitCostCents, totalQuantity),
      },
    ];
  });

  return {
    totalEmpanadas: input.totalEmpanadas,
    packagingUnits,
    totalCostCents: sumCents(components),
    components,
    warnings,
  };
}

export function calculateRecipeCostPerDozen(input: {
  recipeItems: FinanceRecipeCostItem[];
}): FinanceRecipeCost {
  const warnings: FinanceCostWarning[] = [];

  const items = input.recipeItems.flatMap((item) => {
    assertNonNegativeNumber(item.quantityBase, 'quantityBase');

    if (item.latestCostCents === undefined || item.latestCostCents === null) {
      warnings.push(
        createWarning('missing_cost', `Missing latest cost for ${item.name ?? item.productId}.`, {
          productId: item.productId,
          productName: item.name ?? null,
        }),
      );
      return [];
    }

    return [
      {
        ...item,
        totalCostCents: multiplyCents(item.latestCostCents, item.quantityBase),
      },
    ];
  });

  return {
    totalCostCents: sumCents(items),
    items,
    warnings,
  };
}

export function calculateRecipeCostPerUnit(input: {
  recipeItems: FinanceRecipeCostItem[];
}): FinanceRecipeUnitCost {
  const dozen = calculateRecipeCostPerDozen(input);

  return {
    ...dozen,
    totalCostCents: Math.round(dozen.totalCostCents / 12),
    totalCostPerDozenCents: dozen.totalCostCents,
  };
}

export function calculateOrderCostBreakdown(
  input: FinanceOrderCostBreakdownInput,
): FinanceOrderCostBreakdown {
  assertIntegerCents(input.saleTotalCents, 'saleTotalCents');

  const totalEmpanadas = input.items.reduce((total, item) => {
    assertPositiveNumber(item.quantity, 'quantity');
    return total + item.quantity;
  }, 0);
  const baseRawMaterial = calculateBaseRawMaterialCost({
    totalEmpanadas,
    rules: input.baseRawMaterialRules,
  });
  const packaging = calculatePackagingCost({
    totalEmpanadas,
    rules: input.packagingRules,
  });
  const recipe = calculateOrderRecipeCost(input.items);
  const totalCostCents =
    baseRawMaterial.totalCostCents + packaging.totalCostCents + recipe.totalCostCents;
  const profitSummary = calculateProfitSummary({
    saleTotalCents: input.saleTotalCents,
    totalCostCents,
  });

  return {
    totalEmpanadas,
    packagingUnits: packaging.packagingUnits,
    baseRawMaterialCostCents: baseRawMaterial.totalCostCents,
    packagingCostCents: packaging.totalCostCents,
    recipeCostCents: recipe.totalCostCents,
    totalCostCents,
    profitSummary,
    warnings: [...baseRawMaterial.warnings, ...packaging.warnings, ...recipe.warnings],
  };
}

export function calculateProfitSummary(input: {
  saleTotalCents: number;
  totalCostCents: number;
}): FinanceProfitSummary {
  assertIntegerCents(input.saleTotalCents, 'saleTotalCents');
  assertIntegerCents(input.totalCostCents, 'totalCostCents');

  const grossProfitCents = input.saleTotalCents - input.totalCostCents;

  if (input.saleTotalCents === 0) {
    return {
      saleTotalCents: input.saleTotalCents,
      totalCostCents: input.totalCostCents,
      grossProfitCents,
      profitMarginPercent: 0,
      costRatioPercent: 0,
    };
  }

  return {
    saleTotalCents: input.saleTotalCents,
    totalCostCents: input.totalCostCents,
    grossProfitCents,
    profitMarginPercent: roundPercent((grossProfitCents / input.saleTotalCents) * 100),
    costRatioPercent: roundPercent((input.totalCostCents / input.saleTotalCents) * 100),
  };
}

function calculateOrderRecipeCost(items: FinanceOrderCostItem[]): {
  totalCostCents: number;
  warnings: FinanceCostWarning[];
} {
  const warnings: FinanceCostWarning[] = [];
  const totalCostCents = items.reduce((total, item) => {
    if (item.recipeCostPerUnitCents === undefined || item.recipeCostPerUnitCents === null) {
      warnings.push(
        createWarning(
          'missing_recipe_cost',
          `Missing recipe cost for ${item.name ?? item.menuItemId}.`,
          {
            menuItemId: item.menuItemId,
            menuItemName: item.name ?? null,
          },
        ),
      );
      return total;
    }

    return total + multiplyCents(item.recipeCostPerUnitCents, item.quantity);
  }, 0);

  return { totalCostCents, warnings };
}

function calculateTotalPriceFromUnitPrice(
  unitPriceCents: number | undefined,
  input: FinancePurchaseItemCostInput,
): number {
  if (unitPriceCents === undefined) {
    throw new Error('Either unitPriceCents or totalPriceCents is required');
  }

  assertPositiveIntegerCents(unitPriceCents, 'unitPriceCents');

  return multiplyCents(unitPriceCents, input.purchaseQuantity);
}

function compareHistoryItems(
  left: FinanceProductCostHistoryItem,
  leftIndex: number,
  right: FinanceProductCostHistoryItem,
  rightIndex: number,
): number {
  const leftTime = parseHistoryTime(left);
  const rightTime = parseHistoryTime(right);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const createdAtComparison =
    parseOptionalTime(left.createdAt) - parseOptionalTime(right.createdAt);
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  const idComparison = compareOptionalString(left.id, right.id);
  if (idComparison !== 0) {
    return idComparison;
  }

  return leftIndex - rightIndex;
}

function parseHistoryTime(item: FinanceProductCostHistoryItem): number {
  return parseOptionalTime(item.purchasedAt);
}

function parseOptionalTime(raw: string | undefined): number {
  if (raw === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function compareOptionalString(left: string | undefined, right: string | undefined): number {
  const normalizedLeft = left ?? '';
  const normalizedRight = right ?? '';

  if (normalizedLeft < normalizedRight) {
    return -1;
  }
  if (normalizedLeft > normalizedRight) {
    return 1;
  }

  return 0;
}

function parseCentsFraction(fraction: string): number {
  const cents = fraction.slice(0, 2).padEnd(2, '0');
  return cents.length === 0 ? 0 : Number.parseInt(cents, 10);
}

function assertPositiveNumber(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive`);
  }
}

function assertNonNegativeNumber(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be non-negative`);
  }
}

function assertIntegerCents(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer amount of cents`);
  }
}

function assertPositiveIntegerCents(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer amount of cents`);
  }
}

function multiplyCents(cents: number, quantity: number): number {
  assertIntegerCents(cents, 'cents');
  assertNonNegativeNumber(quantity, 'quantity');

  return Math.round(cents * quantity);
}

function sumCents(items: Array<{ totalCostCents: number }>): number {
  return items.reduce((total, item) => total + item.totalCostCents, 0);
}

function roundPercent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function createMissingCostWarning(rule: FinanceCostRule): FinanceCostWarning {
  return createWarning('missing_cost', `Missing latest cost for ${rule.name}.`, {
    productId: rule.productId,
    ruleId: rule.id ?? null,
    ruleName: rule.name,
  });
}

function createWarning(
  code: FinanceCostWarningCode,
  message: string,
  context?: Record<string, string | number | boolean | null>,
): FinanceCostWarning {
  return context === undefined ? { code, message } : { code, message, context };
}
