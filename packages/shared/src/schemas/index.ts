import { z } from 'zod';

const trimmedString = z.string().trim().min(1);
const idSchema = trimmedString;
const moneySchema = z.number().finite().nonnegative();
const moneyCentsSchema = z.number().int().nonnegative();
const positiveMoneyCentsSchema = z.number().int().positive();
const positiveIntegerSchema = z.number().int().positive();
const positiveNumberSchema = z.number().finite().positive();
const percentSchema = z.number().finite().min(0).max(100);

export const orderStatusSchema = z.enum(['confirmado', 'preparado', 'entregado']);
export const deliveryTimeSchema = z.enum(['mediodia', 'tarde', 'noche']);
export const deliveryTypeSchema = z.enum(['retiro', 'envio']);
export const ingredientUnitSchema = z.enum(['g', 'kg', 'ml', 'l', 'u']);

export const financeProductCategorySchema = z.enum([
  'raw_material',
  'packaging',
  'operating_expense',
  'service',
  'fuel',
  'investment',
  'other',
]);
export const financeBaseUnitSchema = z.enum(['unit', 'g', 'kg', 'ml', 'l', 'pack']);
export const financePurchaseUnitSchema = financeBaseUnitSchema;
export const financeStockMovementTypeSchema = z.enum([
  'purchase_in',
  'manual_in',
  'manual_out',
  'waste',
  'order_consumption',
  'adjustment',
]);
export const financeManualStockMovementTypeSchema = z.enum([
  'manual_in',
  'manual_out',
  'waste',
  'adjustment',
]);
export const financeCostComponentTypeSchema = z.enum(['base_raw_material', 'packaging']);
export const financeCostRuleAppliesToSchema = z.enum(['per_empanada', 'per_started_dozen']);
export const financeRoundingModeSchema = z.enum(['exact', 'ceil']);

type FinanceBaseCostRulePayload = {
  componentType?: z.infer<typeof financeCostComponentTypeSchema>;
  appliesTo?: z.infer<typeof financeCostRuleAppliesToSchema>;
  groupSizeUnits?: number;
  roundingMode?: z.infer<typeof financeRoundingModeSchema>;
};

const normalizeFinanceBaseCostRulePayload = <T extends FinanceBaseCostRulePayload>(value: T): T => {
  if (value.componentType === 'packaging') {
    return {
      ...value,
      appliesTo: 'per_started_dozen',
      groupSizeUnits: value.groupSizeUnits ?? 12,
      roundingMode: 'ceil',
    };
  }

  if (value.componentType === 'base_raw_material' && value.appliesTo === 'per_empanada') {
    return {
      ...value,
      groupSizeUnits: value.groupSizeUnits ?? 12,
      roundingMode: 'exact',
    };
  }

  if (value.componentType === 'base_raw_material' && value.appliesTo === 'per_started_dozen') {
    return {
      ...value,
      groupSizeUnits: value.groupSizeUnits ?? 12,
      roundingMode: value.roundingMode ?? 'ceil',
    };
  }

  return value;
};

export const adminEnvSchema = z.object({
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_NAME: trimmedString,
});

export const authLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const createCustomerSchema = z.object({
  name: trimmedString,
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one customer field is required');

export const createMenuItemSchema = z.object({
  name: trimmedString,
  priceUnit: moneySchema,
  priceHalfDozen: moneySchema,
  priceDozen: moneySchema,
  costPerDozen: moneySchema.default(0),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
});

export const updateMenuItemSchema = createMenuItemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one menu item field is required');

export const createIngredientSchema = z.object({
  name: trimmedString,
  unit: ingredientUnitSchema,
  purchasePrice: moneySchema,
});

export const updateIngredientSchema = createIngredientSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one ingredient field is required');

export const createFinanceProductSchema = z.object({
  name: trimmedString,
  category: financeProductCategorySchema,
  baseUnit: financeBaseUnitSchema,
  stockTracking: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateFinanceProductSchema = createFinanceProductSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one finance product field is required',
  );

export const financeProductFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: financeProductCategorySchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .or(z.boolean())
    .optional(),
});

export const createFinancePurchaseItemSchema = z
  .object({
    productId: idSchema,
    purchaseUnit: financePurchaseUnitSchema,
    purchaseQuantity: positiveNumberSchema,
    unitsPerPackage: positiveNumberSchema,
    unitPriceCents: positiveMoneyCentsSchema.optional(),
    totalPriceCents: positiveMoneyCentsSchema.optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (value) => (value.unitPriceCents === undefined) !== (value.totalPriceCents === undefined),
    {
      message: 'Exactly one of unitPriceCents or totalPriceCents is required',
      path: ['unitPriceCents'],
    },
  );

export const createFinancePurchaseSchema = z.object({
  purchaseDate: z.iso.date(),
  supplier: z.string().trim().optional(),
  receiptNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(createFinancePurchaseItemSchema).min(1),
});

export const updateFinancePurchaseSchema = createFinancePurchaseSchema
  .partial()
  .extend({
    items: z.array(createFinancePurchaseItemSchema).min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one finance purchase field is required',
  );

export const financePurchaseFiltersSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  supplier: z.string().trim().optional(),
  category: financeProductCategorySchema.optional(),
});

export const cancelFinancePurchaseSchema = z
  .object({
    reason: z.string().trim().optional(),
  })
  .default({});

const financeBaseCostRuleFields = {
  productId: idSchema,
  name: trimmedString,
  componentType: financeCostComponentTypeSchema,
  appliesTo: financeCostRuleAppliesToSchema,
  quantity: positiveNumberSchema,
  groupSizeUnits: positiveIntegerSchema,
  roundingMode: financeRoundingModeSchema,
  isActive: z.boolean(),
} as const;

export const createFinanceBaseCostRuleSchema = z
  .object({
    ...financeBaseCostRuleFields,
    groupSizeUnits: financeBaseCostRuleFields.groupSizeUnits.default(12),
    roundingMode: financeBaseCostRuleFields.roundingMode.default('ceil'),
    isActive: financeBaseCostRuleFields.isActive.default(true),
  })
  .transform(normalizeFinanceBaseCostRulePayload);

export const updateFinanceBaseCostRuleSchema = z
  .object(financeBaseCostRuleFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one base cost rule field is required')
  .transform(normalizeFinanceBaseCostRulePayload);

export const financeRecipeItemInputSchema = z.object({
  productId: idSchema,
  quantityPerDozen: positiveNumberSchema,
  unit: financeBaseUnitSchema,
  quantityBase: positiveNumberSchema,
  notes: z.string().trim().optional(),
});

export const updateFinanceRecipeSchema = z.object({
  menuItemId: idSchema,
  items: z.array(financeRecipeItemInputSchema).default([]),
});

export const createFinanceStockAdjustmentSchema = z.object({
  productId: idSchema,
  movementType: financeManualStockMovementTypeSchema,
  quantity: positiveNumberSchema,
  notes: z.string().trim().optional(),
});

export const financeStockFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: financeProductCategorySchema.optional(),
});

export const financeCostingPreviewOrderItemSchema = z.object({
  menuItemId: idSchema,
  quantity: positiveIntegerSchema,
});

export const financeCostingPreviewOrderSchema = z.object({
  saleTotalCents: moneyCentsSchema,
  items: z.array(financeCostingPreviewOrderItemSchema).min(1),
});

export const financeSummaryQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const updateSettingSchema = z.object({
  key: trimmedString,
  value: z.string().trim(),
});

export const orderItemInputSchema = z.object({
  menuItemId: idSchema,
  quantity: positiveIntegerSchema,
});

export const orderAddonInputSchema = z.object({
  addonId: idSchema,
  quantity: positiveIntegerSchema,
});

export const existingOrderCustomerSchema = z.object({
  existingCustomerId: idSchema,
});

export const newOrderCustomerSchema = z.object({
  newCustomer: createCustomerSchema,
});

export const orderCustomerSchema = z.union([existingOrderCustomerSchema, newOrderCustomerSchema]);

export const createOrderSchema = z.object({
  customer: orderCustomerSchema,
  deliveryDate: z.iso.date(),
  deliveryTime: deliveryTimeSchema,
  deliveryType: deliveryTypeSchema,
  cooked: z.boolean().default(false),
  notes: z.string().trim().optional(),
  discountPercent: percentSchema.default(0),
  deliveryFee: moneySchema.default(0),
  items: z.array(orderItemInputSchema).min(1),
  addons: z.array(orderAddonInputSchema).default([]),
});

export const updateOrderSchema = createOrderSchema.partial().extend({
  status: orderStatusSchema.optional(),
  isPaid: z.boolean().optional(),
});

export const orderFiltersSchema = z.object({
  fecha: z.iso.date().optional(),
  estado: orderStatusSchema.optional(),
  cliente: z.string().trim().optional(),
  franja: deliveryTimeSchema.optional(),
  deliveryType: deliveryTypeSchema.optional(),
  cooked: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .or(z.boolean())
    .optional(),
  isPaid: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .or(z.boolean())
    .optional(),
  visibility: z.enum(['active', 'finalized']).optional(),
  sortBy: z
    .enum(['deliveryDate', 'customerName', 'total', 'status', 'deliveryType', 'createdAt'])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const dashboardQuerySchema = z.object({
  date: z.iso.date().optional(),
});

export const apiErrorSchema = z.object({
  error: trimmedString,
  code: z.string().trim().optional(),
});
