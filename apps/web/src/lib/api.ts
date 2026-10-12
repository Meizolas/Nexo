import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface OrganizationMembership {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  isDefault: boolean;
  roles: string[];
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const getApiContext = cache(async () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new ApiRequestError(500, "API não configurada.");

  const supabase = await createSupabaseServerClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  if (!userData.user || !sessionData.session) redirect("/login");

  const authorization = `Bearer ${sessionData.session.access_token}`;
  const response = await fetch(`${apiUrl}/organizations`, {
    headers: { authorization },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      "Não foi possível carregar as organizações.",
    );
  }

  const memberships = (await response.json()) as OrganizationMembership[];
  const cookieStore = await cookies();
  const preferredId = cookieStore.get("active_organization_id")?.value;
  const membership =
    memberships.find(({ organizationId }) => organizationId === preferredId) ??
    memberships.find(({ isDefault }) => isDefault) ??
    memberships[0];
  if (!membership)
    throw new ApiRequestError(403, "Nenhuma organização ativa encontrada.");

  return { apiUrl, authorization, membership };
});

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { apiUrl, authorization, membership } = await getApiContext();
  const headers = new Headers(init?.headers);
  headers.set("authorization", authorization);
  headers.set("x-organization-id", membership.organizationId);
  if (
    init?.body &&
    !(init.body instanceof FormData) &&
    !headers.has("content-type")
  )
    headers.set("content-type", "application/json");

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiRequestError(
      response.status,
      body?.message ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
