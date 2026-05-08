import {
  ClipboardList,
  Gauge,
  type LucideIcon,
  PackageOpen,
  Settings,
  ShoppingBasket,
  Users,
  Wheat,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge },
  { label: 'Pedidos', href: '/orders', icon: ClipboardList },
  { label: 'Menú', href: '/menu', icon: ShoppingBasket },
  { label: 'Clientes', href: '/customers', icon: Users },
  { label: 'Ingredientes', href: '/ingredients', icon: Wheat },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const secondaryNavItems: NavItem[] = [{ label: 'Inicio', href: '/', icon: PackageOpen }];
