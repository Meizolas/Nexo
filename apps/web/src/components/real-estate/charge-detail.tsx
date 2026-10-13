import { Badge, Card, CardContent } from "@platform/ui";
import {
  ArrowLeft,
  CircleDollarSign,
  Download,
  FileText,
  Plus,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  addChargeAdjustment,
  cancelChargeAdjustment,
  downloadPaymentProof,
  reviewPaymentProof,
  uploadPaymentProof,
} from "@/app/[scope]/[section]/actions";
import { apiRequest, ApiRequestError } from "@/lib/api";

interface Charge {
  id: string;
  type: string;
  competence: string;
  dueDate: string;
  baseAmount: string;
  fineAmount: string;
  interestAmount: string;
  discountAmount: string;
  totalAmount: string;
  currency: string;
  status: string;
  isOverdue: boolean;
  createdAt: string;
  adjustments: Array<{
    id: string;
    type: "FINE" | "INTEREST" | "DISCOUNT";
    amount: string;
    reason: string;
    status: "ACTIVE" | "CANCELED";
    createdAt: string;
    canceledAt?: string;
  }>;
  paymentProofs: Array<{
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    reviewNote?: string;
    reviewedAt?: string;
    createdAt: string;
    reviewedBy?: { id: string; displayName: string };
    document: {
      id: string;
      originalName: string;
      sizeBytes: number;
      mimeType: string;
    };
  }>;
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

export async function ChargeDetail({
  chargeId,
  notice,
}: {
  chargeId: string;
  notice?: {
    adjusted?: string;
    adjustmentCanceled?: string;
    proofUploaded?: string;
    proofReviewed?: string;
    error?: string;
  };
}) {
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
      {notice?.adjusted === "1" ? (
        <Notice>Ajuste financeiro registrado e auditado.</Notice>
      ) : null}
      {notice?.adjustmentCanceled === "1" ? (
        <Notice>Ajuste cancelado sem apagar o histórico.</Notice>
      ) : null}
      {notice?.proofUploaded === "1" ? (
        <Notice>Comprovante enviado para análise.</Notice>
      ) : null}
      {notice?.proofReviewed === "1" ? (
        <Notice>Comprovante analisado. A cobrança permanece aberta.</Notice>
      ) : null}
      {notice?.error ? <Notice error>{notice.error}</Notice> : null}
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
          {formatMoney(charge.totalAmount, charge.currency)}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Competência {formatCompetence(charge.competence)} · vencimento{" "}
          {formatDate(charge.dueDate)}
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AmountCard
          label="Aluguel base"
          value={charge.baseAmount}
          charge={charge}
        />
        <AmountCard label="Multas" value={charge.fineAmount} charge={charge} />
        <AmountCard
          label="Juros"
          value={charge.interestAmount}
          charge={charge}
        />
        <AmountCard
          label="Descontos"
          value={charge.discountAmount}
          charge={charge}
          negative
        />
      </section>
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
      {charge.status === "OPEN" ? (
        <Card>
          <CardContent className="p-5">
            <div>
              <h2 className="font-semibold">Adicionar ajuste manual</h2>
              <p className="mt-1 text-xs text-slate-500">
                Informe um valor fixo e o motivo. Nenhum percentual é calculado
                automaticamente.
              </p>
            </div>
            <form
              action={addChargeAdjustment}
              className="mt-4 grid gap-4 md:grid-cols-4"
            >
              <input type="hidden" name="chargeId" value={charge.id} />
              <label className="grid gap-1 text-sm font-medium">
                Tipo
                <select
                  name="type"
                  required
                  className="rounded-lg border px-3 py-2"
                >
                  <option value="FINE">Multa</option>
                  <option value="INTEREST">Juros</option>
                  <option value="DISCOUNT">Desconto</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Valor
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  pattern="\d{1,12}([.]\d{1,2})?"
                  required
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium md:col-span-2">
                Motivo
                <input
                  name="reason"
                  minLength={3}
                  maxLength={500}
                  required
                  className="rounded-lg border px-3 py-2"
                />
              </label>
              <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white md:col-span-4">
                <Plus className="size-4" /> Registrar ajuste
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-5 py-4 font-semibold">
            Histórico de ajustes
          </div>
          {charge.adjustments.length ? (
            <div className="divide-y">
              {charge.adjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {adjustmentLabel(adjustment.type)} ·{" "}
                        {formatMoney(adjustment.amount, charge.currency)}
                      </p>
                      <Badge>
                        {adjustment.status === "ACTIVE" ? "Ativo" : "Cancelado"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {adjustment.reason}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Lançado em {formatDateTime(adjustment.createdAt)}
                    </p>
                  </div>
                  {charge.status === "OPEN" &&
                  adjustment.status === "ACTIVE" ? (
                    <form action={cancelChargeAdjustment}>
                      <input type="hidden" name="chargeId" value={charge.id} />
                      <input
                        type="hidden"
                        name="adjustmentId"
                        value={adjustment.id}
                      />
                      <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-red-700">
                        <XCircle className="size-4" /> Cancelar
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nenhum ajuste registrado.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-5">
            <h2 className="font-semibold">Comprovantes de pagamento</h2>
            <p className="mt-1 text-xs text-slate-500">
              Aceitar um comprovante não confirma o pagamento automaticamente.
            </p>
            {charge.status === "OPEN" ? (
              <form
                action={uploadPaymentProof}
                className="mt-4 flex flex-wrap gap-3"
              >
                <input type="hidden" name="chargeId" value={charge.id} />
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                />
                <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
                  <Upload className="size-4" /> Enviar
                </button>
              </form>
            ) : null}
          </div>
          {charge.paymentProofs.length ? (
            <div className="divide-y">
              {charge.paymentProofs.map((proof) => (
                <div key={proof.id} className="space-y-3 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {proof.document.originalName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(proof.document.sizeBytes)} · enviado em{" "}
                        {formatDateTime(proof.createdAt)}
                      </p>
                      {proof.reviewNote ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Observação: {proof.reviewNote}
                        </p>
                      ) : null}
                    </div>
                    <Badge>{proofStatusLabel(proof.status)}</Badge>
                    <form action={downloadPaymentProof}>
                      <input type="hidden" name="chargeId" value={charge.id} />
                      <input type="hidden" name="proofId" value={proof.id} />
                      <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold">
                        <Download className="size-4" /> Baixar
                      </button>
                    </form>
                  </div>
                  {proof.status === "PENDING" ? (
                    <form
                      action={reviewPaymentProof}
                      className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[10rem_1fr_auto]"
                    >
                      <input type="hidden" name="chargeId" value={charge.id} />
                      <input type="hidden" name="proofId" value={proof.id} />
                      <select
                        name="status"
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        <option value="ACCEPTED">Aceitar</option>
                        <option value="REJECTED">Rejeitar</option>
                      </select>
                      <input
                        name="note"
                        maxLength={500}
                        placeholder="Observação (obrigatória ao rejeitar)"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <button className="rounded-lg border px-4 py-2 text-sm font-semibold">
                        Registrar análise
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">
              Nenhum comprovante enviado.
            </p>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-500">
        Gerada em {formatDateTime(charge.createdAt)}. O valor é o snapshot do
        aluguel no momento da geração.
      </p>
    </div>
  );
}

function AmountCard({
  label,
  value,
  charge,
  negative = false,
}: {
  label: string;
  value: string;
  charge: Charge;
  negative?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 font-semibold">
          {negative && Number(value) > 0 ? "- " : ""}
          {formatMoney(value, charge.currency)}
        </p>
      </CardContent>
    </Card>
  );
}

function adjustmentLabel(type: Charge["adjustments"][number]["type"]) {
  if (type === "FINE") return "Multa";
  if (type === "INTEREST") return "Juros";
  return "Desconto";
}

function proofStatusLabel(status: Charge["paymentProofs"][number]["status"]) {
  if (status === "PENDING") return "Pendente";
  if (status === "ACCEPTED") return "Aceito";
  return "Rejeitado";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
