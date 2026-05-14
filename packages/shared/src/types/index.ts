import type { z } from 'zod';

import type {
  adminEnvSchema,
  apiErrorSchema,
  authLoginSchema,
  createCustomerSchema,
  createIngredientSchema,
  createMenuItemSchema,
  createOrderSchema,
  dashboardQuerySchema,
  deliveryTimeSchema,
  deliveryTypeSchema,
  ingredientUnitSchema,
  orderFiltersSchema,
  orderAddonInputSchema,
  orderItemInputSchema,
  orderStatusSchema,
  updateCustomerSchema,
  updateIngredientSchema,
  updateMenuItemSchema,
  updateOrderSchema,
  updateSettingSchema,
} from '../schemas/index';

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type DeliveryTime = z.infer<typeof deliveryTimeSchema>;
export type DeliveryType = z.infer<typeof deliveryTypeSchema>;
export type IngredientUnit = z.infer<typeof ingredientUnitSchema>;

export type AdminEnv = z.infer<typeof adminEnvSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderAddonInput = z.infer<typeof orderAddonInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
