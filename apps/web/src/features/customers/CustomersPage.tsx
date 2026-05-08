import { useMemo, useState, type FormEvent } from 'react';

import type { CreateCustomerInput } from '@te-pinta/shared';

import { useCreateCustomer, useCustomers, useDeleteCustomer } from './customers-hooks';

type CustomerFormState = {
  name: string;
  phone: string;
  address: string;
};

const initialFormState: CustomerFormState = {
  name: '',
  phone: '',
  address: '',
};

const toCreateInput = (form: CustomerFormState): CreateCustomerInput => ({
  name: form.name,
  phone: form.phone,
  ...(form.address.trim() ? { address: form.address } : {}),
});

export const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CustomerFormState>(initialFormState);
  const customersQuery = useCustomers();
  const createCustomer = useCreateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return customersQuery.data ?? [];
    }

    return (customersQuery.data ?? []).filter((customer) => {
      const searchable =
        `${customer.name} ${customer.phone} ${customer.address ?? ''}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [customersQuery.data, search]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createCustomer.mutateAsync(toCreateInput(form));
    setForm(initialFormState);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Phase 4.4</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Clientes
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Guardá clientes con teléfono único, dirección opcional y búsqueda rápida para pedidos.
            </p>
          </div>
          <label className="w-full max-w-sm text-sm font-bold text-foreground">
            Buscar cliente
            <input
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, teléfono o dirección"
              type="search"
              value={search}
            />
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Clientes guardados</h3>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-primary">
              {filteredCustomers.length} resultados
            </span>
          </div>

          {customersQuery.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Cargando clientes...</p>
          ) : null}

          {customersQuery.isError ? (
            <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              No se pudieron cargar los clientes.
            </p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {filteredCustomers.map((customer) => (
              <article
                aria-label={`Cliente ${customer.name}`}
                className="rounded-3xl border border-border bg-background p-4"
                key={customer.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-foreground">{customer.name}</h4>
                    <p className="mt-1 text-sm font-semibold text-primary">{customer.phone}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {customer.address ?? 'Sin dirección cargada'}
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={deleteCustomer.isPending}
                    onClick={() => deleteCustomer.mutate(customer.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-black text-foreground">Nuevo cliente</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-foreground">
              Nombre del cliente
              <input
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                value={form.name}
              />
            </label>

            <label className="block text-sm font-bold text-foreground">
              Teléfono
              <input
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                required
                type="tel"
                value={form.phone}
              />
            </label>

            <label className="block text-sm font-bold text-foreground">
              Dirección
              <input
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                value={form.address}
              />
            </label>

            {createCustomer.isError ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                No se pudo guardar el cliente.
              </p>
            ) : null}

            <button
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={createCustomer.isPending}
              type="submit"
            >
              {createCustomer.isPending ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
