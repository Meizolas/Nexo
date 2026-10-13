"use client";

import { cn } from "@platform/ui";
import {
  Bell,
  ChevronRight,
  House,
  LogOut,
  Menu,
  PanelLeftClose,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { logout } from "@/app/actions/logout";
import logoNexo from "@/images/logo_nexo.png";
import {
  otherScope,
  scopeIcon,
  scopes,
  type ScopeConfig,
  type ScopeKey,
} from "@/lib/scopes";

export function AppShell({
  scopeKey,
  children,
  userLabel,
}: {
  scopeKey: ScopeKey;
  children: ReactNode;
  userLabel: string;
}) {
  const scope = scopes[scopeKey];
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const alternate = otherScope(scope.key);
  const ScopeIcon = scopeIcon[scope.key];
  const AlternateIcon = scopeIcon[alternate.key];
  const currentItem =
    scope.navigation.find((item) => {
      const href = item.section
        ? `/${scope.key}/${item.section}`
        : `/${scope.key}`;
      return item.section ? pathname.startsWith(href) : pathname === href;
    }) ?? scope.navigation[0];
  const style = {
    "--brand": scope.accent,
    "--brand-soft": scope.accentSoft,
    "--brand-deep": scope.accentDeep,
    "--sidebar": scope.secondary,
    "--sidebar-muted": scope.secondaryMuted,
    "--alternate": alternate.accent,
    "--alternate-deep": alternate.accentDeep,
    "--alternate-soft": alternate.accentSoft,
  } as CSSProperties;
  const initials = userLabel
    .split(/[@.\s_-]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      style={style}
      className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[264px_1fr]"
    >
      <aside className="sticky top-0 z-40 hidden h-screen w-[280px] overflow-hidden rounded-r-[32px] bg-[var(--sidebar)] text-white shadow-xl shadow-slate-950/20 lg:flex lg:flex-col">
        <Brand scope={scope} />
        <Navigation scope={scope} pathname={pathname} />
        <div className="mt-auto border-t border-white/10 bg-black/5 p-4">
          <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[.16em] text-white/70">
            Alternar módulo
          </p>
          <Link
            href={`/${alternate.key}`}
            className="group flex items-center gap-3 rounded-2xl border border-white/30 bg-white/95 p-3 text-slate-800 shadow-md shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--alternate-soft)] text-[var(--alternate)] ring-1 ring-[var(--alternate)]/10">
              <AlternateIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-800">
                {alternate.eyebrow}
              </span>
              <span className="block text-xs text-slate-500">
                Ir para a área
              </span>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-[var(--alternate)] transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col overflow-hidden rounded-r-[28px] bg-[var(--sidebar)] text-white shadow-2xl transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="flex items-center border-b border-white/10 pr-3">
          <div className="flex-1">
            <Brand scope={scope} onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            className="grid size-10 place-items-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar navegação"
          >
            <X className="size-5" />
          </button>
        </div>
        <Navigation
          scope={scope}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
        <Link
          href={`/${alternate.key}`}
          onClick={() => setMobileOpen(false)}
          className="m-4 mt-auto flex items-center gap-3 rounded-2xl border border-white/30 bg-white/95 p-3 text-slate-800 shadow-md"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--alternate-soft)] text-[var(--alternate)]">
            <AlternateIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-800">
              {alternate.eyebrow}
            </span>
            <span className="block text-xs text-slate-500">Ir para a área</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-[var(--alternate)]" />
        </Link>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b bg-white/92 px-4 backdrop-blur md:px-6 lg:min-h-[72px]">
          <button
            className="grid size-10 place-items-center rounded-xl border bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir navegação"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" />
          </button>
          <nav aria-label="Localização atual" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="hidden items-center gap-1.5 text-slate-500 sm:flex">
                <House className="size-3.5" aria-hidden="true" /> Nexo
              </li>
              <li className="hidden text-slate-300 sm:block">/</li>
              <li className="hidden text-slate-500 sm:block">
                {scope.eyebrow}
              </li>
              <li className="hidden text-slate-300 sm:block">/</li>
              <li
                className="truncate font-semibold text-slate-900"
                aria-current="page"
              >
                {currentItem.label}
              </li>
            </ol>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div
              className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--brand)]/15 bg-[var(--brand-soft)] px-3 text-[var(--brand-deep)] shadow-sm sm:flex"
              title={`Módulo atual: ${scope.eyebrow}`}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/80">
                <ScopeIcon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap text-xs font-bold">
                {scope.eyebrow}
              </span>
            </div>
            <Link
              href={`/${scope.key}/notifications`}
              className="grid size-10 shrink-0 place-items-center rounded-xl border bg-white text-slate-600 shadow-sm hover:border-[var(--brand)]/30 hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              aria-label="Abrir notificações"
              title="Notificações"
            >
              <Bell className="size-4" />
            </Link>
            <div
              className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--sidebar)] text-sm font-bold leading-none text-white shadow-sm ring-1 ring-black/5"
              title={`Usuário: ${userLabel}`}
              aria-label={`Usuário: ${userLabel}`}
            >
              {initials || "US"}
            </div>
            <form action={logout}>
              <button
                className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                aria-label="Sair do sistema"
                title="Sair"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <p className="sr-only" aria-live="polite">
          Você está em {scope.eyebrow}, {currentItem.label}.
        </p>
        <main
          id="conteudo-principal"
          className="mx-auto w-full max-w-[1480px] p-4 md:p-7 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand({
  scope,
  onNavigate,
}: {
  scope: ScopeConfig;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/${scope.key}`}
      onClick={onNavigate}
      className="flex h-24 items-center px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      aria-label={`Nexo — ir para a visão geral de ${scope.eyebrow}`}
    >
      <Image
        src={logoNexo}
        alt="Nexo"
        priority
        className="h-auto w-[184px] object-contain object-left"
      />
    </Link>
  );
}

function Navigation({
  scope,
  pathname,
  onNavigate,
}: {
  scope: ScopeConfig;
  pathname: string;
  onNavigate?: () => void;
}) {
  const ScopeIcon = scopeIcon[scope.key];
  return (
    <nav
      aria-label={`Navegação do módulo ${scope.eyebrow}`}
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
    >
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/8 px-3 py-3">
        <span className="grid size-9 place-items-center rounded-lg bg-white/10">
          <ScopeIcon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/45">
            Módulo ativo
          </p>
          <p className="text-sm font-semibold">{scope.eyebrow}</p>
        </div>
      </div>
      <div className="space-y-1">
        {scope.navigation.map((item) => {
          const Icon = item.icon;
          const href = item.section
            ? `/${scope.key}/${item.section}`
            : `/${scope.key}`;
          const active = item.section
            ? pathname.startsWith(href)
            : pathname === href;
          return (
            <Link
              key={item.label}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                active
                  ? "bg-white text-[var(--sidebar)] shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {active ? (
                <PanelLeftClose
                  className="size-3.5 opacity-45"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
