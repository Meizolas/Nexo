import { Badge, Card, CardContent } from "@platform/ui";
import { CircleDollarSign, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { generateRecurringCharges } from "@/app/[scope]/[section]/actions";
import { apiRequest } from "@/lib/api";

interface Charge {
  id: string;
  type: string;
  competence: string;
  dueDate: string;
  baseAmount: string;
  totalAmount: string;
  currency: string;
  status: string;
  isOverdue: boolean;
  lease: {
    id: string;
    unit: {
      id: string;
      name: string;
      property: { id: string; name: string };
    };
    tenants: Array<{
      party: { id: string; name: string };
    }>;
  };
}

interface Page<T> {
  data: T[];
  meta: { totalItems: number };
}

export async function ChargesSection({
  competence,
  generated,
  existing,
  error,
}: {
  competence?: string;
  generated?: string;
  existing?: string;
  error?: string;
}) {
  let charges: Charge[];
  try {
    const suffix = competence
      ? `&competence=${encodeURIComponent(competence)}`
      : "";
    const page = await apiRequest<Page<Charge>>(
      `/real-estate/charges?pageSize=100${suffix}`,
    );
    charges = page.data;
  } catch (caught) {
    return (
      <Notice error>
        {caught instanceof Error
          ? caught.message
          : "Não foi possível carregar as cobranças."}
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[var(--brand)]">
          Imobiliário / Cobranças
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Cobranças recorrentes
        </h1>
        <p className="mt-2 text-slate-500">
          Gere os aluguéis mensais sem duplicidade e acompanhe os vencimentos.
        </p>
      </header>
      {generated !== undefined ? (
        <Notice>
          {generated} cobrança(s) criada(s) e {existing ?? "0"} já existente(s)
          para {competence}.
        </Notice>
      ) : null}
      {error ? <Notice error>{error}</Notice> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <form action={generateRecurringCharges} className="space-y-4">
              <div>
                <p className="font-semibold">Gerar competência</p>
                <p className="mt-1 text-xs text-slate-500">
                  Contratos ativos elegíveis recebem uma cobrança de aluguel.
                </p>
              </div>
              <label className="grid gap-1 text-sm font-medium">
                Competência
                <input
                  name="competence"
                  type="month"
                  required
                  defaultValue={competence}
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
                <Plus className="size-4" /> Gerar cobranças
              </button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <form action="/real-estate/charges" className="space-y-4">
              <div>
                <p className="font-semibold">Filtrar listagem</p>
                <p className="mt-1 text-xs text-slate-500">
                  Consulte todas as cobranças ou apenas uma competência.
                </p>
              </div>
              <label className="grid gap-1 text-sm font-medium">
                Competência
                <input
                  name="competence"
                  type="month"
                  defaultValue={competence}
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <div className="flex gap-2">
                <button className="rounded-lg border px-4 py-2 text-sm font-semibold">
                  Filtrar
                </button>
                <Link
                  href="/real-estate/charges"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Limpar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {charges.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 text-sm font-semibold">
              {charges.length} {charges.length === 1 ? "cobrança" : "cobranças"}
            </div>
            <div className="divide-y">
              {charges.map((charge) => (
                <Link
                  key={charge.id}
                  href={`/real-estate/charges/${charge.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <CircleDollarSign className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {charge.lease.unit.property.name} ·{" "}
                      {charge.lease.unit.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {charge.lease.tenants
                        .map(({ party }) => party.name)
                        .join(", ") || "Responsável não encontrado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Competência {formatCompetence(charge.competence)} · vence{" "}
                      {formatDate(charge.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {charge.isOverdue ? (
                      <Badge className="border-red-200 bg-red-100 text-red-800">
                        Vencida
                      </Badge>
                    ) : null}
                    <Badge>{statusLabel(charge.status)}</Badge>
                    <Badge>
                      {formatMoney(charge.totalAmount, charge.currency)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <CircleDollarSign className="mx-auto size-9 text-slate-400" />
              <h2 className="mt-3 font-semibold">
                Nenhuma cobrança encontrada
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Gere uma competência para os contratos ativos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "OPEN") return "Aberta";
  if (status === "PAID") return "Paga";
  return "Cancelada";
}

function formatCompetence(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value),
  );
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
