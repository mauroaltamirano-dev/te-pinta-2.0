import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Banknote,
  CircleDollarSign,
  Repeat,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';

import type { CreateCustomerInput } from '@te-pinta/shared';

import { CustomerFilters } from './components/CustomerFilters';
import { CustomerDetailDrawer, type CustomerFormState } from './components/CustomerDetailDrawer';
import { CustomerDrawerOverlay } from './components/CustomerDrawerOverlay';
import { CustomerMobileCard } from './components/CustomerMobileCard';
import { CustomerSummaryCard, CustomersSummaryCards } from './components/CustomerSummaryCard';
import { CustomersHeader } from './components/CustomersHeader';
import { CustomersTable } from './components/CustomersTable';
import type { Customer } from './customers-api';
import { formatMoney, matchesCustomerFilter } from './customers-utils';
import {
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from './customers-hooks';
import { useCustomersWorkspace, useIsDesktopPanel } from './hooks/useCustomersWorkspace';
import type { CustomerFilterId, CustomerProfile } from './types';

const initialFormState: CustomerFormState = {
  name: '',
  phone: '',
  address: '',
};

const toCreateInput = (form: CustomerFormState): CreateCustomerInput => ({
  name: form.name,
  ...(form.phone.trim() ? { phone: form.phone } : {}),
  ...(form.address.trim() ? { address: form.address } : {}),
});

const toFormState = (customer: Customer): CustomerFormState => ({
  name: customer.name,
  phone: customer.phone ?? '',
  address: customer.address ?? '',
});

export const CustomersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CustomerFilterId>('todos');
  const [form, setForm] = useState<CustomerFormState>(initialFormState);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const ignoredCustomerParamRef = useRef<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const { customersQuery, ordersQuery, profiles, summary, filterProfiles, getProfileById } =
    useCustomersWorkspace();
  const isDesktopPanel = useIsDesktopPanel();

  const selectedProfile = getProfileById(selectedCustomerId);

  useEffect(() => {
    const customerIdFromUrl = searchParams.get('customerId');
    if (!customerIdFromUrl) {
      ignoredCustomerParamRef.current = null;
      return;
    }
    if (
      ignoredCustomerParamRef.current === customerIdFromUrl ||
      selectedCustomerId === customerIdFromUrl
    ) {
      return;
    }

    const profileFromUrl = getProfileById(customerIdFromUrl);
    if (!profileFromUrl) return;

    setSelectedCustomerId(profileFromUrl.id);
    setIsCreating(false);
    setForm(toFormState(profileFromUrl));
    setSearch(profileFromUrl.name);
  }, [getProfileById, searchParams, selectedCustomerId]);

  const searchMatchedProfiles = useMemo(
    () => filterProfiles(search, 'todos'),
    [filterProfiles, search],
  );

  const visibleProfiles = useMemo(
    () => searchMatchedProfiles.filter((profile) => matchesCustomerFilter(profile, activeFilter)),
    [activeFilter, searchMatchedProfiles],
  );

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<CustomerFilterId, number>> = { todos: searchMatchedProfiles.length };
    const filters: CustomerFilterId[] = [
      'activos',
      'recurrentes',
      'nuevos',
      'inactivos',
      'mayoristas',
      'con-deuda',
      'para-reactivar',
    ];
    filters.forEach((filter) => {
      counts[filter] = searchMatchedProfiles.filter((profile) =>
        matchesCustomerFilter(profile, filter),
      ).length;
    });
    return counts;
  }, [searchMatchedProfiles]);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const isSaving = createCustomer.isPending || updateCustomer.isPending;
  const isPanelOpen = Boolean(selectedProfile) || isCreating;
  const isMobilePanelOpen = !isDesktopPanel && isPanelOpen;
  const isDesktopDrawerOpen = isDesktopPanel && isPanelOpen;

  const handleStartCreate = () => {
    ignoredCustomerParamRef.current = selectedCustomerId ?? searchParams.get('customerId');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('customerId');
    setSearchParams(nextParams, { replace: true });
    setSelectedCustomerId(null);
    setIsCreating(true);
    setForm(initialFormState);
    setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 0);
  };

  const handleSelectProfile = (profile: CustomerProfile) => {
    ignoredCustomerParamRef.current = null;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('customerId', profile.id);
    setSearchParams(nextParams, { replace: true });
    setSelectedCustomerId(profile.id);
    setIsCreating(false);
    setForm(toFormState(profile));
  };

  const closePanel = () => {
    ignoredCustomerParamRef.current = selectedCustomerId ?? searchParams.get('customerId');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('customerId');
    setSearchParams(nextParams, { replace: true });
    setSelectedCustomerId(null);
    setIsCreating(false);
    setForm(initialFormState);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedCustomerId) {
      await updateCustomer.mutateAsync({ id: selectedCustomerId, updates: toCreateInput(form) });
      if (!isDesktopPanel) closePanel();
      return;
    }

    await createCustomer.mutateAsync(toCreateInput(form));
    setForm(initialFormState);
    if (!isDesktopPanel) closePanel();
  };

  const handleDeleteSelected = async () => {
    if (!selectedCustomerId || !selectedProfile) return;
    const confirmed = window.confirm(`¿Eliminar a ${selectedProfile.name}?`);
    if (!confirmed) return;
    await deleteCustomer.mutateAsync(selectedCustomerId);
    closePanel();
  };

  const emptyStateMessage = useMemo(() => {
    if (customersQuery.isLoading || ordersQuery.isLoading) return null;
    if (!profiles.length) return 'No hay clientes cargados.';
    if (search.trim() && !searchMatchedProfiles.length) {
      return 'No hay resultados para la búsqueda.';
    }
    if (!visibleProfiles.length) return 'No hay clientes en este filtro.';
    return null;
  }, [
    customersQuery.isLoading,
    ordersQuery.isLoading,
    profiles.length,
    search,
    searchMatchedProfiles.length,
    visibleProfiles.length,
  ]);

  const drawerProps = {
    profile: selectedProfile,
    isCreating,
    form,
    onFormChange: setForm,
    onSubmit: handleSubmit,
    onClose: closePanel,
    isSaving,
    isError: Boolean(createCustomer.isError || updateCustomer.isError),
    nameInputRef,
    panelRef,
    showCloseButton: true,
  };

  const drawerContent = (
    <>
      <CustomerDetailDrawer
        {...drawerProps}
        layout={isDesktopPanel ? 'overlay' : 'embedded'}
      />
      {selectedProfile ? (
        <div className="shrink-0 border-t border-border/70 bg-card p-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-black text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
            disabled={deleteCustomer.isPending}
            onClick={() => void handleDeleteSelected()}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar cliente
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="min-w-0 space-y-6">
        <CustomersHeader
          onNewCustomer={handleStartCreate}
          onSearchChange={setSearch}
          resultCount={visibleProfiles.length}
          search={search}
        />

        <CustomersSummaryCards>
          <CustomerSummaryCard
            accentClassName="bg-primary/10"
            hint="Base de contactos activa."
            icon={Users}
            iconClassName="text-primary"
            label="Total de clientes"
            value={summary.total}
          />
          <CustomerSummaryCard
            accentClassName="bg-success/15"
            hint="Compraron en los últimos 30 días."
            icon={Sparkles}
            iconClassName="text-success"
            label="Clientes activos"
            value={summary.active}
          />
          <CustomerSummaryCard
            accentClassName="bg-sky-100"
            hint="Alta en el mes en curso."
            icon={UserPlus}
            iconClassName="text-sky-700"
            label="Nuevos este mes"
            value={summary.newThisMonth}
          />
          <CustomerSummaryCard
            accentClassName="bg-[#e8efe0]"
            hint="Compran con regularidad."
            icon={Repeat}
            iconClassName="text-success"
            label="Clientes recurrentes"
            value={summary.recurring}
          />
          <CustomerSummaryCard
            accentClassName="bg-red-100"
            hint="Requieren seguimiento de cobro."
            icon={CircleDollarSign}
            iconClassName="text-red-800"
            label="Con deuda"
            value={summary.withDebt}
          />
          <CustomerSummaryCard
            accentClassName="bg-amber-100"
            hint="Histórico acumulado del negocio."
            icon={Banknote}
            iconClassName="text-amber-900"
            label="Total vendido"
            value={formatMoney(summary.totalSold)}
          />
        </CustomersSummaryCards>

        <CustomerFilters
          activeFilter={activeFilter}
          counts={filterCounts}
          onFilterChange={setActiveFilter}
        />

        <section className="space-y-4">
          {customersQuery.isLoading || ordersQuery.isLoading ? (
            <p className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-muted-foreground">
              Cargando clientes...
            </p>
          ) : null}

          {customersQuery.isError ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              No se pudieron cargar los clientes.
            </p>
          ) : null}

          {ordersQuery.isError ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              No se pudieron cargar los pedidos. Los totales y el historial pueden estar incompletos.
            </p>
          ) : null}

          {deleteCustomer.isError ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              No se pudo eliminar: ese cliente tiene pedidos asociados. Primero fusioná o mové sus
              pedidos a otro cliente.
            </p>
          ) : null}

          {emptyStateMessage ? (
            <p className="rounded-2xl border border-border/70 bg-background px-4 py-6 text-center text-sm font-semibold text-muted-foreground">
              {emptyStateMessage}
            </p>
          ) : null}

          {!emptyStateMessage && visibleProfiles.length > 0 ? (
            isDesktopPanel ? (
              <CustomersTable
                onEdit={handleSelectProfile}
                onSelect={handleSelectProfile}
                profiles={visibleProfiles}
                selectedId={selectedCustomerId}
              />
            ) : (
              <div className="grid gap-3">
                {visibleProfiles.map((profile) => (
                  <CustomerMobileCard
                    key={profile.id}
                    onEdit={() => handleSelectProfile(profile)}
                    onSelect={() => handleSelectProfile(profile)}
                    profile={profile}
                    selected={selectedCustomerId === profile.id}
                  />
                ))}
              </div>
            )
          ) : null}
        </section>
      </div>

      <CustomerDrawerOverlay isOpen={isDesktopDrawerOpen} onClose={closePanel}>
        {drawerContent}
      </CustomerDrawerOverlay>

      {isMobilePanelOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background lg:hidden">
            {drawerContent}
          </div>,
          document.body,
        )}
    </div>
  );
};
