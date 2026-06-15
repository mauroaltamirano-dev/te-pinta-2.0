import type { z } from 'zod';

import type {
  adminEnvSchema,
  apiErrorSchema,
  authLoginSchema,
  cancelFinancePurchaseSchema,
  createCustomerSchema,
  createFinanceBaseCostRuleSchema,
  createFinanceProductSchema,
  createFinancePurchaseItemSchema,
  createFinancePurchaseSchema,
  createFinanceStockAdjustmentSchema,
  createFinanceWalletAdjustmentSchema,
  createIngredientSchema,
  createMenuItemSchema,
  createOrderSchema,
  dashboardQuerySchema,
  deliveryTimeSchema,
  deliveryTypeSchema,
  financeAssumptionsSchema,
  financeBaseUnitSchema,
  financeCostComponentTypeSchema,
  financeCostingPreviewOrderItemSchema,
  financeCostingPreviewOrderSchema,
  financeCostRuleAppliesToSchema,
  financeManualStockMovementTypeSchema,
  financeProductCategorySchema,
  financeProductFiltersSchema,
  financePurchaseFundingSourceSchema,
  financePurchaseItemImpactSchema,
  financePurchaseFiltersSchema,
  financePurchaseUnitSchema,
  financeRecipeItemInputSchema,
  financeRoundingModeSchema,
  financeStockFiltersSchema,
  financeStockMovementTypeSchema,
  financeSummaryQuerySchema,
  financeWalletMovementDirectionSchema,
  financeWalletMovementFiltersSchema,
  financeWalletMovementSchema,
  financeWalletMovementSourceTypeSchema,
  financeWalletSchema,
  ingredientUnitSchema,
  orderFiltersSchema,
  orderAddonInputSchema,
  orderItemInputSchema,
  orderStatusSchema,
  updateCustomerSchema,
  updateFinanceBaseCostRuleSchema,
  updateFinanceProductSchema,
  updateFinancePurchaseSchema,
  updateFinanceRecipeSchema,
  updateIngredientSchema,
  updateMenuItemSchema,
  updateOrderSchema,
  updateSettingSchema,
} from '../schemas/index';

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type DeliveryTime = z.infer<typeof deliveryTimeSchema>;
export type DeliveryType = z.infer<typeof deliveryTypeSchema>;
export type IngredientUnit = z.infer<typeof ingredientUnitSchema>;
export type FinanceProductCategory = z.infer<typeof financeProductCategorySchema>;
export type FinanceBaseUnit = z.infer<typeof financeBaseUnitSchema>;
export type FinancePurchaseUnit = z.infer<typeof financePurchaseUnitSchema>;
export type FinancePurchaseFundingSource = z.infer<typeof financePurchaseFundingSourceSchema>;
export type FinanceWallet = z.infer<typeof financeWalletSchema>;
export type FinanceWalletMovementDirection = z.infer<typeof financeWalletMovementDirectionSchema>;
export type FinanceWalletMovementSourceType = z.infer<typeof financeWalletMovementSourceTypeSchema>;
export type FinanceStockMovementType = z.infer<typeof financeStockMovementTypeSchema>;
export type FinanceManualStockMovementType = z.infer<typeof financeManualStockMovementTypeSchema>;
export type FinanceCostComponentType = z.infer<typeof financeCostComponentTypeSchema>;
export type FinanceCostRuleAppliesTo = z.infer<typeof financeCostRuleAppliesToSchema>;
export type FinanceRoundingMode = z.infer<typeof financeRoundingModeSchema>;

export type AdminEnv = z.infer<typeof adminEnvSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

export type CreateFinanceProductInput = z.infer<typeof createFinanceProductSchema>;
export type UpdateFinanceProductInput = z.infer<typeof updateFinanceProductSchema>;
export type FinanceProductFilters = z.infer<typeof financeProductFiltersSchema>;
export type FinanceAssumptions = z.infer<typeof financeAssumptionsSchema>;

export type CreateFinancePurchaseItemInput = z.infer<typeof createFinancePurchaseItemSchema>;
export type CreateFinancePurchaseInput = z.infer<typeof createFinancePurchaseSchema>;
export type UpdateFinancePurchaseInput = z.infer<typeof updateFinancePurchaseSchema>;
export type FinancePurchaseFilters = z.infer<typeof financePurchaseFiltersSchema>;
export type FinancePurchaseItemImpact = z.infer<typeof financePurchaseItemImpactSchema>;
export type CancelFinancePurchaseInput = z.infer<typeof cancelFinancePurchaseSchema>;
export type FinanceWalletMovementFilters = z.infer<typeof financeWalletMovementFiltersSchema>;
export type FinanceWalletMovement = z.infer<typeof financeWalletMovementSchema>;
export type CreateFinanceWalletAdjustmentInput = z.infer<
  typeof createFinanceWalletAdjustmentSchema
>;

export type CreateFinanceBaseCostRuleInput = z.infer<typeof createFinanceBaseCostRuleSchema>;
export type UpdateFinanceBaseCostRuleInput = z.infer<typeof updateFinanceBaseCostRuleSchema>;

export type FinanceRecipeItemInput = z.infer<typeof financeRecipeItemInputSchema>;
export type UpdateFinanceRecipeInput = z.infer<typeof updateFinanceRecipeSchema>;

export type CreateFinanceStockAdjustmentInput = z.infer<typeof createFinanceStockAdjustmentSchema>;
export type FinanceStockFilters = z.infer<typeof financeStockFiltersSchema>;

export type FinanceCostingPreviewOrderItemInput = z.infer<
  typeof financeCostingPreviewOrderItemSchema
>;
export type FinanceCostingPreviewOrderInput = z.infer<typeof financeCostingPreviewOrderSchema>;
export type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>;

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderAddonInput = z.infer<typeof orderAddonInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
