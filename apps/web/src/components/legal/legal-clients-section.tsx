import { Badge, Card, CardContent } from "@platform/ui";
import {
  Building2,
  CircleAlert,
  Plus,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  createLegalClient,
  grantPortalAccess,
  revokePortalAccess,
} from "@/app/[scope]/[section]/actions";
import type { ReactNode } from "react";
import { FormActionButton } from "@/components/form-action-button";

interface Client {
  id: string;
  type: "PERSON" | "COMPANY";
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
}
interface Page<T> {
  data: T[];
  meta: { totalItems: number };
}
interface PortalMember {
  id: string;
  displayName: string;
  roles: string[];
}
interface PortalAccess {
  id: string;
  partyId: string;
  userId: string;
  party: { name: string };
  user: { displayName: string };
}

export async function LegalClientsSection({
  search,
  created,
  error,
  portalLinked,
  portalRevoked,
}: {
  search?: string;
  created?: boolean;
  error?: string;
  portalLinked?: boolean;
  portalRevoked?: boolean;
}) {
  const query = new URLSearchParams({ role: "CLIENT", pageSize: "20" });
  if (search) query.set("search", search);
  let result: Page<Client>;
  let members: PortalMember[];
  let accessLinks: PortalAccess[];
  try {
    [result, members, accessLinks] = await Promise.all([
      apiRequest<Page<Client>>(`/parties?${query}`),
      apiRequest<PortalMember[]>("/organizations/members"),
      apiRequest<PortalAccess[]>("/portal/legal/party-links"),
    ]);
  } catch (error) {
    return (
      <LoadError message={error instanceof Error ? error.message : undefined} />
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      {created ? <Notice>Cliente cadastrado com sucesso.</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {portalLinked ? <Notice>Acesso ao portal liberado.</Notice> : null}
      {portalRevoked ? <Notice>Acesso ao portal revogado.</Notice> : null}
      <CreateClientPanel />
      <form className="rounded-2xl border bg-white p-3 shadow-sm">
        <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <span className="sr-only">Buscar clientes</span>
          <input
            name="q"
            defaultValue={search}
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            placeholder="Nome, CPF ou CNPJ"
          />
        </label>
      </form>
      {result.data.length === 0 ? (
        <EmptyClients />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 text-sm font-semibold">
              {result.meta.totalItems}{" "}
              {result.meta.totalItems === 1 ? "cliente" : "clientes"}
            </div>
            <div className="divide-y">
              {result.data.map((client) => (
                <article
                  key={client.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    {client.type === "PERSON" ? (
                      <UserRound className="size-5" />
                    ) : (
                      <Building2 className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {client.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {client.email ?? "E-mail não informado"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge>
                      {client.type === "PERSON"
                        ? "Pessoa física"
                        : "Pessoa jurídica"}
                    </Badge>
                    <PortalAccessManager
                      client={client}
                      members={members.filter(({ roles }) =>
                        roles.includes("CLIENT"),
                      )}
                      links={accessLinks.filter(
                        ({ partyId }) => partyId === client.id,
                      )}
                    />
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PortalAccessManager({
  client,
  members,
  links,
}: {
  client: Client;
  members: PortalMember[];
  links: PortalAccess[];
}) {
  const linkedUserIds = new Set(links.map(({ userId }) => userId));
  const candidates = members.filter(({ id }) => !linkedUserIds.has(id));
  return (
    <details className="max-w-72 rounded-lg border bg-white px-3 py-2 text-left">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--brand)]">
        Acesso ao portal · {links.length}
      </summary>
      <div className="mt-3 space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="truncate">{link.user.displayName}</span>
            <form action={revokePortalAccess}>
              <input type="hidden" name="linkId" value={link.id} />
              <FormActionButton
                className="font-semibold text-red-700"
                pendingLabel="Revogando…"
                confirmMessage="Revogar o acesso desta pessoa ao portal? Ela não poderá mais consultar seus dados."
              >
                Revogar
              </FormActionButton>
            </form>
          </div>
        ))}
        {candidates.length ? (
          <form action={grantPortalAccess} className="flex gap-2 border-t pt-3">
            <input type="hidden" name="partyId" value={client.id} />
            <label className="sr-only" htmlFor={`portal-user-${client.id}`}>
              Conta de cliente
            </label>
            <select
              id={`portal-user-${client.id}`}
              name="userId"
              required
              className="h-9 min-w-0 flex-1 rounded-lg border px-2 text-xs"
            >
              <option value="">Associar conta...</option>
              {candidates.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
            <button className="h-9 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white">
              Liberar
            </button>
          </form>
        ) : (
          <p className="border-t pt-3 text-xs leading-5 text-slate-500">
            Nenhuma conta ativa com papel CLIENT disponível para associar.
          </p>
        )}
      </div>
    </details>
  );
}

function Header() {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-semibold text-[var(--brand)]">
          Jurídico / Clientes
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="mt-2 text-slate-500">
          Pessoas físicas e jurídicas vinculadas ao atendimento.
        </p>
      </div>
    </div>
  );
}

function CreateClientPanel() {
  return (
    <details className="group rounded-2xl border bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="font-semibold text-slate-900">Cadastrar cliente</p>
          <p className="mt-1 text-xs text-slate-500">
            Pessoa física ou jurídica, reutilizável em toda a organização.
          </p>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
          <Plus className="size-4" /> Novo cliente
        </span>
      </summary>
      <form
        action={createLegalClient}
        className="grid gap-4 border-t p-5 md:grid-cols-2"
      >
        <label>
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Tipo
          </span>
          <select
            name="type"
            required
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
          >
            <option value="PERSON">Pessoa física</option>
            <option value="COMPANY">Pessoa jurídica</option>
          </select>
        </label>
        <Field name="name" label="Nome / razão social" required />
        <Field name="taxId" label="CPF / CNPJ (opcional)" />
        <Field name="email" label="E-mail" type="email" />
        <Field name="phone" label="Telefone" />
        <div className="flex justify-end md:col-span-2">
          <button className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white">
            Salvar cliente
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
  type = "text",
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-[var(--brand)]"
      />
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
function EmptyClients() {
  return (
    <Card className="border-dashed">
      <CardContent className="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <Users className="mx-auto size-9 text-[var(--brand)]" />
          <h2 className="mt-4 text-lg font-bold">Nenhum cliente encontrado</h2>
          <p className="mt-2 text-sm text-slate-500">
            Cadastre uma pessoa física ou jurídica para começar.
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
              Não foi possível carregar os clientes
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
