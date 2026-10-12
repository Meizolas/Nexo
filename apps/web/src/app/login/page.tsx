import { Building2, Scale, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/legal" } = await searchParams;
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#1d251c] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-[#7a263a]/35 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 size-80 rounded-full bg-[#718053]/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white text-xl font-bold text-slate-950">
            Á
          </span>
          <div>
            <p className="text-xl font-bold">Átrio</p>
            <p className="text-xs text-white/55">Gestão integrada</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-[#c8d3b8]">
            Tudo em seu devido lugar
          </p>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">
            Jurídico e imobiliário, conectados com segurança.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">
            Uma visão clara da operação, com dados isolados por organização e
            cada pessoa no contexto certo.
          </p>
          <div className="mt-10 flex gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm">
              <Scale className="size-4" /> Jurídico
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm">
              <Building2 className="size-4" /> Imobiliário
            </span>
          </div>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/50">
          <ShieldCheck className="size-4" /> Acesso protegido e auditável
        </p>
      </section>
      <section className="flex items-center justify-center bg-[#f7f8f5] p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-950 font-bold text-white">
              Á
            </span>
            <span className="text-lg font-bold">Átrio</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-[#4f5d3a]">
            Boas-vindas
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Acesse sua conta
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use as credenciais da sua organização.
          </p>
          <LoginForm nextPath={next} />
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            Ao entrar, você concorda com as políticas de segurança e privacidade
            da sua organização.
          </p>
        </div>
      </section>
    </main>
  );
}
