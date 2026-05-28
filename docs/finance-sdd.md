# Finanzas MVP — SDD

Finanzas será un bounded context propio para cargar compras, calcular costos reales y estimar ganancia por pedido sin romper pedidos, menú, clientes ni reportes actuales.

## Objetivo

Permitir que Te Pinta 2.0 controle costos de producción, packaging, gastos, stock, recetas y rentabilidad usando precios históricos de compra y snapshots seguros en pedidos.

## Alcance MVP

Incluye:

- Catálogo de productos/insumos financieros.
- Compras con múltiples ítems e historial de costos.
- Stock simple por ledger.
- Reglas de costos base: tapas por empanada y packaging por docena iniciada.
- Recetas por variedad, cargadas por docena.
- Calculadora de costo/rentabilidad de pedido.
- API REST protegida bajo `/api/v1/finance`.
- UI responsive en `/finanzas`.
- Tests de cálculos críticos en `packages/shared`.

No incluye:

- Facturación AFIP, conciliación bancaria o contabilidad fiscal completa.
- FIFO/LIFO/promedio ponderado como fuente de costeo.
- Consumo automático definitivo de stock por pedido.
- Reemplazo del módulo legacy de `ingredients` o `menu_items.costPerDozen`.

## Decisiones técnicas

| Tema | Decisión |
|---|---|
| Dominio | Finanzas vive separado de `ingredients/menu` como bounded context. |
| Dinero | Los nuevos cálculos usan integer cents como fuente de verdad. |
| Costo vigente | Para futuros cálculos se usa el último costo cargado. |
| Promedio | Se muestra sólo como métrica informativa. |
| Stock | Ledger append-only; stock actual derivado por suma en MVP. |
| Pedidos | Guardan snapshots de costo/ganancia; compras futuras no cambian históricos. |
| Datos incompletos | El sistema devuelve warnings y costo parcial, no rompe ventas. |

## Entidades

### Finance products

Representan todo lo que se compra o consume: materia prima, packaging, gastos, servicios, combustible, inversiones u otros.

Campos principales:

- `id`
- `name`
- `category`: `raw_material`, `packaging`, `operating_expense`, `service`, `fuel`, `investment`, `other`
- `baseUnit`: `unit`, `g`, `kg`, `ml`, `l`, `pack`
- `stockTracking`
- `isActive`
- `createdAt`, `updatedAt`

Métricas derivadas:

- último costo
- costo promedio
- cantidad comprada
- stock actual
- cantidad de compras

### Purchases

Una compra tiene fecha, proveedor opcional, comprobante opcional, notas e ítems dinámicos.

Cada ítem guarda:

- producto
- unidad de compra
- cantidad comprada
- unidades base por paquete
- precio unitario o total
- total de unidades base
- costo por unidad base

### Stock movements

Movimientos soportados:

- `purchase_in`
- `manual_in`
- `manual_out`
- `waste`
- `order_consumption`
- `adjustment`

En MVP el stock no bloquea ventas: sólo debe advertir.

### Base cost rules

Reglas configurables para componentes comunes:

- `base_raw_material`: se aplica por empanada.
- `packaging`: se aplica por docena iniciada.

Seeds sugeridos:

| Producto | Regla | Cantidad |
|---|---|---:|
| Tapas de empanadas | `per_empanada` | 1 |
| Caja delivery | `per_started_dozen` | 1 |
| Papel parafinado | `per_started_dozen` | 1 |

### Recipes

Las recetas se cargan por variedad de menú y por docena.

Regla importante: tapas y packaging no se duplican dentro de recetas si ya existen como costos base.

## Fórmulas

### Compra de pack

```text
totalBaseUnits = purchaseQuantity * unitsPerPackage
totalPriceCents = unitPriceCents * purchaseQuantity
costPerBaseUnitCents = round(totalPriceCents / totalBaseUnits)
```

Ejemplo:

```text
24 packs * 12 unidades = 288 tapas
$1.600 por pack = $38.400 total
$38.400 / 288 = $133,33 por tapa aprox.
```

### Packaging

```text
packagingUnits = ceil(totalEmpanadas / 12)
```

Ejemplos:

| Empanadas | Packaging |
|---:|---:|
| 12 | 1 |
| 18 | 2 |
| 24 | 2 |
| 25 | 3 |

### Pedido

```text
totalEmpanadas = suma(items.quantity)

baseRawMaterialCost =
  suma(component.latestCostCents * component.quantity * totalEmpanadas)

packagingCost =
  packagingUnits * suma(packagingComponent.latestCostCents * quantity)

recipeCost =
  suma(item.quantity * recipeCostPerUnitCents)

totalCost = baseRawMaterialCost + packagingCost + recipeCost
grossProfit = saleTotal - totalCost
profitMarginPercent = grossProfit / saleTotal * 100
costRatioPercent = totalCost / saleTotal * 100
```

## API MVP

Todas las rutas van bajo `/api/v1/finance` y deben usar auth, Zod y recálculo backend.

| Área | Endpoints |
|---|---|
| Productos | `GET/POST /finance/products`, `GET/PUT /finance/products/:id`, `GET /finance/products/:id/purchase-history`, `GET /finance/products/:id/stock` |
| Compras | `GET/POST /finance/purchases`, `GET/PUT/DELETE /finance/purchases/:id` |
| Costos base | `GET/POST /finance/base-cost-rules`, `PUT/DELETE /finance/base-cost-rules/:id` |
| Recetas | `GET /finance/recipes`, `GET/PUT /finance/recipes/:menuItemId` |
| Stock | `GET /finance/stock`, `POST /finance/stock/adjustments` |
| Calculadora | `POST /finance/costing/preview-order` |
| Dashboard | `GET /finance/summary` |

## UI MVP

Ruta principal: `/finanzas`.

Subsecciones:

1. Dashboard financiero.
2. Catálogo de insumos/productos.
3. Compras.
4. Costos base.
5. Recetas por variedad.
6. Calculadora de pedido/rentabilidad.
7. Stock.

Lineamientos:

- Cards claras para métricas.
- Tablas en desktop y cards apiladas en mobile.
- Formularios con cálculo en vivo.
- Badges para categorías.
- Alertas suaves para costos/recetas faltantes.
- Confirmación antes de eliminar compras o reglas.
- Mantener la identidad visual documentada en `docs/orders-visual-identity.md`.

## Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Producto sin compras | Mostrar warning de costo faltante. |
| Variedad sin receta | Calcular costo parcial y advertir. |
| Sin regla de tapas | Calcular lo posible y advertir. |
| Sin packaging | No romper; advertir costo incompleto. |
| Compra futura más barata | No modificar snapshots históricos de pedidos. |
| Stock negativo | Advertir, pero no bloquear ventas en MVP. |
| Total de venta cero | Evitar división inválida; margen/costo ratio en 0. |

## Roadmap posterior

- Consumo automático de stock por pedido entregado.
- Dashboard con reportes por período y variedad.
- Valorización avanzada de inventario.
- Promedio ponderado/FIFO/LIFO como modos configurables.
- Conciliación bancaria.
- Exportes contables.
- Integración fiscal/AFIP si el negocio lo requiere.

## Checklist de entrega

- [ ] Migraciones Drizzle.
- [ ] API protegida.
- [ ] UI navegable.
- [x] Cálculos compartidos con tests críticos.
- [x] Schemas Zod compartidos.
- [ ] Integración de snapshots en pedidos.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
