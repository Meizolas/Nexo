"use client";

import { Button } from "@platform/ui";
import { CircleAlert } from "lucide-react";

export default function ScopeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
          <CircleAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tente novamente. Se o problema continuar, informe o suporte.
        </p>
        <Button className="mt-5" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </section>
  );
}
