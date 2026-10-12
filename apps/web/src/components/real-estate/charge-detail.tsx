import { Badge, Card, CardContent } from "@platform/ui";
import { ArrowLeft, CircleDollarSign, FileText, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiRequest, ApiRequestError } from "@/lib/api";

interface Charge {
  id: string;
  type: string;
  competence: string;
  dueDate: string;
  baseAmount: string;
  currency: string;
  status: string;
  isOverdue: boolean;
  createdAt: string;
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

export async function ChargeDetail({ chargeId }: { chargeId: string }) {
  let charge: Charge;
  try {
    charge = await apiRequest<Charge>(`/real-estate/charges/${chargeId}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar a cobrança."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/real-estate/charges"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
      >
        <ArrowLeft className="size-4" /> Cobranças
      </Link>
      <header className="rounded-3xl bg-[#561829] p-7 text-white sm:p-9">
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          <CircleDollarSign className="size-4" /> Cobrança de aluguel
          <Badge className="border-white/20 bg-white/10 text-white">
            {statusLabel(charge.status)}
          </Badge>
          {charge.isOverdue ? (
            <Badge className="border-red-200 bg-red-100 text-red-800">
              Vencida
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold">
          {formatMoney(charge.baseAmount, charge.currency)}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Competência {formatCompetence(charge.competence)} · vencimento{" "}
          {formatDate(charge.dueDate)}
        </p>
      </header>
      <section className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-[var(--brand)]" />
              <div>
                <p className="text-xs text-slate-500">Contrato e unidade</p>
                <Link
                  href={`/real-estate/contracts/${charge.lease.id}`}
                  className="font-semibold text-[var(--brand)]"
                >
                  {charge.lease.unit.property.name} · {charge.lease.unit.name}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <UserRound className="size-5 text-[var(--brand)]" />
              <div>
                <p className="text-xs text-slate-500">Responsável financeiro</p>
                <p className="font-semibold">
                  {charge.lease.tenants[0]?.party.name ?? "Não encontrado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <p className="text-xs text-slate-500">
        Gerada em {formatDateTime(charge.createdAt)}. O valor é o snapshot do
        aluguel no momento da geração.
      </p>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(Number(value));
}
