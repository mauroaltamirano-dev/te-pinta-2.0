export type CalculateItemPriceInput = {
  quantity: number;
  priceUnit: number;
  priceHalfDozen: number;
  priceDozen: number;
};

export type CalculatedItemPrice = {
  quantity: number;
  dozens: number;
  halfDozens: number;
  units: number;
  total: number;
};

export type OrderPromotionConfig = {
  bulkDozenThreshold: number;
  bulkDiscountPercent: number;
  combinedDozenQuantity: number;
  combinedDozenPrice: number;
};

export type CalculateOrderPromotionInput = {
  items: { quantity: number; subtotal: number }[];
  addons?: { quantity: number; subtotal: number }[];
  manualDiscountPercent?: number;
  deliveryFee?: number;
  promotions?: Partial<OrderPromotionConfig>;
};

export type AppliedPromotion = {
  key: 'combined_dozen' | 'bulk_dozen' | 'manual_discount';
  label: string;
  amount: number;
};

export type CalculatedOrderPromotion = {
  subtotal: number;
  itemsSubtotal: number;
  addonsSubtotal: number;
  totalQuantity: number;
  promoSubtotal: number;
  discountPercent: number;
  discount: number;
  deliveryFee: number;
  total: number;
  appliedPromotions: AppliedPromotion[];
};

export const defaultOrderPromotionConfig: OrderPromotionConfig = {
  bulkDozenThreshold: 3,
  bulkDiscountPercent: 10,
  combinedDozenQuantity: 12,
  combinedDozenPrice: 15000,
};

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be positive`);
  }
};

const assertNonNegativeMoney = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
};

export const calculateItemPrice = ({
  quantity,
  priceUnit,
  priceHalfDozen,
  priceDozen,
}: CalculateItemPriceInput): CalculatedItemPrice => {
  assertPositiveInteger(quantity, 'Quantity');
  assertNonNegativeMoney(priceUnit, 'Unit price');
  assertNonNegativeMoney(priceHalfDozen, 'Half-dozen price');
  assertNonNegativeMoney(priceDozen, 'Dozen price');

  const dozens = Math.floor(quantity / 12);
  const afterDozens = quantity % 12;
  const halfDozens = Math.floor(afterDozens / 6);
  const units = afterDozens % 6;
  const total = dozens * priceDozen + halfDozens * priceHalfDozen + units * priceUnit;

  return {
    quantity,
    dozens,
    halfDozens,
    units,
    total,
  };
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const toSafeNonNegative = (value: number | undefined, fallback = 0): number =>
  Number.isFinite(value) && (value ?? 0) >= 0 ? (value ?? fallback) : fallback;

export const calculateOrderPromotion = ({
  items,
  addons = [],
  manualDiscountPercent = 0,
  deliveryFee = 0,
  promotions,
}: CalculateOrderPromotionInput): CalculatedOrderPromotion => {
  const config = { ...defaultOrderPromotionConfig, ...promotions };
  const itemsSubtotal = roundMoney(items.reduce((total, item) => total + item.subtotal, 0));
  const addonsSubtotal = roundMoney(addons.reduce((total, addon) => total + addon.subtotal, 0));
  const subtotal = roundMoney(itemsSubtotal + addonsSubtotal);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const appliedPromotions: AppliedPromotion[] = [];

  let promoItemsSubtotal = itemsSubtotal;

  const isCombinedDozen =
    items.length > 1 &&
    totalQuantity === config.combinedDozenQuantity &&
    config.combinedDozenPrice > 0 &&
    itemsSubtotal > config.combinedDozenPrice;

  if (isCombinedDozen) {
    const amount = roundMoney(itemsSubtotal - config.combinedDozenPrice);
    promoItemsSubtotal = config.combinedDozenPrice;
    appliedPromotions.push({
      key: 'combined_dozen',
      label: 'Docena combinada',
      amount,
    });
  }

  const dozens = Math.floor(totalQuantity / 12);
  const configuredBulkDiscount = toSafeNonNegative(config.bulkDiscountPercent);
  const safeManualDiscount = toSafeNonNegative(manualDiscountPercent);
  const discountPercent =
    dozens >= config.bulkDozenThreshold
      ? Math.max(safeManualDiscount, configuredBulkDiscount)
      : safeManualDiscount;
  const promoSubtotal = roundMoney(promoItemsSubtotal + addonsSubtotal);
  const discount = roundMoney(promoSubtotal * (discountPercent / 100));

  if (dozens >= config.bulkDozenThreshold && discountPercent > 0) {
    appliedPromotions.push({
      key: 'bulk_dozen',
      label: `${config.bulkDozenThreshold}+ docenas`,
      amount: discount,
    });
  } else if (safeManualDiscount > 0) {
    appliedPromotions.push({
      key: 'manual_discount',
      label: 'Descuento manual',
      amount: discount,
    });
  }

  const safeDeliveryFee = toSafeNonNegative(deliveryFee);
  const total = roundMoney(promoSubtotal - discount + safeDeliveryFee);

  return {
    subtotal,
    itemsSubtotal,
    addonsSubtotal,
    totalQuantity,
    promoSubtotal,
    discountPercent,
    discount,
    deliveryFee: safeDeliveryFee,
    total,
    appliedPromotions,
  };
};
