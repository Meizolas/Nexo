import { Badge, Card, CardContent } from "@platform/ui";
import { ArrowLeft, Building2, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { FormActionButton } from "@/components/form-action-button";
import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  addPropertyOwner,
  createPropertyUnit,
  endPropertyOwnership,
} from "@/app/[scope]/[section]/actions";

interface Party {
  id: string;
  name: string;
}
interface Property {
  id: string;
  name: string;
  type: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  ownerships: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    party: Party;
  }>;
  units: Array<{ id: string; name: string; status: string }>;
}
interface PartyPage {
  data: Party[];
}

export async function PropertyDetail({
  propertyId,
  notice,
}: {
  propertyId: string;
  notice: {
    unitCreated?: string;
    ownerAdded?: string;
    ownerEnded?: string;
    error?: string;
  };
}) {
  let property: Property;
  let parties: Party[];
  try {
    [property, { data: parties }] = await Promise.all([
      apiRequest<Property>(`/real-estate/properties/${propertyId}`),
      apiRequest<PartyPage>("/parties?role=OWNER&pageSize=100"),
    ]);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    return (
      <Notice error>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar o imóvel."}
      </Notice>
    );
  }
  const currentOwners = property.ownerships.filter(({ endedAt }) => !endedAt);
  const currentOwnerIds = new Set(currentOwners.map(({ party }) => party.id));
  const availableOwners = parties.filter(({ id }) => !currentOwnerIds.has(id));

  return (
    <div className="space-y-6">
      <Link
        href="/real-estate/properties"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
      >
        <ArrowLeft className="size-4" /> Imóveis
      </Link>
      {notice.unitCreated === "1" ? <Notice>Unidade cadastrada.</Notice> : null}
      {notice.ownerAdded === "1" ? (
        <Notice>Proprietário associado.</Notice>
      ) : null}
      {notice.ownerEnded === "1" ? (
        <Notice>Vínculo de propriedade encerrado.</Notice>
      ) : null}
      {notice.error ? <Notice error>{notice.error}</Notice> : null}
      <header className="rounded-3xl bg-[#561829] p-7 text-white sm:p-9">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Building2 className="size-4" /> Imóvel
        </div>
        <h1 className="mt-3 text-3xl font-bold">{property.name}</h1>
        <p className="mt-2 text-sm text-white/70">
          {[
            property.addressLine,
            [property.city, property.state].filter(Boolean).join(" / "),
            property.postalCode,
          ]
            .filter(Boolean)
            .join(" · ") || "Endereço não informado"}
        </p>
      </header>
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 font-semibold">
              Proprietários e histórico
            </div>
            <div className="divide-y">
              {property.ownerships.length ? (
                property.ownerships.map((ownership) => (
                  <article
                    key={ownership.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <UserRound className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {ownership.party.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Desde {formatDate(ownership.startedAt)}
                        {ownership.endedAt
                          ? ` · até ${formatDate(ownership.endedAt)}`
                          : ""}
                      </p>
                    </div>
                    {ownership.endedAt ? (
                      <Badge>Histórico</Badge>
                    ) : (
                      <form action={endPropertyOwnership}>
                        <input
                          type="hidden"
                          name="propertyId"
                          value={property.id}
                        />
                        <input
                          type="hidden"
                          name="ownershipId"
                          value={ownership.id}
                        />
                        <FormActionButton
                          className="text-xs font-semibold text-red-700"
                          pendingLabel="Encerrando…"
                          confirmMessage="Encerrar este vínculo de propriedade? Confirme para continuar."
                        >
                          Encerrar vínculo
                        </FormActionButton>
                      </form>
                    )}
                  </article>
                ))
              ) : (
                <p className="p-5 text-sm text-slate-500">
                  Nenhum proprietário associado.
                </p>
              )}
            </div>
            {availableOwners.length ? (
              <form
                action={addPropertyOwner}
                className="flex gap-2 border-t p-4"
              >
                <input type="hidden" name="propertyId" value={property.id} />
                <label className="sr-only" htmlFor="new-owner">
                  Adicionar proprietário
                </label>
                <select
                  id="new-owner"
                  name="partyId"
                  required
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Adicionar proprietário...</option>
                  {availableOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
                <button className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">
                  <Plus className="size-4" /> Associar
                </button>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 font-semibold">Unidades</div>
            {property.units.length ? (
              <div className="divide-y">
                {property.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <span className="font-medium">{unit.name}</span>
                    <Badge>
                      {unit.status === "ACTIVE" ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm text-slate-500">
                Imóvel sem unidades cadastradas.
              </p>
            )}
            <form
              action={createPropertyUnit}
              className="flex gap-2 border-t p-4"
            >
              <input type="hidden" name="propertyId" value={property.id} />
              <label className="sr-only" htmlFor="unit-name">
                Nome da unidade
              </label>
              <input
                id="unit-name"
                name="name"
                required
                maxLength={100}
                placeholder="Ex.: Apartamento 12"
                className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <button className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">
                <Plus className="size-4" /> Unidade
              </button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
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
