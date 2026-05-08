# 🫔 Te Pinta — Documento Maestro de Contexto

> Sistema de gestión interna para el emprendimiento de empanadas "Te Pinta".
> Este documento contiene TODO el contexto necesario para iniciar el proyecto desde cero.

---

## 📌 Descripción General

Sistema web interno para 3 usuarios (sin roles diferenciados, acceso igual para todos).
Accesible desde cloud, optimizado para desktop y mobile.
Gestiona: pedidos, menú, clientes, ingredientes, reportes y configuración.

---

## 🛠️ Stack Técnico

### Infraestructura
- **Monorepo**: pnpm workspaces + Turborepo
- **Deploy frontend**: Vercel
- **Deploy backend**: Railway
- **Base de datos**: Neon (PostgreSQL)

### Frontend (`apps/web`)
- React 18 + Vite + TypeScript
- Tailwind CSS (con variables del brand kit — ver sección de colores)
- shadcn/ui (componentes base accesibles)
- React Hook Form + Zod (formularios y validación)
- TanStack Query v5 (server state, cache, loading states)
- Zustand (client state global)
- React Router v6
- Axios (HTTP client con instancia configurada)

### Backend (`apps/api`)
- Express.js + TypeScript
- Drizzle ORM + Drizzle Kit (migraciones)
- Zod (validación de inputs, schemas compartidos)
- JWT (access token 15min) + Refresh Token (7d, httpOnly cookie)
- bcrypt (hash de contraseñas, salt rounds 12)
- Helmet.js (headers de seguridad)
- CORS (solo dominio de Vercel)
- express-rate-limit (rutas de auth)

### Package compartido (`packages/shared`)
- Schemas Zod compartidos entre web y api
- Types TypeScript inferidos de los schemas
- Utilidades de cálculo de precios (`pricing.ts`)

---

## 🎨 Brand Kit — Identidad Visual

### Paleta Primaria
```
--color-rojo-piminton:    #B54A32   /* Horno, carne, especias, energía */
--color-crema-maiz:       #F3E7D1   /* Masa, harina, calidez casera */
--color-azul-noche:       #17325C   /* Solidez, contraste, elegancia argentina */
--color-verde-yerba:      #657447   /* Natural, noble, auténtico */
--color-oro-horno:        #D28A2D   /* Dorado, cocción, apetito */
```

### Paleta Secundaria
```
--color-arcilla:          #C7704F
--color-arena:            #E7D6BB
--color-carbon:           #333333
--color-rosa-sal:         #D9A193
--color-verde-hoja:       #7E9160
```

### Roles semánticos sugeridos para la UI
```
primary:        #B54A32   (Rojo Pimentón — CTAs, activos, acciones principales)
primary-dark:   #17325C   (Azul Noche — sidebar, headers, fondos oscuros)
secondary:      #D28A2D   (Oro Horno — badges, highlights, estados)
background:     #F3E7D1   (Crema Maíz — fondo general app)
surface:        #FFFFFF   (Cards, modales)
muted:          #E7D6BB   (Arena — bordes, fondos secundarios)
text-primary:   #333333   (Carbón)
text-muted:     #657447   (Verde Yerba — textos secundarios)
danger:         #C7704F   (Arcilla — errores, eliminar)
success:        #7E9160   (Verde Hoja — confirmados, entregados)
```

### Tipografías (importar desde Google Fonts)
```
Títulos/Display:  Fraunces (serif elegante, carácter argentino)
Cuerpo/UI:        Montserrat (legible, moderno, amigable)
Promos/Badges:    Oswald (condensada, impacto visual)
```

### Configuración Tailwind (`tailwind.config.ts`)
```ts
theme: {
  extend: {
    colors: {
      primary:     { DEFAULT: '#B54A32', dark: '#17325C' },
      secondary:   '#D28A2D',
      background:  '#F3E7D1',
      surface:     '#FFFFFF',
      muted:       '#E7D6BB',
      carbon:      '#333333',
      arcilla:     '#C7704F',
      arena:       '#E7D6BB',
      'rosa-sal':  '#D9A193',
      'verde-hoja':'#7E9160',
      'verde-yerba':'#657447',
    },
    fontFamily: {
      display: ['Fraunces', 'serif'],
      body:    ['Montserrat', 'sans-serif'],
      promo:   ['Oswald', 'sans-serif'],
    },
  }
}
```

### Criterios de estilo
- Contraste alto y lectura rápida
- Equilibrio entre rusticidad y limpieza
- Fondos cálidos y aireados (Crema Maíz como base)
- Acentos gráficos que recuerdan filetes, guardas y sellos argentinos
- Sin gradientes morados ni estéticas genéricas de IA

---

## 📁 Estructura de Carpetas

```
te-pinta/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── assets/             # Logo, íconos del brand kit
│   │       ├── components/
│   │       │   ├── ui/             # shadcn/ui primitivos
│   │       │   ├── layout/         # AppLayout, Sidebar, BottomNav, Header
│   │       │   └── shared/         # Componentes reutilizables de dominio
│   │       ├── features/
│   │       │   ├── dashboard/
│   │       │   ├── orders/         # Lista + formulario pedidos
│   │       │   ├── menu/           # CRUD variedades empanadas
│   │       │   ├── customers/      # CRUD clientes + historial
│   │       │   ├── ingredients/    # CRUD ingredientes
│   │       │   ├── reports/        # Ingresos, egresos, balance
│   │       │   └── settings/       # Config precio envío, usuarios
│   │       ├── hooks/              # useIsMobile, useAuth, etc.
│   │       ├── lib/                # axiosInstance, queryClient
│   │       ├── stores/             # Zustand stores
│   │       └── router/             # React Router config
│   │
│   └── api/
│       └── src/
│           ├── db/
│           │   ├── schema/         # Drizzle schema por entidad
│           │   └── migrations/
│           ├── modules/
│           │   ├── auth/           # login, refresh, logout
│           │   ├── orders/
│           │   ├── menu/
│           │   ├── customers/
│           │   ├── ingredients/
│           │   ├── reports/
│           │   └── settings/
│           ├── middlewares/        # authenticateJWT, validate, errorHandler, rateLimiter
│           ├── lib/                # db.ts, jwt.ts
│           └── app.ts / server.ts
│
└── packages/
    └── shared/
        └── src/
            ├── schemas/            # Zod schemas por entidad
            ├── types/              # Types inferidos
            └── utils/
                └── pricing.ts      # Lógica de cálculo de precios (prioridad mayor agrupamiento)
```

---

## 🗄️ Esquema de Base de Datos (Drizzle/PostgreSQL)

### `users`
```
id, name, email, password_hash, created_at
```
> Sin registro público. Creados únicamente por seed script.

### `customers`
```
id, name, phone (UNIQUE), address, created_at, updated_at
```

### `menu_items`
```
id, name, price_unit, price_half_dozen, price_dozen,
cost_per_dozen (fijo por ahora), is_active, created_at, updated_at
```

### `ingredients`
```
id, name, unit (enum: g, kg, ml, l, u), purchase_price, created_at, updated_at
```

### `orders`
```
id, customer_id (FK),
delivery_date (date),
delivery_time (enum: mediodia, tarde, noche),
delivery_type (enum: retiro, envio),
cooked (boolean, default false),  -- false = crudas
notes (text, nullable),
discount_percent (decimal, default 0),
delivery_fee (decimal, default 0),
subtotal (decimal),
total (decimal),
status (enum: confirmado, preparado, entregado),
created_at, updated_at
```

### `order_items`
```
id, order_id (FK), menu_item_id (FK),
quantity (integer),       -- siempre en unidades
unit_price (decimal),     -- precio calculado al momento del pedido
subtotal (decimal),
```

### `expenses`
```
id, description, amount, category (enum: ingredientes, packaging, servicios, otro),
date, notes, created_at
```

### `settings`
```
key (PRIMARY KEY, varchar), value (text), updated_at
-- Ejemplo: { key: 'delivery_fee', value: '500' }
```

---

## 💡 Lógica de Negocio Clave

### Cálculo de precios (`packages/shared/utils/pricing.ts`)
- Siempre priorizar el mayor agrupamiento:
  - 12 unidades → precio de 1 docena (no 12 unidades)
  - 8 unidades → precio de 1 media docena + 2 unidades
  - 13 unidades → precio de 1 docena + 1 unidad
  - 4 unidades → precio de 4 unidades
- Esta función recibe `{ quantity, priceUnit, priceHalfDozen, priceDozen }` y retorna el precio óptimo.
- Usada tanto en frontend (preview en tiempo real) como en backend (precio guardado en DB).

### Clientes
- El teléfono es el identificador único (UNIQUE en DB).
- En el form de pedido: dropdown "Cliente existente" (busca por nombre/teléfono) o "Cliente nuevo".
- Al crear pedido con cliente nuevo → se guarda automáticamente en `customers`.

### Pedidos
- El precio de envío se lee de `settings.delivery_fee` y se suma al total si `delivery_type = 'envio'`.
- El descuento se aplica sobre el subtotal: `total = subtotal * (1 - discount/100) + delivery_fee`.
- El precio de cada `order_item` se guarda al momento del pedido (snapshot), no referenciado dinámicamente.

### Selector de empanadas en el form
- Por cada variedad activa del menú, mostrar un mini-panel con 3 inputs: Docena / Media docena / Unidades.
- Las 3 entradas se suman como unidades: `total_units = docenas*12 + medias*6 + unidades`.
- El valor que va a `order_items.quantity` siempre es en unidades totales.
- El precio se calcula con `pricing.ts` basándose en esas unidades totales.

---

## 📱 Responsive Strategy

```
≥ 768px (md):   Sidebar fijo izquierdo — fondo Azul Noche (#17325C), íconos + labels
< 768px:        Bottom Navigation Bar — 5 íconos principales, compacto, táctil
```

Colores sidebar:
- Fondo: `#17325C` (Azul Noche Criolla)
- Ítem activo: `#B54A32` (Rojo Pimentón) con fondo semitransparente
- Texto: `#F3E7D1` (Crema Maíz)
- Hover: `rgba(243, 231, 209, 0.1)`

---

## 🔐 Seguridad

- JWT access token (15 min) + refresh token en httpOnly cookie (7 días)
- bcrypt con salt rounds 12
- CORS: solo dominio configurado en env var `ALLOWED_ORIGIN`
- Todos los inputs del API validados con Zod antes de tocar la DB
- Helmet.js en todas las rutas
- Rate limiting en `/api/auth/*` (max 10 req/15min por IP)
- Variables de entorno validadas con Zod al arrancar la app (fail fast)
- Sin endpoint `POST /register` expuesto (usuarios por seed)
- Sanitización de strings en campos de texto libre (notas, nombres)

---

## 🧩 Módulos y Rutas

### Navegación principal (sidebar/bottom nav)
```
/               → Dashboard
/pedidos        → Lista de pedidos
/pedidos/nuevo  → Formulario nuevo pedido
/pedidos/:id    → Detalle / editar pedido
/menu           → CRUD variedades
/clientes       → Lista clientes
/clientes/:id   → Perfil + historial cliente
/ingredientes   → CRUD ingredientes
/reportes       → Ingresos, egresos, balance
/configuracion  → Settings generales
```

### API REST (`/api/v1/...`)
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /orders            ?fecha&estado&cliente&franja
POST   /orders
GET    /orders/:id
PUT    /orders/:id
DELETE /orders/:id
PATCH  /orders/:id/status

GET    /menu-items
POST   /menu-items
PUT    /menu-items/:id
DELETE /menu-items/:id

GET    /customers         ?search
POST   /customers
GET    /customers/:id
PUT    /customers/:id
GET    /customers/:id/orders

GET    /ingredients
POST   /ingredients
PUT    /ingredients/:id
DELETE /ingredients/:id

GET    /reports/summary   ?from&to
GET    /reports/expenses
POST   /reports/expenses
PUT    /reports/expenses/:id
DELETE /reports/expenses/:id

GET    /settings
PUT    /settings/:key
```

---

## 🗺️ Roadmap por Fases

### Fase 1 — Fundación
- [ ] Setup monorepo pnpm + Turborepo
- [ ] Configuración TypeScript, ESLint, Prettier compartidos
- [ ] Schema Drizzle completo + migraciones iniciales + seed de usuarios
- [ ] Auth completa (login, JWT, refresh, logout, middleware)
- [ ] Layout base: AppLayout, Sidebar (desktop) + BottomNav (mobile) con brand kit aplicado

### Fase 2 — Core del negocio
- [ ] Módulo Menú (CRUD variedades con precios)
- [ ] Módulo Clientes (CRUD + búsqueda)
- [ ] Módulo Pedidos (formulario completo + lista + filtros + estados)

### Fase 3 — Soporte operativo
- [ ] Dashboard (métricas del día: pedidos, total, franjas, top variedades)
- [ ] Módulo Ingredientes (CRUD)
- [ ] Módulo Reportes (ingresos, egresos, balance por período)

### Fase 4 — Mejoras futuras
- [ ] Costo calculado dinámicamente desde ingredientes por variedad
- [ ] Estadísticas por cliente (más pedido, frecuencia, total gastado)
- [ ] Notificaciones / recordatorios de entrega
- [ ] PWA para instalación en mobile (manifest + service worker)

---

## 📦 Variables de Entorno

### `apps/api/.env`
```
DATABASE_URL=           # Neon connection string
JWT_SECRET=             # min 32 chars random
JWT_REFRESH_SECRET=     # diferente al anterior
ALLOWED_ORIGIN=         # URL de Vercel
PORT=3000
NODE_ENV=development
```

### `apps/web/.env`
```
VITE_API_URL=           # URL de Railway
```

---

## ✅ Convenciones de Código

- Archivos en `kebab-case`, componentes React en `PascalCase`
- Cada feature folder tiene: `components/`, `hooks/`, `api.ts`, `types.ts`, `index.ts`
- Todos los endpoints del API siguen el patrón: `router → controller → service → db`
- Los errores del API siempre retornan `{ error: string, code?: string }`
- TanStack Query keys centralizadas en `lib/query-keys.ts`
- Formularios: React Hook Form + resolver Zod desde `@te-pinta/shared`
- Comentarios en español, código en inglés (variables, funciones, tipos)
