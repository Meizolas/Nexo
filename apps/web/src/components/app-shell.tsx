import { Badge, cn } from "@platform/ui";
import { Bell, ChevronRight, LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { otherScope, scopeIcon, type ScopeConfig } from "@/lib/scopes";
import { logout } from "@/app/actions/logout";

export function AppShell({
  scope,
  children,
  userLabel,
}: {
  scope: ScopeConfig;
  children: ReactNode;
  userLabel: string;
}) {
  const alternate = otherScope(scope.key);
  const ScopeIcon = scopeIcon[scope.key];
  const AlternateIcon = scopeIcon[alternate.key];
  const style = {
    "--brand": scope.accent,
    "--brand-soft": scope.accentSoft,
    "--brand-deep": scope.accentDeep,
  } as CSSProperties;
  const initials = userLabel
    .split(/[@.\s_-]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      style={style}
      className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]"
    >
      <aside className="hidden min-h-screen border-r bg-[#fbfcfa] lg:flex lg:flex-col">
        <Brand />
        <Navigation scope={scope} />
        <div className="mt-auto border-t p-4">
          <Link
            href={`/${alternate.key}`}
            className="group flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition hover:border-[var(--brand)]"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
              <AlternateIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-slate-500">
                Alternar para
              </span>
              <span className="block truncate text-sm font-semibold text-slate-800">
                {alternate.eyebrow}
              </span>
            </span>
            <ChevronRight
              className="size-4 text-slate-400 transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-7">
          <details className="group lg:hidden">
            <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border text-slate-700 [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" aria-label="Abrir navegação" />
            </summary>
            <div className="fixed inset-x-0 top-16 border-b bg-white p-4 shadow-xl">
              <Navigation scope={scope} compact />
              <Link
                href={`/${alternate.key}`}
                className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700"
              >
                <AlternateIcon className="size-4" /> Alternar para{" "}
                {alternate.eyebrow}
              </Link>
            </div>
          </details>
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--brand)] text-white">
              <ScopeIcon className="size-4" />
            </span>
            <span className="font-semibold">Átrio</span>
          </div>
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 text-slate-500 md:flex">
            <Search className="size-4" aria-hidden="true" />
            <span className="py-2.5 text-sm">
              Buscar em {scope.eyebrow.toLowerCase()}…
            </span>
            <kbd className="ml-auto rounded border bg-white px-1.5 py-0.5 text-[10px]">
              ⌘ K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden border-[var(--brand)]/20 bg-[var(--brand-soft)] text-[var(--brand-deep)] sm:inline-flex">
              {scope.eyebrow}
            </Badge>
            <button
              className="relative grid size-10 place-items-center rounded-xl border bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Notificações"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--brand)]" />
            </button>
            <div
              className="grid size-10 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white"
              title={userLabel}
            >
              {initials || "US"}
            </div>
            <form action={logout}>
              <button
                className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="Sair"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] p-4 md:p-7 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/legal" className="flex h-20 items-center gap-3 border-b px-5">
      <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-lg font-bold text-white">
        Á
      </span>
      <span>
        <span className="block text-lg font-bold tracking-tight">Átrio</span>
        <span className="block text-xs text-slate-500">Gestão integrada</span>
      </span>
    </Link>
  );
}

function Navigation({
  scope,
  compact = false,
}: {
  scope: ScopeConfig;
  compact?: boolean;
}) {
  const ScopeIcon = scopeIcon[scope.key];
  return (
    <nav
      aria-label={`Navegação ${scope.eyebrow}`}
      className={cn("p-4", !compact && "flex-1")}
    >
      <div className="mb-4 flex items-center gap-3 px-2">
        <span className="grid size-9 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
          <ScopeIcon className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">
            Área ativa
          </p>
          <p className="text-sm font-semibold">{scope.eyebrow}</p>
        </div>
      </div>
      <div
        className={cn(
          "space-y-1",
          compact && "grid grid-cols-2 gap-1 space-y-0",
        )}
      >
        {scope.navigation.map((item, index) => {
          const Icon = item.icon;
          const href = item.section
            ? `/${scope.key}/${item.section}`
            : `/${scope.key}`;
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                index === 0
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
