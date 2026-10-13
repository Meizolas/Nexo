"use client";

import { Button } from "@platform/ui";
import { CircleAlert, RefreshCw } from "lucide-react";

export default function ScopeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      className="grid min-h-[60vh] place-items-center"
      role="alert"
      aria-labelledby="error-title"
    >
      <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
          <CircleAlert className="size-6" />
        </span>
        <h1 id="error-title" className="mt-4 text-xl font-bold">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {error.message ||
            "O Nexo encontrou um erro inesperado ao buscar os dados desta página."}
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-slate-400">
            Referência: {error.digest}
          </p>
        ) : null}
        <Button className="mt-5 bg-[var(--brand)]" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    </section>
  );
}
