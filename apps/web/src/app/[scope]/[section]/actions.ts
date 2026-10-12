"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";

function optional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

export async function createLegalClient(formData: FormData) {
  try {
    await apiRequest("/parties", {
      method: "POST",
      body: JSON.stringify({
        type: String(formData.get("type")),
        name: String(formData.get("name") ?? ""),
        taxId: optional(formData, "taxId"),
        email: optional(formData, "email"),
        phone: optional(formData, "phone"),
        roles: ["CLIENT"],
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o cliente.";
    redirect(`/legal/people?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/legal/people");
  redirect("/legal/people?created=1");
}

export async function createRealEstatePerson(formData: FormData) {
  const roles = formData
    .getAll("roles")
    .map(String)
    .filter((role) => role === "OWNER" || role === "TENANT");
  if (!roles.length)
    redirect("/real-estate/people?error=Selecione%20ao%20menos%20um%20papel.");
  try {
    await apiRequest("/parties", {
      method: "POST",
      body: JSON.stringify({
        type: String(formData.get("type") ?? "PERSON"),
        name: String(formData.get("name") ?? ""),
        taxId: optional(formData, "taxId"),
        email: optional(formData, "email"),
        phone: optional(formData, "phone"),
        roles,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar a pessoa.";
    redirect(`/real-estate/people?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/real-estate/people");
  redirect("/real-estate/people?created=1");
}

export async function createProperty(formData: FormData) {
  try {
    await apiRequest("/real-estate/properties", {
      method: "POST",
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        type: String(formData.get("type") ?? "RESIDENTIAL"),
        addressLine: optional(formData, "addressLine"),
        city: optional(formData, "city"),
        state: optional(formData, "state"),
        postalCode: optional(formData, "postalCode"),
        ownerPartyIds: formData.getAll("ownerPartyIds").map(String),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o imóvel.";
    redirect(`/real-estate/properties?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/real-estate/properties");
  redirect("/real-estate/properties?created=1");
}

function propertyPath(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  return { propertyId, path: `/real-estate/properties/${propertyId}` };
}

export async function createPropertyUnit(formData: FormData) {
  const { propertyId, path } = propertyPath(formData);
  try {
    await apiRequest(`/real-estate/properties/${propertyId}/units`, {
      method: "POST",
      body: JSON.stringify({ name: String(formData.get("name") ?? "") }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar a unidade.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?unitCreated=1`);
}

export async function addPropertyOwner(formData: FormData) {
  const { propertyId, path } = propertyPath(formData);
  try {
    await apiRequest(`/real-estate/properties/${propertyId}/owners`, {
      method: "POST",
      body: JSON.stringify({ partyId: String(formData.get("partyId") ?? "") }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível associar o proprietário.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?ownerAdded=1`);
}

export async function endPropertyOwnership(formData: FormData) {
  const { propertyId, path } = propertyPath(formData);
  const ownershipId = String(formData.get("ownershipId") ?? "");
  try {
    await apiRequest(
      `/real-estate/properties/${propertyId}/owners/${ownershipId}/end`,
      {
        method: "PATCH",
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível encerrar o vínculo.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?ownerEnded=1`);
}

function leaseInput(formData: FormData) {
  const responsiblePartyId = String(
    formData.get("financialResponsiblePartyId") ?? "",
  );
  return {
    unitId: String(formData.get("unitId") ?? ""),
    tenants: formData.getAll("tenantPartyIds").map((value) => ({
      partyId: String(value),
      isFinancialResponsible: String(value) === responsiblePartyId,
    })),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: optional(formData, "endDate"),
    monthlyRent: String(formData.get("monthlyRent") ?? ""),
    currency: String(formData.get("currency") ?? "BRL"),
    dueDay: Number(formData.get("dueDay")),
  };
}

function leasePath(formData: FormData) {
  const leaseId = String(formData.get("leaseId") ?? "");
  return { leaseId, path: `/real-estate/contracts/${leaseId}` };
}

export async function createLease(formData: FormData) {
  let leaseId: string;
  try {
    const lease = await apiRequest<{ id: string }>("/real-estate/leases", {
      method: "POST",
      body: JSON.stringify(leaseInput(formData)),
    });
    leaseId = lease.id;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível criar o contrato.";
    redirect(`/real-estate/contracts?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/real-estate/contracts");
  redirect(`/real-estate/contracts/${leaseId}?created=1`);
}

export async function updateLease(formData: FormData) {
  const { leaseId, path } = leasePath(formData);
  try {
    await apiRequest(`/real-estate/leases/${leaseId}`, {
      method: "PATCH",
      body: JSON.stringify(leaseInput(formData)),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o contrato.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  revalidatePath("/real-estate/contracts");
  redirect(`${path}?updated=1`);
}

export async function activateLease(formData: FormData) {
  const { leaseId, path } = leasePath(formData);
  try {
    await apiRequest(`/real-estate/leases/${leaseId}/activate`, {
      method: "POST",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível ativar o contrato.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  revalidatePath("/real-estate/contracts");
  redirect(`${path}?activated=1`);
}

export async function cancelLease(formData: FormData) {
  const { leaseId, path } = leasePath(formData);
  try {
    await apiRequest(`/real-estate/leases/${leaseId}/cancel`, {
      method: "POST",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cancelar o contrato.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  revalidatePath("/real-estate/contracts");
  redirect(`${path}?canceled=1`);
}

export async function endLease(formData: FormData) {
  const { leaseId, path } = leasePath(formData);
  try {
    await apiRequest(`/real-estate/leases/${leaseId}/end`, {
      method: "POST",
      body: JSON.stringify({
        endDate: String(formData.get("endDate") ?? ""),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível encerrar o contrato.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  revalidatePath("/real-estate/contracts");
  redirect(`${path}?ended=1`);
}

export async function createLegalCase(formData: FormData) {
  try {
    await apiRequest("/legal/cases", {
      method: "POST",
      body: JSON.stringify({
        caseNumber: optional(formData, "caseNumber"),
        subject: String(formData.get("subject") ?? ""),
        tribunal: optional(formData, "tribunal"),
        district: optional(formData, "district"),
        courtDivision: optional(formData, "courtDivision"),
        internalNotes: optional(formData, "internalNotes"),
        clientSummary: optional(formData, "clientSummary"),
        responsibleLawyerId: String(formData.get("responsibleLawyerId") ?? ""),
        parties: [
          { partyId: String(formData.get("clientId") ?? ""), role: "CLIENT" },
        ],
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o processo.";
    redirect(`/legal/cases?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/legal/cases");
  redirect("/legal/cases?created=1");
}

function movementPath(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  return { caseId, path: `/legal/cases/${caseId}` };
}

export async function createCaseMovement(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const localDateTime = String(formData.get("occurredAt") ?? "");
  try {
    const occurredAt = new Date(`${localDateTime}:00-03:00`).toISOString();
    await apiRequest(`/legal/cases/${caseId}/movements`, {
      method: "POST",
      body: JSON.stringify({
        occurredAt,
        internalDescription: String(formData.get("internalDescription") ?? ""),
        clientDescription: optional(formData, "clientDescription"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível registrar a movimentação.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?created=1`);
}

export async function publishCaseMovement(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const movementId = String(formData.get("movementId") ?? "");
  try {
    await apiRequest(`/legal/cases/${caseId}/movements/${movementId}/publish`, {
      method: "POST",
      body: JSON.stringify({
        clientDescription: String(formData.get("clientDescription") ?? ""),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível publicar a movimentação.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?published=1`);
}

export async function unpublishCaseMovement(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const movementId = String(formData.get("movementId") ?? "");
  try {
    await apiRequest(
      `/legal/cases/${caseId}/movements/${movementId}/unpublish`,
      { method: "POST" },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível retirar a publicação.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?unpublished=1`);
}

export async function updateCaseMovement(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const movementId = String(formData.get("movementId") ?? "");
  try {
    const localDateTime = String(formData.get("occurredAt") ?? "");
    const occurredAt = new Date(`${localDateTime}:00-03:00`).toISOString();
    await apiRequest(`/legal/cases/${caseId}/movements/${movementId}`, {
      method: "PATCH",
      body: JSON.stringify({
        occurredAt,
        internalDescription: String(formData.get("internalDescription") ?? ""),
        clientDescription: optional(formData, "clientDescription"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar a movimentacao.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?updated=1`);
}

export async function createLegalDeadline(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  try {
    const localDateTime = String(formData.get("dueAt") ?? "");
    await apiRequest(`/legal/cases/${caseId}/deadlines`, {
      method: "POST",
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        description: optional(formData, "description"),
        dueAt: new Date(`${localDateTime}:00-03:00`).toISOString(),
        priority: String(formData.get("priority") ?? "NORMAL"),
        assignedToUserId: String(formData.get("assignedToUserId") ?? ""),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel criar o prazo.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?deadlineCreated=1`);
}

export async function resolveLegalDeadline(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const deadlineId = String(formData.get("deadlineId") ?? "");
  try {
    await apiRequest(`/legal/cases/${caseId}/deadlines/${deadlineId}/resolve`, {
      method: "POST",
      body: JSON.stringify({
        status: String(formData.get("status") ?? "COMPLETED"),
        resolutionNote: optional(formData, "resolutionNote"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel tratar o prazo.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?deadlineResolved=1`);
}

export async function updateLegalDeadline(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const deadlineId = String(formData.get("deadlineId") ?? "");
  try {
    const localDateTime = String(formData.get("dueAt") ?? "");
    await apiRequest(`/legal/cases/${caseId}/deadlines/${deadlineId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        description: optional(formData, "description"),
        dueAt: new Date(`${localDateTime}:00-03:00`).toISOString(),
        priority: String(formData.get("priority") ?? "NORMAL"),
        assignedToUserId: String(formData.get("assignedToUserId") ?? ""),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar o prazo.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?deadlineUpdated=1`);
}

export async function scheduleHearing(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  try {
    const dateTime = String(formData.get("scheduledAt") ?? "");
    await apiRequest(`/legal/cases/${caseId}/hearings`, {
      method: "POST",
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        scheduledAt: new Date(`${dateTime}:00-03:00`).toISOString(),
        isClientVisible: formData.get("isClientVisible") === "on",
        location: optional(formData, "location"),
        notes: optional(formData, "notes"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel agendar a audiencia.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?hearingCreated=1`);
}

export async function updateHearingStatus(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const hearingId = String(formData.get("hearingId") ?? "");
  try {
    await apiRequest(`/legal/cases/${caseId}/hearings/${hearingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: String(formData.get("status") ?? "COMPLETED"),
        resolutionNote: optional(formData, "resolutionNote"),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel atualizar a audiencia.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?hearingUpdated=1`);
}

export async function uploadLegalDocument(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(
      `${path}?error=${encodeURIComponent("Selecione um arquivo para enviar.")}`,
    );
  }
  const upload = new FormData();
  upload.set("file", file);
  upload.set("visibility", String(formData.get("visibility") ?? "INTERNAL"));
  try {
    await apiRequest(`/legal/cases/${caseId}/documents`, {
      method: "POST",
      body: upload,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel enviar o documento.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?documentCreated=1`);
}

export async function deleteLegalDocument(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const documentId = String(formData.get("documentId") ?? "");
  try {
    await apiRequest(`/legal/cases/${caseId}/documents/${documentId}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel excluir o documento.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?documentDeleted=1`);
}

export async function downloadLegalDocument(formData: FormData) {
  const { caseId, path } = movementPath(formData);
  const documentId = String(formData.get("documentId") ?? "");
  let downloadUrl: string;
  try {
    const result = await apiRequest<{ url: string }>(
      `/legal/cases/${caseId}/documents/${documentId}/download-url`,
      { method: "POST" },
    );
    downloadUrl = result.url;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel baixar o documento.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  redirect(downloadUrl);
}

export async function grantPortalAccess(formData: FormData) {
  const partyId = String(formData.get("partyId") ?? "");
  try {
    await apiRequest("/portal/legal/party-links", {
      method: "POST",
      body: JSON.stringify({
        partyId,
        userId: String(formData.get("userId") ?? ""),
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel liberar o portal.";
    redirect(`/legal/people?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/legal/people");
  redirect("/legal/people?portalLinked=1");
}

export async function revokePortalAccess(formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "");
  try {
    await apiRequest(`/portal/legal/party-links/${linkId}`, {
      method: "DELETE",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel revogar o acesso.";
    redirect(`/legal/people?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/legal/people");
  redirect("/legal/people?portalRevoked=1");
}
