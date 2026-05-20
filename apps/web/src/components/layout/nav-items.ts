import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Gauge,
  PackageOpen,
  PieChart,
  Settings,
  ShoppingBasket,
  Users,
  WalletCards,
  Wheat,
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
  { label: 'Agenda', href: '/agenda', icon: CalendarDays },
  { label: 'Clientes', href: '/customers', icon: Users },
  { label: 'Productos', href: '/menu', icon: ShoppingBasket },
  { label: 'Ingredientes', href: '/ingredients', icon: Wheat },
  { label: 'Finanzas', href: '/finances', icon: WalletCards },
  { label: 'Reportes', href: '/reports', icon: BarChart3 },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export const secondaryNavItems: NavItem[] = [{ label: 'Inicio', href: '/', icon: PackageOpen }];

export const navAliases: NavItem[] = [
  { label: 'Menú', href: '/menu', icon: PieChart },
];
