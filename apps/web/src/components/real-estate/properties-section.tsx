import { Badge, Card, CardContent } from "@platform/ui";
import { Building2, House, Plus } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { createProperty } from "@/app/[scope]/[section]/actions";

interface Owner {
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
  status: string;
  units: Array<{ id: string; name: string }>;
  ownerships: Array<{ id: string; endedAt: string | null; party: Owner }>;
}
interface Page<T> {
  data: T[];
  meta: { totalItems: number };
}
interface PartyPage {
  data: Owner[];
}

export async function PropertiesSection({
  created,
  error,
}: {
  created?: boolean;
  error?: string;
}) {
  let properties: Property[];
  let owners: Owner[];
  try {
    const [page, ownerPage] = await Promise.all([
      apiRequest<Page<Property>>("/real-estate/properties?pageSize=100"),
      apiRequest<PartyPage>("/parties?role=OWNER&pageSize=100"),
    ]);
    properties = page.data;
    owners = ownerPage.data;
  } catch (caught) {
    return (
      <Notice error>
        {caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os imóveis."}
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[var(--brand)]">
          Imobiliário / Imóveis
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Imóveis e unidades
        </h1>
        <p className="mt-2 text-slate-500">
          Cadastre os imóveis, proprietários e unidades locáveis.
        </p>
      </header>
      {created ? <Notice>Imóvel cadastrado com sucesso.</Notice> : null}
      {error ? <Notice error>{error}</Notice> : null}
      <details className="group rounded-2xl border bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="font-semibold">Cadastrar imóvel</p>
            <p className="mt-1 text-xs text-slate-500">
              Informe ao menos um proprietário já cadastrado.
            </p>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white">
            <Plus className="size-4" /> Novo imóvel
          </span>
        </summary>
        {owners.length ? (
          <form
            action={createProperty}
            className="grid gap-3 border-t p-5 md:grid-cols-2"
          >
            <label className="grid gap-1 text-sm font-medium">
              Nome do imóvel
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
                <option value="RESIDENTIAL">Residencial</option>
                <option value="COMMERCIAL">Comercial</option>
                <option value="LAND">Terreno</option>
                <option value="MIXED_USE">Uso misto</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Endereço
              <input
                name="addressLine"
                maxLength={240}
                className="rounded-lg border px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Cidade
              <input
                name="city"
                maxLength={120}
                className="rounded-lg border px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-medium">
                UF
                <input
                  name="state"
                  maxLength={2}
                  className="rounded-lg border px-3 py-2 uppercase"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                CEP
                <input
                  name="postalCode"
                  inputMode="numeric"
                  maxLength={9}
                  className="rounded-lg border px-3 py-2"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Proprietários
              <select
                name="ownerPartyIds"
                required
                multiple
                size={Math.min(owners.length, 5)}
                className="rounded-lg border px-3 py-2"
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-slate-500">
                Use Ctrl/Cmd para selecionar mais de um proprietário.
              </span>
            </label>
            <button className="w-fit rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white md:col-span-2">
              Salvar imóvel
            </button>
          </form>
        ) : (
          <div className="border-t p-5 text-sm text-slate-600">
            Cadastre primeiro um proprietário na seção{" "}
            <Link
              href="/real-estate/people"
              className="font-semibold text-[var(--brand)]"
            >
              Pessoas
            </Link>
            .
          </div>
        )}
      </details>
      {properties.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4 text-sm font-semibold">
              {properties.length}{" "}
              {properties.length === 1 ? "imóvel" : "imóveis"}
            </div>
            <div className="divide-y">
              {properties.map((property) => {
                const currentOwners = property.ownerships.filter(
                  ({ endedAt }) => !endedAt,
                );
                return (
                  <Link
                    key={property.id}
                    href={`/real-estate/properties/${property.id}`}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <House className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{property.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {[
                          property.addressLine,
                          [property.city, property.state]
                            .filter(Boolean)
                            .join(" / "),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Endereço não informado"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {currentOwners
                          .map(({ party }) => party.name)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>
                        {property.units.length}{" "}
                        {property.units.length === 1 ? "unidade" : "unidades"}
                      </Badge>
                      <Badge>
                        {property.type === "RESIDENTIAL"
                          ? "Residencial"
                          : property.type === "COMMERCIAL"
                            ? "Comercial"
                            : property.type === "LAND"
                              ? "Terreno"
                              : property.type === "MIXED_USE"
                                ? "Uso misto"
                                : "Outro"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="grid min-h-60 place-items-center p-8 text-center">
            <div>
              <Building2 className="mx-auto size-9 text-slate-400" />
              <h2 className="mt-3 font-semibold">Nenhum imóvel cadastrado</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre um proprietário e então crie o primeiro imóvel.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
