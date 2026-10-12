import { Badge, Card, CardContent } from "@platform/ui";
import { Building2, Plus, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import { createRealEstatePerson } from "@/app/[scope]/[section]/actions";

interface Party {
  id: string;
  type: "PERSON" | "COMPANY";
  name: string;
  email: string | null;
  phone: string | null;
}

interface PartyPage {
  data: Party[];
  meta: { totalItems: number };
}

export async function RealEstatePeopleSection({
  created,
  error,
}: {
  created?: boolean;
  error?: string;
}) {
  let owners: Party[];
  let tenants: Party[];
  try {
    const [ownerPage, tenantPage] = await Promise.all([
      apiRequest<PartyPage>("/parties?role=OWNER&pageSize=100"),
      apiRequest<PartyPage>("/parties?role=TENANT&pageSize=100"),
    ]);
    owners = ownerPage.data;
    tenants = tenantPage.data;
  } catch (caught) {
    return (
      <Notice error>
        {caught instanceof Error
          ? caught.message
          : "Não foi possível carregar as pessoas."}
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[var(--brand)]">
          Imobiliário / Pessoas
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Proprietários e locatários
        </h1>
        <p className="mt-2 text-slate-500">
          Pessoas e empresas compartilhadas pelos fluxos imobiliários da
          organização.
        </p>
      </header>
      {created ? <Notice>Pessoa cadastrada.</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      <details className="group rounded-2xl border bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="font-semibold">Cadastrar proprietário ou locatário</p>
            <p className="mt-1 text-xs text-slate-500">
              Os papéis podem coexistir na mesma pessoa.
            </p>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
            <Plus className="size-4" /> Nova pessoa
          </span>
        </summary>
        <form
          action={createRealEstatePerson}
          className="grid gap-3 border-t p-5 md:grid-cols-2"
        >
          <label className="grid gap-1 text-sm font-medium">
            Nome
            <input
              name="name"
              required
              minLength={2}
              maxLength={160}
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Tipo
            <select name="type" className="rounded-lg border px-3 py-2">
              <option value="PERSON">Pessoa física</option>
              <option value="COMPANY">Pessoa jurídica</option>
            </select>
          </label>
          <fieldset className="grid gap-2 text-sm font-medium">
            <legend>Papéis</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="roles" value="OWNER" /> Proprietário
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="roles" value="TENANT" /> Locatário
            </label>
          </fieldset>
          <label className="grid gap-1 text-sm font-medium">
            CPF/CNPJ
            <input
              name="taxId"
              inputMode="numeric"
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            E-mail
            <input
              name="email"
              type="email"
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Telefone
            <input
              name="phone"
              inputMode="tel"
              className="rounded-lg border px-3 py-2"
            />
          </label>
          <button className="w-fit rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
            Salvar pessoa
          </button>
        </form>
      </details>
      <div className="grid gap-5 xl:grid-cols-2">
        <PartyList title="Proprietários" parties={owners} />
        <PartyList title="Locatários" parties={tenants} />
      </div>
    </div>
  );
}

function PartyList({ title, parties }: { title: string; parties: Party[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-5 py-4 text-sm font-semibold">
          {title} · {parties.length}
        </div>
        {parties.length ? (
          <div className="divide-y">
            {parties.map((party) => (
              <article
                key={party.id}
                className="flex items-center gap-3 px-5 py-4"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  {party.type === "PERSON" ? (
                    <UserRound className="size-5" />
                  ) : (
                    <Building2 className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{party.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {party.email ?? party.phone ?? "Contato não informado"}
                  </p>
                </div>
                <Badge>
                  {party.type === "PERSON"
                    ? "Pessoa física"
                    : "Pessoa jurídica"}
                </Badge>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            Nenhuma pessoa cadastrada neste papel.
          </p>
        )}
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
      className={`rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
