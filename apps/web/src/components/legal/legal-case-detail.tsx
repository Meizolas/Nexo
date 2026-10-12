import { Badge, Card, CardContent, CardHeader, CardTitle } from "@platform/ui";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import {
  createCaseMovement,
  createLegalDeadline,
  publishCaseMovement,
  unpublishCaseMovement,
  updateCaseMovement,
  resolveLegalDeadline,
  updateLegalDeadline,
  scheduleHearing,
  updateHearingStatus,
  uploadLegalDocument,
  downloadLegalDocument,
  deleteLegalDocument,
} from "@/app/[scope]/[section]/actions";

interface LegalCaseDetailData {
  id: string;
  caseNumber: string | null;
  subject: string;
  tribunal: string | null;
  district: string | null;
  courtDivision: string | null;
  clientSummary: string | null;
  parties: Array<{ role: string; party: { name: string } }>;
  lawyers: Array<{ isPrimary: boolean; user: { displayName: string } }>;
}

interface Movement {
  id: string;
  occurredAt: string;
  internalDescription: string;
  clientDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdBy: { displayName: string };
  publishedBy: { displayName: string } | null;
}

interface Page<T> {
  data: T[];
  meta: { totalItems: number };
}

interface LegalDeadline {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  priority: string;
  status: string;
  resolutionNote: string | null;
  completedAt: string | null;
  assignedTo: { id: string; displayName: string };
  completedBy: { displayName: string } | null;
}

interface OrganizationMember {
  id: string;
  displayName: string;
  roles: string[];
}

interface Hearing {
  id: string;
  title: string;
  scheduledAt: string;
  isClientVisible: boolean;
  location: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED";
  resolutionNote: string | null;
}

interface LegalDocument {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: string;
  createdAt: string;
}

export async function LegalCaseDetail({
  caseId,
  notice,
}: {
  caseId: string;
  notice: {
    created?: string;
    updated?: string;
    published?: string;
    unpublished?: string;
    deadlineCreated?: string;
    deadlineResolved?: string;
    deadlineUpdated?: string;
    hearingCreated?: string;
    hearingUpdated?: string;
    documentCreated?: string;
    documentDeleted?: string;
    error?: string;
  };
}) {
  let legalCase: LegalCaseDetailData;
  let movements: Page<Movement>;
  let deadlines: LegalDeadline[];
  let members: OrganizationMember[];
  let hearings: Hearing[];
  let documents: Page<LegalDocument>;
  try {
    [legalCase, movements, deadlines, members, hearings, documents] =
      await Promise.all([
        apiRequest<LegalCaseDetailData>(`/legal/cases/${caseId}`),
        apiRequest<Page<Movement>>(
          `/legal/cases/${caseId}/movements?pageSize=100`,
        ),
        apiRequest<LegalDeadline[]>(`/legal/cases/${caseId}/deadlines`),
        apiRequest<OrganizationMember[]>(`/organizations/members`),
        apiRequest<Hearing[]>(`/legal/cases/${caseId}/hearings`),
        apiRequest<Page<LegalDocument>>(
          `/legal/cases/${caseId}/documents?pageSize=100`,
        ),
      ]);
  } catch (error) {
    return (
      <LoadError message={error instanceof Error ? error.message : undefined} />
    );
  }

  const success = notice.created
    ? "Movimentação registrada."
    : notice.published
      ? "Movimentação publicada para o cliente."
      : notice.unpublished
        ? "Publicação retirada."
        : notice.deadlineCreated
          ? "Prazo registrado."
          : notice.deadlineResolved
            ? "Prazo tratado e auditado."
            : notice.deadlineUpdated
              ? "Prazo atualizado; a data anterior foi preservada na auditoria."
              : notice.hearingCreated
                ? "Audiência agendada."
                : notice.hearingUpdated
                  ? "Status da audiência atualizado e auditado."
                  : notice.documentCreated
                    ? "Documento enviado ao processo."
                    : notice.documentDeleted
                      ? "Documento removido do processo."
                      : undefined;
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/legal/cases"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
        >
          <ArrowLeft className="size-4" /> Voltar aos processos
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs text-slate-500">
              {formatCnj(legalCase.caseNumber) ?? "Sem número CNJ"}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {legalCase.subject}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {[legalCase.tribunal, legalCase.courtDivision, legalCase.district]
                .filter(Boolean)
                .join(" · ") || "Dados judiciais ainda não informados"}
            </p>
          </div>
          <Badge className="w-fit border-[var(--brand)]/20 bg-[var(--brand-soft)] text-[var(--brand-deep)]">
            Em acompanhamento
          </Badge>
        </div>
      </div>
      {success ? <Notice>{success}</Notice> : null}
      {notice.updated ? (
        <Notice>
          Movimentacao atualizada. Revise e publique novamente o texto do
          cliente, se necessario.
        </Notice>
      ) : null}
      {notice.error ? <Notice error>{notice.error}</Notice> : null}
      <CaseSummary legalCase={legalCase} />
      <Deadlines caseId={caseId} deadlines={deadlines} members={members} />
      <Hearings caseId={caseId} hearings={hearings} />
      <LegalDocuments caseId={caseId} documents={documents.data} />
      <CreateMovement caseId={caseId} />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Movimentações</h2>
          <span className="text-sm text-slate-500">
            {movements.meta.totalItems} registros
          </span>
        </div>
        {movements.data.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            {movements.data.map((movement) => (
              <MovementCard
                key={movement.id}
                caseId={caseId}
                movement={movement}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Hearings({
  caseId,
  hearings,
}: {
  caseId: string;
  hearings: Hearing[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Audiências</h2>
        <p className="text-sm text-slate-500">
          Agendamentos, local e registro do desfecho.
        </p>
      </div>
      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 font-semibold">
          Agendar audiência
        </summary>
        <form action={scheduleHearing} className="grid gap-4 border-t p-5">
          <input type="hidden" name="caseId" value={caseId} />
          <label className="grid gap-2 text-sm font-semibold">
            Título
            <input
              name="title"
              required
              minLength={3}
              maxLength={200}
              placeholder="Ex.: audiência de conciliação"
              className="h-11 rounded-xl border px-3 font-normal"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Data e horário
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                className="h-11 rounded-xl border px-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Local ou link
              <input
                name="location"
                maxLength={300}
                className="h-11 rounded-xl border px-3 font-normal"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Observações
            <textarea
              name="notes"
              rows={2}
              className="rounded-xl border px-3 py-2 font-normal"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isClientVisible" className="size-4 rounded border-slate-300" />
            Exibir título, data e local no portal do cliente
          </label>
          <div className="flex justify-end">
            <button className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
              Agendar
            </button>
          </div>
        </form>
      </details>
      {hearings.length ? (
        <div className="space-y-3">
          {hearings.map((hearing) => (
            <Card key={hearing.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{hearing.title}</p>
                    <Badge
                      className={
                        hearing.status === "SCHEDULED"
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : ""
                      }
                    >
                      {hearing.status === "SCHEDULED"
                        ? "Agendada"
                        : hearing.status === "COMPLETED"
                          ? "Realizada"
                          : "Cancelada"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTime(hearing.scheduledAt)}
                    {hearing.location ? ` · ${hearing.location}` : ""}
                  </p>
                  {hearing.notes ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {hearing.notes}
                    </p>
                  ) : null}
                  {hearing.resolutionNote ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Desfecho: {hearing.resolutionNote}
                    </p>
                  ) : null}
                </div>
                {hearing.status === "SCHEDULED" ? (
                  <form
                    action={updateHearingStatus}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="caseId" value={caseId} />
                    <input type="hidden" name="hearingId" value={hearing.id} />
                    <input
                      name="resolutionNote"
                      placeholder="Observação do desfecho"
                      className="h-9 rounded-lg border px-2 text-sm"
                    />
                    <button
                      name="status"
                      value="COMPLETED"
                      className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white"
                    >
                      Marcar realizada
                    </button>
                    <button
                      name="status"
                      value="CANCELED"
                      className="h-9 rounded-lg border px-3 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
          Nenhuma audiência agendada neste processo.
        </p>
      )}
    </section>
  );
}

function LegalDocuments({
  caseId,
  documents,
}: {
  caseId: string;
  documents: LegalDocument[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Documentos do processo</h2>
        <p className="text-sm text-slate-500">
          Arquivos privados vinculados a este processo, com acesso temporário.
        </p>
      </div>
      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 font-semibold">
          Enviar documento
        </summary>
        <form
          action={uploadLegalDocument}
          encType="multipart/form-data"
          className="grid gap-4 border-t p-5"
        >
          <input type="hidden" name="caseId" value={caseId} />
          <label className="grid gap-2 text-sm font-semibold">
            Arquivo
            <span className="text-xs font-normal text-slate-500">
              PDF, JPG, PNG, WebP ou DOCX; até 20 MB.
            </span>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
              className="block w-full rounded-xl border p-3 text-sm font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Visibilidade
            <select
              name="visibility"
              className="h-11 max-w-sm rounded-xl border px-3 font-normal"
            >
              <option value="INTERNAL">Interno</option>
              <option value="CLIENT_VISIBLE">Visível ao cliente</option>
              <option value="RESTRICTED">Restrito</option>
            </select>
          </label>
          <div className="flex justify-end">
            <button className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
              Enviar arquivo
            </button>
          </div>
        </form>
      </details>
      {documents.length ? (
        <div className="space-y-3">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {document.originalName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(document.sizeBytes)} ·{" "}
                    {visibilityLabel(document.visibility)} ·{" "}
                    {formatDateTime(document.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <form action={downloadLegalDocument}>
                    <input type="hidden" name="caseId" value={caseId} />
                    <input
                      type="hidden"
                      name="documentId"
                      value={document.id}
                    />
                    <button className="text-sm font-semibold text-[var(--brand)]">
                      Baixar
                    </button>
                  </form>
                  <form action={deleteLegalDocument}>
                    <input type="hidden" name="caseId" value={caseId} />
                    <input
                      type="hidden"
                      name="documentId"
                      value={document.id}
                    />
                    <button className="text-sm font-semibold text-red-700">
                      Remover
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
          Nenhum documento associado a este processo.
        </p>
      )}
    </section>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function visibilityLabel(visibility: string) {
  if (visibility === "CLIENT_VISIBLE") return "Visível ao cliente";
  if (visibility === "RESTRICTED") return "Restrito";
  return "Interno";
}

function Deadlines({
  caseId,
  deadlines,
  members,
}: {
  caseId: string;
  deadlines: LegalDeadline[];
  members: OrganizationMember[];
}) {
  const open = deadlines.filter((item) => item.status === "OPEN");
  const overdue = open.filter(
    (item) => new Date(item.dueAt).getTime() < Date.now(),
  );
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Prazos processuais</h2>
        <p className="text-sm text-slate-500">
          {overdue.length} vencido(s) em aberto — permanecem visíveis até
          tratamento explícito.
        </p>
      </div>
      <details className="rounded-2xl border bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 font-semibold">
          Registrar prazo
        </summary>
        <form action={createLegalDeadline} className="grid gap-4 border-t p-5">
          <input type="hidden" name="caseId" value={caseId} />
          <label className="grid gap-2 text-sm font-semibold">
            Título
            <input
              name="title"
              required
              minLength={3}
              maxLength={200}
              className="h-11 rounded-xl border px-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Descrição
            <textarea
              name="description"
              rows={2}
              className="rounded-xl border px-3 py-2 font-normal"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">
              Vencimento
              <input
                name="dueAt"
                type="datetime-local"
                required
                className="h-11 rounded-xl border px-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Prioridade
              <select
                name="priority"
                className="h-11 rounded-xl border px-3 font-normal"
              >
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baixa</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Responsável
              <select
                name="assignedToUserId"
                required
                className="h-11 rounded-xl border px-3 font-normal"
              >
                <option value="">Selecione um membro</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName} —{" "}
                    {member.roles.join(", ") || "sem papel"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
              Criar prazo
            </button>
          </div>
        </form>
      </details>
      {deadlines.length ? (
        <div className="space-y-3">
          {deadlines.map((item) => (
            <Card
              key={item.id}
              className={
                item.status === "OPEN" &&
                new Date(item.dueAt).getTime() < Date.now()
                  ? "border-red-300 bg-red-50/40"
                  : ""
              }
            >
              <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <Badge>
                      {item.priority === "CRITICAL"
                        ? "Crítico"
                        : item.priority === "HIGH"
                          ? "Alta"
                          : item.priority === "LOW"
                            ? "Baixa"
                            : "Normal"}
                    </Badge>
                    {item.status === "OPEN" &&
                    new Date(item.dueAt).getTime() < Date.now() ? (
                      <Badge className="border-red-200 bg-red-100 text-red-800">
                        Vencido
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Vence {formatDateTime(item.dueAt)} · Responsável:{" "}
                    {item.assignedTo.displayName}
                  </p>
                  {item.description ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {item.description}
                    </p>
                  ) : null}
                  {item.completedAt ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Tratado por {item.completedBy?.displayName ?? "usuário"}:{" "}
                      {item.resolutionNote ?? item.status}
                    </p>
                  ) : null}
                </div>
                {item.status === "OPEN" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <details>
                      <summary className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold">
                        Editar
                      </summary>
                      <form
                        action={updateLegalDeadline}
                        className="mt-3 grid min-w-64 gap-3 rounded-xl border bg-white p-4"
                      >
                        <input type="hidden" name="caseId" value={caseId} />
                        <input
                          type="hidden"
                          name="deadlineId"
                          value={item.id}
                        />
                        <label className="grid gap-1 text-xs font-semibold">
                          Título
                          <input
                            name="title"
                            required
                            minLength={3}
                            maxLength={200}
                            defaultValue={item.title}
                            className="h-9 rounded-lg border px-2 font-normal"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                          Descrição
                          <textarea
                            name="description"
                            defaultValue={item.description ?? ""}
                            rows={2}
                            className="rounded-lg border px-2 py-1 font-normal"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                          Vencimento
                          <input
                            name="dueAt"
                            type="datetime-local"
                            required
                            defaultValue={toLocalDateTime(item.dueAt)}
                            className="h-9 rounded-lg border px-2 font-normal"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                          Prioridade
                          <select
                            name="priority"
                            defaultValue={item.priority}
                            className="h-9 rounded-lg border px-2 font-normal"
                          >
                            <option value="LOW">Baixa</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">Alta</option>
                            <option value="CRITICAL">Crítica</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                          Responsável
                          <select
                            name="assignedToUserId"
                            defaultValue={item.assignedTo.id}
                            required
                            className="h-9 rounded-lg border px-2 font-normal"
                          >
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.displayName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="h-9 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white">
                          Salvar prazo
                        </button>
                      </form>
                    </details>
                    <form
                      action={resolveLegalDeadline}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="caseId" value={caseId} />
                      <input type="hidden" name="deadlineId" value={item.id} />
                      <input
                        name="resolutionNote"
                        placeholder="Nota do tratamento"
                        className="h-9 w-40 rounded-lg border px-2 text-sm"
                      />
                      <button
                        name="status"
                        value="COMPLETED"
                        className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white"
                      >
                        Concluir
                      </button>
                      <button
                        name="status"
                        value="DISMISSED"
                        className="h-9 rounded-lg border px-3 text-xs font-semibold"
                      >
                        Dispensar
                      </button>
                    </form>
                  </div>
                ) : (
                  <Badge>
                    {item.status === "COMPLETED" ? "Concluído" : "Dispensado"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
          Nenhum prazo registrado neste processo.
        </p>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function CaseSummary({ legalCase }: { legalCase: LegalCaseDetailData }) {
  const clients = legalCase.parties
    .filter(({ role }) => role === "CLIENT")
    .map(({ party }) => party.name);
  const lawyer = legalCase.lawyers.find(({ isPrimary }) => isPrimary)?.user
    .displayName;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Clientes
          </p>
          <p className="mt-2 text-sm font-semibold">{clients.join(", ")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Responsável
          </p>
          <p className="mt-2 text-sm font-semibold">
            {lawyer ?? "Não definido"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Resumo do cliente
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
            {legalCase.clientSummary ?? "Não publicado"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateMovement({ caseId }: { caseId: string }) {
  return (
    <details className="rounded-2xl border bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="font-semibold">Registrar movimentação</p>
          <p className="mt-1 text-xs text-slate-500">
            O texto do cliente não será publicado automaticamente.
          </p>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
          <Plus className="size-4" /> Nova movimentação
        </span>
      </summary>
      <form action={createCaseMovement} className="grid gap-4 border-t p-5">
        <input type="hidden" name="caseId" value={caseId} />
        <label className="max-w-sm">
          <span className="mb-2 block text-sm font-semibold">
            Data e horário
          </span>
          <input
            name="occurredAt"
            type="datetime-local"
            required
            className="h-11 w-full rounded-xl border px-3 text-sm"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Descrição interna
          </span>
          <textarea
            name="internalDescription"
            required
            minLength={3}
            rows={4}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Texto preparado para o cliente{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <textarea
            name="clientDescription"
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end">
          <button className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white">
            Registrar
          </button>
        </div>
      </form>
    </details>
  );
}

function MovementCard({
  caseId,
  movement,
}: {
  caseId: string;
  movement: Movement;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-[var(--brand)]" />
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Sao_Paulo",
            }).format(new Date(movement.occurredAt))}
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Registrada por {movement.createdBy.displayName}
          </p>
        </div>
        <Badge
          className={
            movement.isPublished
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "bg-slate-50"
          }
        >
          {movement.isPublished ? (
            <>
              <Eye className="mr-1 size-3" /> Visível ao cliente
            </>
          ) : (
            <>
              <EyeOff className="mr-1 size-3" /> Interna
            </>
          )}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Descrição interna
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {movement.internalDescription}
          </p>
        </div>
        <details className="rounded-xl border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
            Editar movimentacao
          </summary>
          <form action={updateCaseMovement} className="grid gap-4 border-t p-4">
            <input type="hidden" name="caseId" value={caseId} />
            <input type="hidden" name="movementId" value={movement.id} />
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Data e horario
              </span>
              <input
                name="occurredAt"
                type="datetime-local"
                required
                defaultValue={toLocalDateTime(movement.occurredAt)}
                className="h-11 w-full max-w-sm rounded-xl border px-3 text-sm"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Descricao interna
              </span>
              <textarea
                name="internalDescription"
                required
                minLength={3}
                rows={3}
                defaultValue={movement.internalDescription}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Texto preparado para o cliente
              </span>
              <textarea
                name="clientDescription"
                rows={3}
                defaultValue={movement.clientDescription ?? ""}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            {movement.isPublished ? (
              <p className="text-xs leading-5 text-amber-800">
                Salvar alteracoes retirara a publicacao atual. Sera necessario
                publicar novamente.
              </p>
            ) : null}
            <div className="flex justify-end">
              <button className="h-10 rounded-xl border px-4 text-sm font-semibold">
                Salvar alteracoes
              </button>
            </div>
          </form>
        </details>
        {movement.isPublished ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Texto visível ao cliente
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {movement.clientDescription}
            </p>
            <form action={unpublishCaseMovement} className="mt-3">
              <input type="hidden" name="caseId" value={caseId} />
              <input type="hidden" name="movementId" value={movement.id} />
              <button className="text-xs font-bold text-red-700">
                Retirar publicação
              </button>
            </form>
          </div>
        ) : (
          <form
            action={publishCaseMovement}
            className="rounded-xl border border-dashed p-4"
          >
            <input type="hidden" name="caseId" value={caseId} />
            <input type="hidden" name="movementId" value={movement.id} />
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Texto para o cliente
              </span>
              <textarea
                name="clientDescription"
                defaultValue={movement.clientDescription ?? ""}
                required
                minLength={3}
                rows={3}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 flex justify-end">
              <button className="h-9 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white">
                Publicar para o cliente
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <Card className="border-dashed">
      <CardContent className="grid min-h-48 place-items-center p-6 text-center">
        <div>
          <CalendarDays className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 font-semibold">Nenhuma movimentação registrada</p>
          <p className="mt-1 text-sm text-slate-500">
            O histórico processual aparecerá aqui.
          </p>
        </div>
      </CardContent>
    </Card>
  );
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
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          : "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      }
    >
      {children}
    </p>
  );
}
function LoadError({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="grid min-h-64 place-items-center p-8 text-center">
        <div>
          <CircleAlert className="mx-auto size-8 text-red-700" />
          <h1 className="mt-3 text-lg font-bold">
            Não foi possível carregar o processo
          </h1>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
          <Link
            href="/legal/cases"
            className="mt-4 inline-block text-sm font-semibold text-[var(--brand)]"
          >
            Voltar aos processos
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
function formatCnj(value: string | null) {
  if (!value || value.length !== 20) return null;
  return `${value.slice(0, 7)}-${value.slice(7, 9)}.${value.slice(9, 13)}.${value.slice(13, 14)}.${value.slice(14, 16)}.${value.slice(16)}`;
}

function toLocalDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(
    parts.map(({ type, value: part }) => [type, part]),
  );
  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`;
}
