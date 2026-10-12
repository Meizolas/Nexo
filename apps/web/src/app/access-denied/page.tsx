import { Button } from "@platform/ui";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldX className="size-6" />
        </span>
        <p className="mt-5 text-sm font-bold text-amber-700">ACESSO RESTRITO</p>
        <h1 className="mt-2 text-2xl font-bold">
          Você não pode acessar esta área
        </h1>
        <p className="mt-2 text-slate-500">
          Peça ao administrador da organização a permissão necessária.
        </p>
        <Link href="/legal" className="mt-6 inline-flex">
          <Button>Voltar ao início</Button>
        </Link>
      </div>
    </main>
  );
}
