# Identidad visual de Orders

Orders define el lenguaje visual operativo para las pantallas internas de Te Pinta: cálido, denso, táctil y orientado a tomar decisiones rápido. Usá esta guía como referencia al replicar el estilo en Clientes, Menú, Ingredientes, Dashboard y futuras vistas.

## Ruta rápida

1. Reutilizá los tokens globales de `apps/web/src/styles/globals.css`: `primary`, `background`, `card`, `border`, `muted`, `ring`, `font-display` y `shadow-card`.
2. Armá cada vista con esta jerarquía: encabezado propio → KPIs → filtros compactos → contenido principal en cards/filas.
3. Mantené acciones principales en pills redondeadas, estados en badges compactos y datos numéricos con `tabular-nums`.

## Firma visual

| Elemento | Decisión en Orders | Cómo replicarlo |
|---|---|---|
| Fondo | Base crema con cards blancas translúcidas. | Usar `bg-background` como lienzo y `bg-white/85` o `bg-white/75` para superficies secundarias. |
| Títulos | Título principal con serif de marca. | `font-display text-3xl font-black tracking-tight text-foreground`. |
| Cards | Bordes suaves, radio grande y sombra liviana. | `rounded-2xl border border-border/70 bg-white/85 shadow-card`. |
| Acciones | Botones tipo pill, con peso alto y feedback táctil. | `rounded-full`, `font-black`, `shadow-primary-glow` en CTA, `active:scale-[0.98]`. |
| Filtros | Barra compacta dentro de una superficie blanca. | `grid gap-3 rounded-2xl border border-border/70 bg-white/75 p-3 shadow-card`. |
| Inputs | Campos pills con foco dorado suave. | `rounded-full border border-border bg-white ... focus:ring-2 focus:ring-ring/30`. |
| Badges | Pills chicos, densos y de alto contraste. | `rounded-full px-2.5 py-1 text-xs font-black ring-1`. |
| Tabla/lista | Header sobrio y filas accionables con densidad. | Header `bg-foreground/5`; filas como cards con `rounded-2xl`, hover sutil y acciones al final. |
| Movimiento | Microinteracciones breves, no teatrales. | `transition`, `hover:-translate-y-0.5`, `animate-fade-in`, `animate-slide-in-right`. |

## Estructura recomendada de una vista

```tsx
<div className="space-y-6 animate-fade-in">
  <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="font-display text-3xl font-black tracking-tight text-foreground">Título</h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground">Descripción breve.</p>
    </div>
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">Acciones</div>
  </section>

  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">KPIs</section>

  <section className="space-y-4">
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-white/75 p-3 shadow-card">
      Filtros
    </div>
    Contenido
  </section>
</div>
```

## Paleta funcional

| Uso | Color/clase sugerida | Ejemplo en Orders |
|---|---|---|
| Acción principal | `bg-primary text-primary-foreground` | Nuevo pedido, generar lista. |
| Acción secundaria | `border border-border bg-card text-foreground` | Exportar, limpiar filtros/selección. |
| Confirmado/urgente | `bg-red-600 text-white` | Pedido confirmado, no pagado. |
| Preparado/pendiente | `bg-amber-500 text-white` o `bg-yellow-100 text-yellow-900` | Preparado, pendientes. |
| Entregado/positivo | `bg-emerald-600 text-white` | Entregado, pagado. |
| Envío/info | `bg-sky-600 text-white` o `bg-indigo-100 text-indigo-800` | Método envío, ventas del día. |

## Checklist para replicar

- [ ] La pantalla tiene encabezado propio con título, descripción y acciones arriba a la derecha.
- [ ] Los KPIs usan icono en cápsula de color, valor grande y hint corto.
- [ ] Los filtros están agrupados en una barra compacta y redondeada.
- [ ] Los estados usan badges compactos de igual altura visual.
- [ ] Las acciones destructivas no compiten con el CTA principal.
- [ ] Los precios/cantidades usan `tabular-nums`.
- [ ] En mobile, la densidad se mantiene sin duplicar navegación ni headers.

## Referencia principal

La implementación viva está en `apps/web/src/features/orders/OrdersPage.tsx`. Si esta guía y la pantalla divergen, tomá Orders como fuente visual y actualizá este documento en el mismo commit.
