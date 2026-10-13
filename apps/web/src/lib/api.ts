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
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface ApiErrorBody {
  code?: string;
  message?: string;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiRequestError(
      503,
      "A API do Nexo não está acessível. Confirme se o servidor foi iniciado e tente novamente.",
      "API_UNAVAILABLE",
    );
  }
}

async function responseError(
  response: Response,
  fallback: string,
): Promise<ApiRequestError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

  if (response.status === 401) {
    return new ApiRequestError(
      401,
      "A API recusou sua sessão. Verifique SUPABASE_JWT_ISSUER e SUPABASE_JWT_AUDIENCE no .env, reinicie o sistema e entre novamente.",
      body?.code ?? "AUTHENTICATION_REQUIRED",
    );
  }

  if (response.status === 403) {
    return new ApiRequestError(
      403,
      body?.message ?? "Seu usuário não tem permissão para realizar esta ação.",
      body?.code ?? "ACCESS_DENIED",
    );
  }

  return new ApiRequestError(
    response.status,
    body?.message ?? fallback,
    body?.code,
  );
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
  const response = await request(`${apiUrl}/organizations`, {
    headers: { authorization },
    cache: "no-store",
  });
  if (!response.ok) {
    throw await responseError(
      response,
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

  const response = await request(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw await responseError(
      response,
      "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
