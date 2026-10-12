import { notFound } from "next/navigation";
import { LegalCaseDetail } from "@/components/legal/legal-case-detail";

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ scope: string; section: string; id: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    published?: string;
    unpublished?: string;
    deadlineCreated?: string;
    deadlineResolved?: string;
    deadlineUpdated?: string;
    hearingCreated?: string;
    hearingUpdated?: string;
    documentCreated?: string;
    documentDeleted?: string;
    error?: string;
  }>;
}) {
  const { scope, section, id } = await params;
  if (scope !== "legal" || section !== "cases") notFound();
  const query = await searchParams;
  return <LegalCaseDetail caseId={id} notice={query} />;
}
