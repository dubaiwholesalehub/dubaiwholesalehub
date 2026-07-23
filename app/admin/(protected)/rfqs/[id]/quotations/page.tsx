import { redirect } from "next/navigation";

export default async function SupplierQuotationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/admin/rfqs/${id}/quotations/new`);
}