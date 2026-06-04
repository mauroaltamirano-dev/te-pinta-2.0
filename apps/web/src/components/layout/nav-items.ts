import {
  BarChart3,
  ClipboardList,
  CircleDollarSign,
  Factory,
  Gauge,
  PackageOpen,
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
  { label: 'Producción', href: '/production', icon: Factory },
  { label: 'Ventas', href: '/sales', icon: BarChart3 },
  { label: 'Clientes', href: '/customers', icon: Users },
  { label: 'Stock', href: '/stock', icon: PackageOpen },
  { label: 'Gestión', href: '/finanzas', icon: CircleDollarSign },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export const mobileNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge },
  { label: 'Pedidos', href: '/orders', icon: ClipboardList },
  { label: 'Gestión', href: '/finanzas', icon: CircleDollarSign },
  { label: 'Productos', href: '/menu', icon: ShoppingBasket },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export const secondaryNavItems: NavItem[] = [
  { label: 'Inicio', href: '/', icon: PackageOpen },
  { label: 'Productos', href: '/menu', icon: ShoppingBasket },
];

export const navAliases: NavItem[] = [
  { label: 'Menú', href: '/menu', icon: ShoppingBasket },
];
