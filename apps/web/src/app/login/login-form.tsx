"use client";

import { Button } from "@platform/ui";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 w-full rounded-xl border bg-white px-3 outline-none transition focus:border-[#4f5d3a] focus:ring-2 focus:ring-[#4f5d3a]/15"
          placeholder="voce@empresa.com.br"
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Senha
          </label>
          <span className="text-xs font-semibold text-[#4f5d3a]">
            Esqueci minha senha
          </span>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          className="h-12 w-full rounded-xl border bg-white px-3 outline-none transition focus:border-[#4f5d3a] focus:ring-2 focus:ring-[#4f5d3a]/15"
          placeholder="Sua senha"
        />
      </div>
      {state.message ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        {pending ? "Entrando…" : "Entrar com segurança"}
      </Button>
    </form>
  );
}
