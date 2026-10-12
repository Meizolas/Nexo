import { Badge, Card, CardContent, CardHeader, CardTitle } from "@platform/ui";
import { ArrowLeft, CalendarDays, FileText, Scale } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  downloadPortalDocument,
  requestLegalService,
  uploadPortalDocument,
} from "../actions";
import { apiRequest } from "@/lib/api";

interface PortalLegalCase {
  id: string;
  caseNumber: string | null;
  subject: string;
  clientSummary: string | null;
  tribunal: string | null;
  district: string | null;
  movements: Array<{
    id: string;
    occurredAt: string;
    clientDescription: string;
  }>;
  hearings: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    location: string | null;
  }>;
  documents: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export default async function LegalClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{
    uploaded?: string;
    uploadError?: string;
    requestSent?: string;
    requestError?: string;
  }>;
}) {
  const notices = await searchParams;
  let cases: PortalLegalCase[];
  try {
    cases = await apiRequest<PortalLegalCase[]>("/portal/legal/cases");
  } catch (error) {
    return (
      <Message error>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar seu portal."}
      </Message>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/legal"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
        >
          <ArrowLeft className="size-4" /> Área de acesso
        </Link>
        <header className="rounded-3xl bg-[#1d251c] p-7 text-white sm:p-10">
          <div className="flex items-center gap-3 text-sm font-semibold text-white/65">
            <Scale className="size-5" /> Portal jurídico
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Acompanhe seus processos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Aqui aparecem somente processos associados ao seu acesso e
            informações liberadas pelo escritório.
          </p>
        </header>
        {notices.uploaded === "1" ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            role="status"
          >
            Documento enviado ao escritório. Ele ficará privado e não será
            publicado automaticamente.
          </p>
        ) : null}
        {notices.uploadError === "1" ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            Não foi possível enviar o documento. Confira o arquivo e tente
            novamente.
          </p>
        ) : null}
        {notices.requestSent === "1" ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            role="status"
          >
            Sua solicitação foi encaminhada ao profissional responsável pelo
            processo.
          </p>
        ) : null}
        {notices.requestError === "1" ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            Não foi possível enviar sua solicitação. Confira os campos e tente
            novamente.
          </p>
        ) : null}
        {!cases.length ? (
          <Card className="border-dashed">
            <CardContent className="grid min-h-56 place-items-center p-8 text-center">
              <div>
                <Scale className="mx-auto size-9 text-slate-400" />
                <p className="mt-3 font-semibold">Nenhum processo associado</p>
                <p className="mt-1 text-sm text-slate-500">
                  Se você esperava encontrar um processo, fale com o escritório
                  responsável.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          cases.map((legalCase) => (
            <Card key={legalCase.id}>
              <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-slate-500">
                    {formatCnj(legalCase.caseNumber) ??
                      "Processo sem número CNJ"}
                  </p>
                  <CardTitle className="mt-2 text-xl">
                    {legalCase.subject}
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {[legalCase.tribunal, legalCase.district]
                      .filter(Boolean)
                      .join(" · ") || "Informações judiciais não publicadas"}
                  </p>
                </div>
                <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800">
                  Em acompanhamento
                </Badge>
              </CardHeader>
              <CardContent className="space-y-5">
                <section className="rounded-xl bg-slate-50 p-4">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Resumo do escritório
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {legalCase.clientSummary ||
                      "O escritório ainda não publicou um resumo para este processo."}
                  </p>
                </section>
                <section className="rounded-xl border border-dashed p-4">
                  <h2 className="font-semibold">
                    Enviar documento ao escritório
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    PDF, JPEG, PNG, WebP ou DOCX, até 20 MB. O envio fica
                    privado para a equipe.
                  </p>
                  <form
                    action={uploadPortalDocument}
                    className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="caseId" value={legalCase.id} />
                    <label className="grid flex-1 gap-1 text-sm font-medium">
                      Arquivo
                      <input
                        name="file"
                        type="file"
                        required
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                        className="rounded-lg border bg-white p-2 text-sm"
                      />
                    </label>
                    <button className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white">
                      Enviar arquivo
                    </button>
                  </form>
                </section>
                <section className="rounded-xl border p-4">
                  <h2 className="font-semibold">Solicitar atendimento</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Sua mensagem será encaminhada ao profissional responsável.
                  </p>
                  <form
                    action={requestLegalService}
                    className="mt-3 grid gap-3"
                  >
                    <input type="hidden" name="caseId" value={legalCase.id} />
                    <label className="grid gap-1 text-sm font-medium">
                      Assunto
                      <input
                        name="subject"
                        required
                        minLength={3}
                        maxLength={120}
                        className="rounded-lg border p-2"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                      Mensagem
                      <textarea
                        name="message"
                        required
                        minLength={10}
                      maxLength={1750}
                        rows={4}
                        className="rounded-lg border p-2"
                      />
                    </label>
                    <button className="w-fit rounded-lg border border-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--brand)]">
                      Enviar solicitação
                    </button>
                  </form>
                </section>
                <div className="grid gap-5 lg:grid-cols-2">
                  <section>
                    <h2 className="mb-3 flex items-center gap-2 font-semibold">
                      <CalendarDays className="size-4 text-[var(--brand)]" />{" "}
                      Próximos eventos
                    </h2>
                    {legalCase.hearings.length ? (
                      <div className="space-y-2">
                        {legalCase.hearings.map((hearing) => (
                          <div
                            key={hearing.id}
                            className="rounded-xl border p-3"
                          >
                            <p className="text-sm font-semibold">
                              {hearing.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(hearing.scheduledAt)}
                              {hearing.location ? ` · ${hearing.location}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Nenhum evento liberado no momento.
                      </p>
                    )}
                  </section>
                  <section>
                    <h2 className="mb-3 flex items-center gap-2 font-semibold">
                      <FileText className="size-4 text-[var(--brand)]" />{" "}
                      Documentos liberados
                    </h2>
                    {legalCase.documents.length ? (
                      <div className="space-y-2">
                        {legalCase.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex items-center justify-between gap-3 rounded-xl border p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {document.originalName}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatFileSize(document.sizeBytes)} ·{" "}
                                {formatDateTime(document.createdAt)}
                              </p>
                            </div>
                            <form action={downloadPortalDocument}>
                              <input
                                type="hidden"
                                name="documentId"
                                value={document.id}
                              />
                              <button className="shrink-0 text-sm font-semibold text-[var(--brand)]">
                                Baixar
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Nenhum documento liberado no momento.
                      </p>
                    )}
                  </section>
                </div>
                <section>
                  <h2 className="mb-3 font-semibold">
                    Movimentações publicadas
                  </h2>
                  {legalCase.movements.length ? (
                    <div className="space-y-2">
                      {legalCase.movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="rounded-xl border p-4"
                        >
                          <p className="text-xs text-slate-500">
                            {formatDateTime(movement.occurredAt)}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {movement.clientDescription}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nenhuma movimentação publicada para você.
                    </p>
                  )}
                </section>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}

function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f4] p-6">
      <Card>
        <CardContent
          className={`max-w-lg p-6 text-sm ${error ? "text-red-700" : "text-slate-600"}`}
          role={error ? "alert" : undefined}
        >
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

function formatCnj(value: string | null) {
  if (!value || value.length !== 20) return null;
  return `${value.slice(0, 7)}-${value.slice(7, 9)}.${value.slice(9, 13)}.${value.slice(13, 14)}.${value.slice(14, 16)}.${value.slice(16)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
