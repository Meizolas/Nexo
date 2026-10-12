"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginState {
  message?: string;
}

export async function login(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) {
    return { message: "Informe um e-mail válido e sua senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "E-mail ou senha inválidos." };

  const requestedPath = String(formData.get("next") ?? "/legal");
  redirect(
    requestedPath.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/legal",
  );
}
