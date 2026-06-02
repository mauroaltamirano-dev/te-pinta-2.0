import { useDeliveryFee, useOrderPromotionSettings } from '../../orders/settings-hooks';
import { useMenuItems } from '../../menu/menu-hooks';
import {
  useFinanceBaseCostRules,
  useFinanceProducts,
  useFinancePurchases,
  useFinanceRecipes,
} from '../hooks';

export const useFinanceWorkspaceData = () => {
  const productsQuery = useFinanceProducts();
  const purchasesQuery = useFinancePurchases();
  const baseCostRulesQuery = useFinanceBaseCostRules();
  const recipesQuery = useFinanceRecipes();
  const menuItemsQuery = useMenuItems();
  const deliveryFeeQuery = useDeliveryFee();
  const orderPromotionSettingsQuery = useOrderPromotionSettings();

  return {
    productsQuery,
    purchasesQuery,
    baseCostRulesQuery,
    recipesQuery,
    menuItemsQuery,
    deliveryFeeQuery,
    orderPromotionSettingsQuery,
    products: productsQuery.data ?? [],
    purchases: purchasesQuery.data ?? [],
    baseCostRules: baseCostRulesQuery.data ?? [],
    recipes: recipesQuery.data ?? [],
    menuItems: menuItemsQuery.data ?? [],
  };
};

export type FinanceWorkspaceData = ReturnType<typeof useFinanceWorkspaceData>;
