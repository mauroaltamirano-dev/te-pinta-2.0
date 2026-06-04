import type { CustomerEnrichment, CustomerPurchaseRecord, CustomerVarietyRank } from './types';

/** Enriquecimiento CRM por id de cliente (API) o clave de demo. */
export const customerEnrichmentsById: Record<string, CustomerEnrichment> = {
  'customer-1': {
    neighborhood: 'Centro',
    createdAt: '2025-11-12',
    tags: ['Particular', 'Recurrente', 'Paga por transferencia'],
    importantNote: 'Prefiere empanadas separadas por variedad.',
    notes: [
      { id: 'n1', text: 'Prefiere retirar después de las 19.', createdAt: '2026-03-01' },
      { id: 'n2', text: 'Paga por transferencia.', createdAt: '2026-04-10' },
      { id: 'n3', text: 'Suele pedir mixta sin humita.', createdAt: '2026-05-02' },
    ],
    varietyBreakdown: [
      { variety: 'Salteña', units: 32, percent: 38 },
      { variety: 'Jamón y queso', units: 20, percent: 24 },
      { variety: 'Caprese', units: 14, percent: 17 },
      { variety: 'Mixta', units: 18, percent: 21 },
    ],
    purchaseHistory: [
      {
        id: 'hist-a1',
        date: '2026-06-04',
        summary: '2 docenas mixtas',
        total: 30000,
        dozens: 2,
        status: 'entregado',
        paymentStatus: 'pagado',
        lines: [{ variety: 'Mixta', units: 24, dozens: 2 }],
      },
      {
        id: 'hist-a2',
        date: '2026-05-22',
        summary: '1 docena salteña',
        total: 15000,
        dozens: 1,
        status: 'entregado',
        paymentStatus: 'pagado',
      },
      {
        id: 'hist-a3',
        date: '2026-05-10',
        summary: '1,5 docenas variadas',
        total: 22500,
        dozens: 1.5,
        status: 'entregado',
        paymentStatus: 'parcial',
      },
    ],
  },
  'customer-2': {
    neighborhood: 'Alberdi',
    createdAt: '2026-02-20',
    tags: ['Particular', 'Retiro'],
    notes: [{ id: 'n4', text: 'No le gusta picante.', createdAt: '2026-04-18' }],
    varietyBreakdown: [
      { variety: 'Jamón y queso', units: 18, percent: 45 },
      { variety: 'Caprese', units: 12, percent: 30 },
      { variety: 'Salteña', units: 10, percent: 25 },
    ],
  },
};

const demoVarietyMaria: CustomerVarietyRank[] = [
  { variety: 'Salteña', units: 32, percent: 38 },
  { variety: 'Jamón y queso', units: 20, percent: 24 },
  { variety: 'Caprese', units: 14, percent: 17 },
];

/** Clientes de demostración cuando la API aún no tiene volumen (solo se fusionan si no existen por teléfono). */
export const crmDemoCustomers: Array<{
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  enrichment: CustomerEnrichment;
}> = [
  {
    id: 'crm-demo-maria',
    name: 'María Gómez',
    phone: '3510000001',
    address: 'Av. Colón 1234',
    enrichment: {
      neighborhood: 'Nueva Córdoba',
      createdAt: '2026-04-12',
      tags: ['Particular', 'Recurrente', 'Paga por transferencia'],
      importantNote: 'Prefiere empanadas separadas por variedad.',
      notes: [
        { id: 'dm1', text: 'Prefiere retirar después de las 19.', createdAt: '2026-04-15' },
        { id: 'dm2', text: 'Paga por transferencia.', createdAt: '2026-04-20' },
      ],
      varietyBreakdown: demoVarietyMaria,
      purchaseHistory: [
        {
          id: 'dm-o1',
          date: '2026-06-01',
          summary: '2 docenas mixtas',
          total: 30000,
          dozens: 2,
          status: 'entregado',
          paymentStatus: 'pagado',
        },
        {
          id: 'dm-o2',
          date: '2026-05-22',
          summary: '1 docena salteña',
          total: 15000,
          dozens: 1,
          status: 'entregado',
          paymentStatus: 'pagado',
        },
      ],
      nextOrderLabel: 'viernes 18:30',
    },
  },
  {
    id: 'crm-demo-juan',
    name: 'Juan Pérez',
    phone: '3510000002',
    address: 'Bv. San Juan 890',
    enrichment: {
      neighborhood: 'Centro',
      createdAt: '2026-01-08',
      tags: ['Particular'],
      varietyBreakdown: [
        { variety: 'Jamón y queso', units: 24, percent: 52 },
        { variety: 'Salteña', units: 14, percent: 30 },
      ],
      purchaseHistory: [
        {
          id: 'dm-j1',
          date: '2026-05-20',
          summary: '1 docena jamón y queso',
          total: 14000,
          dozens: 1,
          status: 'entregado',
          paymentStatus: 'pagado',
        },
      ],
    },
  },
  {
    id: 'crm-demo-local',
    name: 'Local Centro',
    phone: '3514556677',
    address: 'San Martín 450',
    enrichment: {
      neighborhood: 'Centro',
      createdAt: '2025-06-01',
      isWholesale: true,
      tags: ['Mayorista', 'Factura A'],
      varietyBreakdown: [
        { variety: 'Mixta', units: 120, percent: 55 },
        { variety: 'Salteña', units: 48, percent: 22 },
        { variety: 'Caprese', units: 50, percent: 23 },
      ],
      purchaseHistory: [
        {
          id: 'dm-l1',
          date: '2026-06-03',
          summary: '8 docenas mixtas',
          total: 96000,
          dozens: 8,
          status: 'entregado',
          paymentStatus: 'pagado',
        },
      ],
    },
  },
  {
    id: 'crm-demo-ana',
    name: 'Ana Ríos',
    phone: '3510000004',
    address: 'Los Andes 220',
    enrichment: {
      neighborhood: 'Güemes',
      createdAt: '2025-09-14',
      tags: ['Particular', 'Frecuente'],
      importantNote: 'Última compra: 2 docenas mixtas.',
      varietyBreakdown: [
        { variety: 'Caprese', units: 28, percent: 42 },
        { variety: 'Mixta', units: 22, percent: 33 },
      ],
      purchaseHistory: [
        {
          id: 'dm-ar1',
          date: '2026-04-13',
          summary: '2 docenas mixtas',
          total: 28000,
          dozens: 2,
          status: 'entregado',
          paymentStatus: 'pagado',
        },
      ],
    },
  },
  {
    id: 'crm-demo-carlos',
    name: 'Carlos Méndez',
    phone: '3510000005',
    address: 'Av. Vélez Sarsfield 3100',
    enrichment: {
      neighborhood: 'Villa Cabrera',
      createdAt: '2026-05-28',
      tags: ['Particular', 'Nuevo'],
      debtAmount: 12000,
      varietyBreakdown: [{ variety: 'Salteña', units: 12, percent: 100 }],
      purchaseHistory: [
        {
          id: 'dm-c1',
          date: '2026-05-30',
          summary: '1 docena salteña',
          total: 15000,
          dozens: 1,
          status: 'entregado',
          paymentStatus: 'debe',
        },
      ],
    },
  },
];

export const getCustomerEnrichment = (
  customerId: string,
  customerName: string,
): CustomerEnrichment | undefined => {
  if (customerEnrichmentsById[customerId]) {
    return customerEnrichmentsById[customerId];
  }

  const normalizedName = customerName.trim().toLowerCase();
  const demo = crmDemoCustomers.find(
    (entry) => entry.id === customerId || entry.name.toLowerCase() === normalizedName,
  );

  return demo?.enrichment;
};

export const mergeDemoPurchaseHistory = (
  fromApi: CustomerPurchaseRecord[],
  fromEnrichment: CustomerPurchaseRecord[] | undefined,
): CustomerPurchaseRecord[] => {
  if (!fromEnrichment?.length) return fromApi;
  if (!fromApi.length) return fromEnrichment;

  const apiIds = new Set(fromApi.map((order) => order.id));
  const supplemental = fromEnrichment.filter((order) => !apiIds.has(order.id));

  return [...fromApi, ...supplemental].sort((a, b) => b.date.localeCompare(a.date));
};
