import { notFound } from "next/navigation";

import { InventoryTransactionAuditCard } from "@/components/admin/inventory/InventoryTransactionAuditCard";
import { InventoryTransactionHeader } from "@/components/admin/inventory/InventoryTransactionHeader";
import { InventoryTransactionInformation } from "@/components/admin/inventory/InventoryTransactionInformation";
import { InventoryTransactionItemsTable } from "@/components/admin/inventory/InventoryTransactionItemsTable";
import { InventoryTransactionSummary } from "@/components/admin/inventory/InventoryTransactionSummary";

import { getInventoryTransactionDetails } from "@/lib/inventory/inventory-transaction.repository";

interface InventoryTransactionDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InventoryTransactionDetailsPage({
  params,
}: InventoryTransactionDetailsPageProps) {
  const { id } = await params;

  const details =
    await getInventoryTransactionDetails(id);

  if (!details) {
    notFound();
  }

  return (
    <div className="print-page space-y-6">
      <InventoryTransactionHeader
        transaction={details.transaction}
      />

      <InventoryTransactionInformation
        transaction={details.transaction}
      />

      <InventoryTransactionItemsTable
        items={details.items}
      />

      <InventoryTransactionSummary
        transaction={details.transaction}
      />

      <InventoryTransactionAuditCard
        transaction={details.transaction}
      />
    </div>
  );
}