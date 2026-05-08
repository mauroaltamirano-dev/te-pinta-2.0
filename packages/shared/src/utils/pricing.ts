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
