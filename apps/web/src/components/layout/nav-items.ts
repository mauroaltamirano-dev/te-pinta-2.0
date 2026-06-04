import {
  ClipboardList,
  CircleDollarSign,
  Gauge,
  PackageOpen,
  PieChart,
  Settings,
  ShoppingBasket,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge },
  { label: 'Pedidos', href: '/orders', icon: ClipboardList },
  { label: 'Clientes', href: '/customers', icon: Users },
  { label: 'Finanzas', href: '/finanzas', icon: CircleDollarSign },
  { label: 'Productos', href: '/menu', icon: ShoppingBasket },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export const mobileNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge },
  { label: 'Pedidos', href: '/orders', icon: ClipboardList },
  { label: 'Finanzas', href: '/finanzas', icon: CircleDollarSign },
  { label: 'Productos', href: '/menu', icon: ShoppingBasket },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export const secondaryNavItems: NavItem[] = [{ label: 'Inicio', href: '/', icon: PackageOpen }];

export const navAliases: NavItem[] = [
  { label: 'Menú', href: '/menu', icon: PieChart },
];
