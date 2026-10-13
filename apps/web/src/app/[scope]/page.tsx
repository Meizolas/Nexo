import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@platform/ui";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isScopeKey, scopes } from "@/lib/scopes";

export default async function ScopeDashboard({
  params,
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  if (!isScopeKey(scope)) notFound();
  const config = scopes[scope];
  const legal = scope === "legal";
  const metrics = legal
    ? [
        ["Processos ativos", "128", "+8 este mês"],
        ["Prazos próximos", "14", "3 para hoje"],
        ["Clientes", "86", "+5 este mês"],
      ]
    : [
        ["Imóveis ativos", "64", "92% ocupados"],
        ["Contratos vigentes", "71", "4 a renovar"],
        ["Chamados abertos", "9", "2 prioritários"],
      ];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--brand)]">
            {config.eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            {config.title}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">{config.description}</p>
        </div>
        <Link
          href={`/${scope}/${legal ? "cases" : "properties"}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-deep)]"
        >
          <Plus className="size-4" />
          {legal ? "Gerenciar processos" : "Gerenciar imóveis"}
        </Link>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value, detail], index) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    {value}
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  {index === 0 ? (
                    <FolderOpen className="size-5" />
                  ) : index === 1 ? (
                    <Clock3 className="size-5" />
                  ) : (
                    <Users className="size-5" />
                  )}
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold text-[var(--brand)]">
                {detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Atividade recente</CardTitle>
              <CardDescription>
                Atualizações que exigem sua atenção.
              </CardDescription>
            </div>
            <Link
              href={`/${scope}/${legal ? "cases" : "properties"}`}
              className="text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Ver área
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              "Documento adicionado ao cadastro",
              legal ? "Prazo processual atualizado" : "Contrato atualizado",
              legal
                ? "Cliente vinculado ao processo"
                : "Chamado de manutenção recebido",
            ].map((title, index) => (
              <div
                key={title}
                className="flex items-center gap-3 border-t py-3 first:border-t-0"
              >
                <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600">
                  <CheckCircle2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {index + 1}h atrás · Marina Costa
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-slate-400" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Próximos eventos</CardTitle>
              <Badge>Esta semana</Badge>
            </div>
            <CardDescription>Agenda consolidada da equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              [
                "08",
                "OUT",
                legal ? "Audiência de conciliação" : "Vistoria de entrada",
              ],
              [
                "10",
                "OUT",
                legal ? "Prazo para manifestação" : "Renovação de contrato",
              ],
              [
                "12",
                "OUT",
                legal ? "Reunião com cliente" : "Manutenção preventiva",
              ],
            ].map(([day, month, label]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <div className="grid size-11 place-items-center rounded-lg bg-white text-center shadow-sm">
                  <span className="text-sm font-bold leading-none">{day}</span>
                  <span className="text-[9px] font-bold text-[var(--brand)]">
                    {month}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="size-3" /> 14:30
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
