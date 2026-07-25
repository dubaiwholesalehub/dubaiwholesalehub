import { redirect } from "next/navigation";

import { getLatestQuotationForRfq } from "@/lib/repositories/rfq";

export default async function SupplierQuotationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const quotation =
    await getLatestQuotationForRfq(id);

  if (!quotation) {
    redirect(
      `/admin/rfqs/${id}/quotations/new`,
    );
  }

  redirect(
    `/admin/rfqs/${id}/quotations/${quotation.id}`,
  );
}