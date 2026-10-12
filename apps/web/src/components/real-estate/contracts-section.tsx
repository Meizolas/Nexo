import { Badge, Card, CardContent } from "@platform/ui";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { createLease } from "@/app/[scope]/[section]/actions";
import { apiRequest } from "@/lib/api";

interface Party {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  status: string;
}

interface Property {
  id: string;
  name: string;
  units: Unit[];
}

interface Lease {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: string;
  currency: string;
  dueDay: number;
  unit: Unit & { property: { id: string; name: string } };
  tenants: Array<{
    isFinancialResponsible: boolean;
    party: Party;
  }>;
}

interface Page<T> {
  data: T[];
  meta: { totalItems: number };
}

export async function ContractsSection({ error }: { error?: string }) {
  let leases: Lease[];
  let properties: Property[];
  let tenants: Party[];
  try {
    const [leasePage, propertyPage, tenantPage] = await Promise.all([
      apiRequest<Page<Lease>>("/real-estate/leases?pageSize=100"),
      apiRequest<Page<Property>>("/real-estate/properties?pageSize=100"),
      apiRequest<Page<Party>>("/parties?role=TENANT&pageSize=100"),
    ]);
    leases = leasePage.data;
    properties = propertyPage.data;
    tenants = tenantPage.data;
  } catch (caught) {
    return (
      <Notice error>
        {caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os contratos."}
      </Notice>
    );
  }

  const units = properties.flatMap((property) =>
    property.units
      .filter(({ status }) => status === "ACTIVE")
      .map((unit) => ({ ...unit, propertyName: property.name })),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[var(--brand)]">
          Imobiliário / Contratos
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Contratos de locação
        </h1>
        <p className="mt-2 text-slate-500">
          Controle a vigência, os locatários e o histórico de ocupação.
        </p>
      </header>
      {error ? <Notice error>{error}</Notice> : null}
      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="font-semibold">Criar contrato em rascunho</p>
            <p className="mt-1 text-xs text-slate-500">
              A ocupação só será confirmada após a ativação.
            </p>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
            <Plus className="size-4" /> Novo contrato
          </span>
        </summary>
        {units.length && tenants.length ? (
          <LeaseForm units={units} tenants={tenants} />
        ) : (
          <div className="border-t p-5 text-sm text-slate-600">
            Para criar um contrato, cadastre ao menos uma unidade ativa e uma
            pessoa com papel de locatário.
          </div>
        )}
      </details>

      {leases.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 text-sm font-semibold">
              {leases.length} {leases.length === 1 ? "contrato" : "contratos"}
            </div>
            <div className="divide-y">
              {leases.map((lease) => (
                <Link
                  key={lease.id}
                  href={`/real-estate/contracts/${lease.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {lease.unit.property.name} · {lease.unit.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {lease.tenants.map(({ party }) => party.name).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(lease.startDate)} até{" "}
                      {formatEnd(lease.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{statusLabel(lease.status)}</Badge>
                    <Badge>
                      {formatMoney(lease.monthlyRent, lease.currency)} · dia{" "}
                      {lease.dueDay}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="grid min-h-60 place-items-center p-8 text-center">
            <div>
              <FileText className="mx-auto size-9 text-slate-400" />
              <h2 className="mt-3 font-semibold">Nenhum contrato cadastrado</h2>
              <p className="mt-1 text-sm text-slate-500">
                O primeiro contrato será criado como rascunho.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeaseForm({
  units,
  tenants,
}: {
  units: Array<Unit & { propertyName: string }>;
  tenants: Party[];
}) {
  return (
    <form
      action={createLease}
      className="grid gap-4 border-t p-5 md:grid-cols-2"
    >
      <label className="grid gap-1 text-sm font-medium md:col-span-2">
        Unidade
        <select name="unitId" required className="rounded-lg border px-3 py-2">
          <option value="">Selecione...</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.propertyName} · {unit.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Locatários
        <select
          name="tenantPartyIds"
          required
          multiple
          size={Math.min(tenants.length, 5)}
          className="rounded-lg border px-3 py-2"
        >
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-slate-500">
          Use Ctrl/Cmd para selecionar mais de um.
        </span>
      </label>
      <label className="grid content-start gap-1 text-sm font-medium">
        Responsável financeiro
        <select
          name="financialResponsiblePartyId"
          required
          className="rounded-lg border px-3 py-2"
        >
          <option value="">Selecione...</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-slate-500">
          Deve estar entre os locatários selecionados.
        </span>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Data inicial
        <input
          name="startDate"
          type="date"
          required
          className="rounded-lg border px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Data final (opcional)
        <input
          name="endDate"
          type="date"
          className="rounded-lg border px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Aluguel mensal
        <input
          name="monthlyRent"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="rounded-lg border px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Moeda
          <select name="currency" className="rounded-lg border px-3 py-2">
            <option value="BRL">BRL</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Dia do vencimento
          <input
            name="dueDay"
            type="number"
            min="1"
            max="28"
            required
            className="rounded-lg border px-3 py-2"
          />
        </label>
      </div>
      <button className="w-fit rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
        Salvar rascunho
      </button>
    </form>
  );
}

function statusLabel(status: string) {
  if (status === "DRAFT") return "Rascunho";
  if (status === "ACTIVE") return "Ativo";
  if (status === "ENDED") return "Encerrado";
  return "Cancelado";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value),
  );
}

function formatEnd(value: string | null) {
  return value ? formatDate(value) : "prazo indeterminado";
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(Number(value));
}

function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
