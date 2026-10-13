import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { isScopeKey } from "@/lib/scopes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ScopeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  if (!isScopeKey(scope)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return (
    <AppShell scopeKey={scope} userLabel={data.user.email ?? "Usuário"}>
      {children}
    </AppShell>
  );
}
