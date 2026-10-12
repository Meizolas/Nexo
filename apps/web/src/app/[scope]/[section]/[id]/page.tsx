import { notFound } from "next/navigation";
import { LegalCaseDetail } from "@/components/legal/legal-case-detail";
import { PropertyDetail } from "@/components/real-estate/property-detail";
import { ContractDetail } from "@/components/real-estate/contract-detail";
import { ChargeDetail } from "@/components/real-estate/charge-detail";

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
    activated?: string;
    canceled?: string;
    ended?: string;
    adjusted?: string;
    adjustmentCanceled?: string;
    error?: string;
  }>;
}) {
  const { scope, section, id } = await params;
  const query = await searchParams;
  if (scope === "real-estate" && section === "properties")
    return <PropertyDetail propertyId={id} notice={query} />;
  if (scope === "real-estate" && section === "contracts")
    return <ContractDetail leaseId={id} notice={query} />;
  if (scope === "real-estate" && section === "charges")
    return <ChargeDetail chargeId={id} notice={query} />;
  if (scope !== "legal" || section !== "cases") notFound();
  return <LegalCaseDetail caseId={id} notice={query} />;
}
