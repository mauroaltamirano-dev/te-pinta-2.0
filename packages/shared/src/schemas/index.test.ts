import { describe, expect, it } from 'vitest';

import {
  adminEnvSchema,
  createCustomerSchema,
  createIngredientSchema,
  createMenuItemSchema,
  createOrderSchema,
  deliveryTimeSchema,
  deliveryTypeSchema,
  orderStatusSchema,
  updateSettingSchema,
} from './index';

describe('shared domain schemas', () => {
  it('validates admin env credentials for seed/bootstrap', () => {
    expect(
      adminEnvSchema.parse({
        ADMIN_EMAIL: 'admin@tepinta.com',
        ADMIN_PASSWORD: 'super-secret',
        ADMIN_NAME: 'Admin Te Pinta',
      }),
    ).toEqual({
      ADMIN_EMAIL: 'admin@tepinta.com',
      ADMIN_PASSWORD: 'super-secret',
      ADMIN_NAME: 'Admin Te Pinta',
    });
  });

  it('validates menu item prices and active flag', () => {
    expect(
      createMenuItemSchema.parse({
        name: 'Carne suave',
        priceUnit: 1200,
        priceHalfDozen: 6000,
        priceDozen: 11000,
        costPerDozen: 4500,
      }),
    ).toMatchObject({ name: 'Carne suave', isActive: true });
  });

  it('validates customer, ingredient, setting, and order contracts', () => {
    expect(createCustomerSchema.parse({ name: 'Mauro', phone: '+5491112345678' }).phone).toBe(
      '+5491112345678',
    );
    expect(
      createIngredientSchema.parse({ name: 'Harina', unit: 'kg', purchasePrice: 1000 }).unit,
    ).toBe('kg');
    expect(updateSettingSchema.parse({ key: 'delivery_fee', value: '500' }).key).toBe(
      'delivery_fee',
    );
    expect(
      createOrderSchema.parse({
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-06',
        deliveryTime: 'noche',
        deliveryType: 'envio',
        cooked: false,
        discountPercent: 10,
        deliveryFee: 500,
        items: [{ menuItemId: 'item-1', quantity: 13 }],
        addons: [{ addonId: 'yasgua_salsa', quantity: 2 }],
      }).items[0]?.quantity,
    ).toBe(13);
  });

  it('exposes enum values used by API and web', () => {
    expect(orderStatusSchema.options).toEqual(['confirmado', 'preparado', 'entregado']);
    expect(deliveryTimeSchema.options).toEqual(['mediodia', 'tarde', 'noche']);
    expect(deliveryTypeSchema.options).toEqual(['retiro', 'envio']);
  });
});
