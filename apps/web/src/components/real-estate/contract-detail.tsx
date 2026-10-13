import { Badge, Card, CardContent } from "@platform/ui";
import { ArrowLeft, CalendarDays, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FormActionButton } from "@/components/form-action-button";
import {
  activateLease,
  cancelLease,
  endLease,
  updateLease,
} from "@/app/[scope]/[section]/actions";
import { apiRequest, ApiRequestError } from "@/lib/api";

interface Party {
  id: string;
  name: string;
}

interface Lease {
  id: string;
  unitId: string;
  status: "DRAFT" | "ACTIVE" | "ENDED" | "CANCELED";
  startDate: string;
  endDate: string | null;
  monthlyRent: string;
  currency: string;
  dueDay: number;
  activatedAt: string | null;
  endedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  unit: {
    id: string;
    name: string;
    status: string;
    property: { id: string; name: string; status: string };
  };
  tenants: Array<{
    partyId: string;
    isFinancialResponsible: boolean;
    party: Party;
  }>;
}

interface Property {
  id: string;
  name: string;
  units: Array<{ id: string; name: string; status: string }>;
}

interface Page<T> {
  data: T[];
}

export async function ContractDetail({
  leaseId,
  notice,
}: {
  leaseId: string;
  notice: {
    created?: string;
    updated?: string;
    activated?: string;
    canceled?: string;
    ended?: string;
    error?: string;
  };
}) {
  let lease: Lease;
  let properties: Property[];
  let parties: Party[];
  try {
    const [leaseData, propertyPage, partyPage] = await Promise.all([
      apiRequest<Lease>(`/real-estate/leases/${leaseId}`),
      apiRequest<Page<Property>>("/real-estate/properties?pageSize=100"),
      apiRequest<Page<Party>>("/parties?role=TENANT&pageSize=100"),
    ]);
    lease = leaseData;
    properties = propertyPage.data;
    parties = partyPage.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    return (
      <Notice error>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar o contrato."}
      </Notice>
    );
  }

  const units = properties.flatMap((property) =>
    property.units
      .filter(({ id, status }) => status === "ACTIVE" || id === lease.unitId)
      .map((unit) => ({ ...unit, propertyName: property.name })),
  );
  const tenantIds = lease.tenants.map(({ partyId }) => partyId);
  const responsible = lease.tenants.find(
    ({ isFinancialResponsible }) => isFinancialResponsible,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/real-estate/contracts"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
      >
        <ArrowLeft className="size-4" /> Contratos
      </Link>
      {notice.created === "1" ? <Notice>Contrato criado.</Notice> : null}
      {notice.updated === "1" ? <Notice>Rascunho atualizado.</Notice> : null}
      {notice.activated === "1" ? <Notice>Contrato ativado.</Notice> : null}
      {notice.canceled === "1" ? <Notice>Contrato cancelado.</Notice> : null}
      {notice.ended === "1" ? <Notice>Contrato encerrado.</Notice> : null}
      {notice.error ? <Notice error>{notice.error}</Notice> : null}

      <header className="rounded-3xl bg-[#561829] p-7 text-white sm:p-9">
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          <FileText className="size-4" /> Contrato de locação
          <Badge className="border-white/20 bg-white/10 text-white">
            {statusLabel(lease.status)}
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold">
          {lease.unit.property.name} · {lease.unit.name}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {formatDate(lease.startDate)} até {formatEnd(lease.endDate)} ·{" "}
          {formatMoney(lease.monthlyRent, lease.currency)} com vencimento no dia{" "}
          {lease.dueDay}
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 font-semibold">Locatários</div>
            <div className="divide-y">
              {lease.tenants.map((tenant) => (
                <div
                  key={tenant.partyId}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <UserRound className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {tenant.party.name}
                  </span>
                  {tenant.isFinancialResponsible ? (
                    <Badge>Responsável financeiro</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">Histórico do contrato</h2>
            <HistoryLine label="Criado" value={lease.createdAt} />
            {lease.activatedAt ? (
              <HistoryLine label="Ativado" value={lease.activatedAt} />
            ) : null}
            {lease.endedAt ? (
              <HistoryLine label="Encerrado" value={lease.endedAt} />
            ) : null}
            {lease.canceledAt ? (
              <HistoryLine label="Cancelado" value={lease.canceledAt} />
            ) : null}
          </CardContent>
        </Card>
      </section>

      {lease.status === "DRAFT" ? (
        <section className="space-y-4">
          <details className="rounded-2xl border bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-4 font-semibold">
              Editar rascunho
            </summary>
            <form
              action={updateLease}
              className="grid gap-4 border-t p-5 md:grid-cols-2"
            >
              <input type="hidden" name="leaseId" value={lease.id} />
              <label className="grid gap-1 text-sm font-medium md:col-span-2">
                Unidade
                <select
                  name="unitId"
                  required
                  defaultValue={lease.unitId}
                  className="rounded-lg border px-3 py-2"
                >
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
                  multiple
                  required
                  defaultValue={tenantIds}
                  size={Math.min(parties.length, 5)}
                  className="rounded-lg border px-3 py-2"
                >
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid content-start gap-1 text-sm font-medium">
                Responsável financeiro
                <select
                  name="financialResponsiblePartyId"
                  required
                  defaultValue={responsible?.partyId}
                  className="rounded-lg border px-3 py-2"
                >
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Data inicial
                <input
                  name="startDate"
                  type="date"
                  required
                  defaultValue={dateValue(lease.startDate)}
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Data final
                <input
                  name="endDate"
                  type="date"
                  defaultValue={dateValue(lease.endDate)}
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
                  defaultValue={lease.monthlyRent}
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  Moeda
                  <select
                    name="currency"
                    defaultValue={lease.currency}
                    className="rounded-lg border px-3 py-2"
                  >
                    <option value="BRL">BRL</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Vencimento
                  <input
                    name="dueDay"
                    type="number"
                    min="1"
                    max="28"
                    required
                    defaultValue={lease.dueDay}
                    className="rounded-lg border px-3 py-2"
                  />
                </label>
              </div>
              <button className="w-fit rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
                Salvar alterações
              </button>
            </form>
          </details>
          <div className="flex flex-wrap gap-3">
            <form action={activateLease}>
              <input type="hidden" name="leaseId" value={lease.id} />
              <button className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
                Ativar contrato
              </button>
            </form>
            <form action={cancelLease}>
              <input type="hidden" name="leaseId" value={lease.id} />
              <FormActionButton
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                pendingLabel="Cancelando…"
                confirmMessage="Cancelar este contrato em rascunho? Confirme para continuar."
              >
                Cancelar rascunho
              </FormActionButton>
            </form>
          </div>
        </section>
      ) : null}

      {lease.status === "ACTIVE" ? (
        <Card>
          <CardContent className="p-5">
            <form action={endLease} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="leaseId" value={lease.id} />
              <label className="grid gap-1 text-sm font-medium">
                Data efetiva do encerramento
                <input
                  name="endDate"
                  type="date"
                  min={dateValue(lease.startDate)}
                  required
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <FormActionButton
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                pendingLabel="Encerrando…"
                confirmMessage="Encerrar este contrato? Essa alteração afeta a situação da locação."
              >
                Encerrar contrato
              </FormActionButton>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function HistoryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <CalendarDays className="size-4 text-[var(--brand)]" />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-slate-500">{formatDateTime(value)}</span>
    </div>
  );
}

function statusLabel(status: Lease["status"]) {
  if (status === "DRAFT") return "Rascunho";
  if (status === "ACTIVE") return "Ativo";
  if (status === "ENDED") return "Encerrado";
  return "Cancelado";
}

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
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
