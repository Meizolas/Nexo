import { Badge, Card, CardContent } from "@platform/ui";
import {
  BriefcaseBusiness,
  CircleAlert,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { createLegalCase } from "@/app/[scope]/[section]/actions";
import type { ReactNode } from "react";
import Link from "next/link";

interface LegalCase {
  id: string;
  caseNumber: string | null;
  subject: string;
  tribunal: string | null;
  district: string | null;
  courtDivision: string | null;
  parties: Array<{ role: string; party: { id: string; name: string } }>;
  lawyers: Array<{ isPrimary: boolean; user: { displayName: string } }>;
  updatedAt: string;
}

interface Page<T> {
  data: T[];
  meta: { totalItems: number; page: number; totalPages: number };
}

interface ClientOption {
  id: string;
  name: string;
}
interface LawyerOption {
  userId: string;
  displayName: string;
}

export async function LegalCasesSection({
  search,
  created,
  error,
}: {
  search?: string;
  created?: boolean;
  error?: string;
}) {
  const query = new URLSearchParams({ pageSize: "20" });
  if (search) query.set("search", search);

  let result: Page<LegalCase>;
  let clients: ClientOption[];
  let lawyers: LawyerOption[];
  try {
    const [casePage, clientPage, lawyerList] = await Promise.all([
      apiRequest<Page<LegalCase>>(`/legal/cases?${query}`),
      apiRequest<Page<ClientOption>>("/parties?role=CLIENT&pageSize=100"),
      apiRequest<LawyerOption[]>("/legal/cases/lawyers"),
    ]);
    result = casePage;
    clients = clientPage.data;
    lawyers = lawyerList;
  } catch (error) {
    return (
      <LoadError message={error instanceof Error ? error.message : undefined} />
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      {created ? <Notice>Processo cadastrado com sucesso.</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      <CreateCasePanel clients={clients} lawyers={lawyers} />
      <form className="flex flex-col gap-3 rounded-2xl border bg-white p-3 shadow-sm sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <span className="sr-only">Buscar processos</span>
          <input
            name="q"
            defaultValue={search}
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Número CNJ ou assunto"
          />
        </label>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold text-slate-700">
          <Filter className="size-4" /> Filtrar
        </button>
      </form>
      {result.data.length === 0 ? (
        <EmptyCases />
      ) : (
        <CaseList cases={result.data} total={result.meta.totalItems} />
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-semibold text-[var(--brand)]">
          Jurídico / Processos
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Processos
        </h1>
        <p className="mt-2 text-slate-500">
          Acompanhe partes, responsáveis e informações processuais.
        </p>
      </div>
    </div>
  );
}

function CreateCasePanel({
  clients,
  lawyers,
}: {
  clients: ClientOption[];
  lawyers: LawyerOption[];
}) {
  const unavailable = clients.length === 0 || lawyers.length === 0;
  return (
    <details className="group rounded-2xl border bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="font-semibold text-slate-900">Cadastrar processo</p>
          <p className="mt-1 text-xs text-slate-500">
            Vincule um cliente e o advogado responsável.
          </p>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
          <Plus className="size-4" /> Novo processo
        </span>
      </summary>
      <form
        action={createLegalCase}
        className="grid gap-4 border-t p-5 md:grid-cols-2"
      >
        <Field name="subject" label="Assunto" required />
        <Field
          name="caseNumber"
          label="Número CNJ (opcional)"
          placeholder="0000000-00.0000.0.00.0000"
        />
        <Select
          name="clientId"
          label="Cliente"
          options={clients.map(({ id, name }) => ({ value: id, label: name }))}
          required
        />
        <Select
          name="responsibleLawyerId"
          label="Advogado responsável"
          options={lawyers.map(({ userId, displayName }) => ({
            value: userId,
            label: displayName,
          }))}
          required
        />
        <Field name="tribunal" label="Tribunal" />
        <Field name="district" label="Comarca / seção" />
        <Field name="courtDivision" label="Vara / unidade" />
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Resumo visível ao cliente
          </span>
          <textarea
            name="clientSummary"
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Observações internas
          </span>
          <textarea
            name="internalNotes"
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
        {unavailable ? (
          <p className="text-sm text-amber-700 md:col-span-2">
            Cadastre ao menos um cliente e um usuário com papel LAWYER antes de
            criar o processo.
          </p>
        ) : null}
        <div className="flex justify-end md:col-span-2">
          <button
            disabled={unavailable}
            className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Salvar processo
          </button>
        </div>
      </form>
    </details>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}
function Select({
  name,
  label,
  options,
  required,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        name={name}
        required={required}
        className="h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

function CaseList({ cases, total }: { cases: LegalCase[]; total: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-semibold text-slate-800">
            {total} {total === 1 ? "processo" : "processos"}
          </p>
          <Badge>Atualizado agora</Badge>
        </div>
        <div className="divide-y">
          {cases.map((legalCase) => {
            const clients = legalCase.parties.filter(
              ({ role }) => role === "CLIENT",
            );
            const lawyer = legalCase.lawyers.find(({ isPrimary }) => isPrimary);
            return (
              <article
                key={legalCase.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.4fr_1fr_.8fr_auto] md:items-center"
              >
                <div>
                  <Link
                    href={`/legal/cases/${legalCase.id}`}
                    className="font-semibold text-slate-900 hover:text-[var(--brand)] hover:underline"
                  >
                    {legalCase.subject}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {formatCnj(legalCase.caseNumber) ?? "Sem número CNJ"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Cliente
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-700">
                    {clients.map(({ party }) => party.name).join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Responsável
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-700">
                    {lawyer?.user.displayName ?? "Não definido"}
                  </p>
                </div>
                <Badge className="w-fit border-[var(--brand)]/20 bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                  Em acompanhamento
                </Badge>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyCases() {
  return (
    <Card className="border-dashed">
      <CardContent className="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <BriefcaseBusiness className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Nenhum processo encontrado</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Cadastre o primeiro processo e vincule ao menos um cliente e um
            advogado responsável.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadError({ message }: { message?: string }) {
  return (
    <div className="space-y-6">
      <Header />
      <Card>
        <CardContent className="grid min-h-64 place-items-center p-8 text-center">
          <div>
            <CircleAlert className="mx-auto size-8 text-red-700" />
            <h2 className="mt-3 font-bold">
              Não foi possível carregar os processos
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {message ?? "Tente novamente em instantes."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCnj(value: string | null) {
  if (!value || value.length !== 20) return null;
  return `${value.slice(0, 7)}-${value.slice(7, 9)}.${value.slice(9, 13)}.${value.slice(13, 14)}.${value.slice(14, 16)}.${value.slice(16)}`;
}
