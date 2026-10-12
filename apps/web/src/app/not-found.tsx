import { buttonVariants } from "@platform/ui";
import { FolderOpen } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-200 text-slate-600">
          <FolderOpen className="size-6" />
        </span>
        <p className="mt-5 text-sm font-bold text-slate-400">ERRO 404</p>
        <h1 className="mt-2 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-slate-500">
          O endereço pode ter mudado ou você não possui acesso a esta área.
        </p>
        <Link href="/legal" className={buttonVariants({ className: "mt-6" })}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
