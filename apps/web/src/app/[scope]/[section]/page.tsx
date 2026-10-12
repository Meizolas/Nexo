import { Button, Card, CardContent } from "@platform/ui";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { isScopeKey, scopes } from "@/lib/scopes";
import { LegalCasesSection } from "@/components/legal/legal-cases-section";
import { LegalClientsSection } from "@/components/legal/legal-clients-section";

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ scope: string; section: string }>;
  searchParams: Promise<{ q?: string; created?: string; error?: string; portalLinked?: string; portalRevoked?: string }>;
}) {
  const { scope, section } = await params;
  const { q, created, error, portalLinked, portalRevoked } = await searchParams;
  if (!isScopeKey(scope)) notFound();
  const item = scopes[scope].navigation.find(
    (candidate) => candidate.section === section,
  );
  if (!item) notFound();
  if (scope === "legal" && section === "cases")
    return (
      <LegalCasesSection search={q} created={created === "1"} error={error} />
    );
  if (scope === "legal" && section === "people")
    return (
      <LegalClientsSection
        search={q}
        created={created === "1"}
        error={error}
        portalLinked={portalLinked === "1"}
        portalRevoked={portalRevoked === "1"}
      />
    );
  const Icon = item.icon;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--brand)]">
          {scopes[scope].eyebrow} / {item.label}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {item.label}
        </h1>
        <p className="mt-2 text-slate-500">
          Esta área está pronta para receber os dados do módulo.
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="grid min-h-80 place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Icon className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Nenhum registro por aqui
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Quando houver registros, eles aparecerão nesta página com filtros
              e ações contextuais.
            </p>
            <Button className="mt-5">
              <Plus className="size-4" /> Adicionar registro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
