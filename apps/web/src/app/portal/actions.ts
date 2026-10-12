"use server";

import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api";

export async function downloadPortalDocument(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const result = await apiRequest<{ url: string }>(
    `/portal/legal/documents/${documentId}/download-url`,
    { method: "POST" },
  );
  redirect(result.url);
}

export async function uploadPortalDocument(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  const file = formData.get("file");
  if (!caseId || !(file instanceof File) || file.size === 0) {
    redirect("/portal/legal?uploadError=1");
  }

  const body = new FormData();
  body.append("file", file, file.name);
  try {
    await apiRequest(`/portal/legal/cases/${caseId}/documents`, {
      method: "POST",
      body,
    });
  } catch {
    redirect("/portal/legal?uploadError=1");
  }

  redirect("/portal/legal?uploaded=1");
}

export async function requestLegalService(formData: FormData) {
  const caseId = String(formData.get("caseId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!caseId || subject.length < 3 || message.length < 10) {
    redirect("/portal/legal?requestError=1");
  }

  try {
    await apiRequest(`/portal/legal/cases/${caseId}/service-requests`, {
      method: "POST",
      body: JSON.stringify({ subject, message }),
    });
  } catch {
    redirect("/portal/legal?requestError=1");
  }

  redirect("/portal/legal?requestSent=1");
}
