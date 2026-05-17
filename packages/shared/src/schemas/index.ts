import { z } from 'zod';

const trimmedString = z.string().trim().min(1);
const idSchema = trimmedString;
const moneySchema = z.number().finite().nonnegative();
const positiveIntegerSchema = z.number().int().positive();
const percentSchema = z.number().finite().min(0).max(100);

export const orderStatusSchema = z.enum(['confirmado', 'preparado', 'entregado']);
export const deliveryTimeSchema = z.enum(['mediodia', 'tarde', 'noche']);
export const deliveryTypeSchema = z.enum(['retiro', 'envio']);
export const ingredientUnitSchema = z.enum(['g', 'kg', 'ml', 'l', 'u']);

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
