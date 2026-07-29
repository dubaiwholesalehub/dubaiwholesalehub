import {
  AlertTriangle,
  Boxes,
  CircleOff,
  PackageCheck,
  PackageOpen,
  Store,
  Warehouse,
  WalletCards,
} from "lucide-react";

import type { InventoryDashboardSummary } from "@/lib/inventory/inventory.repository";

import { InventorySummaryCard } from "./InventorySummaryCard";

interface InventorySummaryCardsProps {
  summary: InventoryDashboardSummary;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2,
});

export function InventorySummaryCards({
  summary,
}: InventorySummaryCardsProps) {
  const cards = [
    {
      title: "Published Products",
      value: numberFormatter.format(summary.totalProducts),
      description: "Products currently active in the catalog",
      icon: Boxes,
    },
    {
      title: "Stock on Hand",
      value: numberFormatter.format(summary.totalStockQuantity),
      description: "Total physical quantity across warehouses",
      icon: PackageCheck,
    },
    {
      title: "Available Stock",
      value: numberFormatter.format(summary.totalAvailableQuantity),
      description: "Stock currently available for sale",
      icon: PackageOpen,
    },
    {
      title: "Reserved Stock",
      value: numberFormatter.format(summary.totalReservedQuantity),
      description: "Stock reserved for pending orders",
      icon: Store,
    },
    {
      title: "Inventory Value",
      value: currencyFormatter.format(summary.inventoryValue),
      description: "Stock value based on weighted average cost",
      icon: WalletCards,
    },
    {
      title: "Low Stock",
      value: numberFormatter.format(summary.lowStockProducts),
      description: "Products with 1 to 10 units remaining",
      icon: AlertTriangle,
    },
    {
      title: "Out of Stock",
      value: numberFormatter.format(summary.outOfStockProducts),
      description: "Published products with no available stock",
      icon: CircleOff,
    },
    {
      title: "Active Warehouses",
      value: numberFormatter.format(summary.activeWarehouses),
      description: "Warehouses currently available for operations",
      icon: Warehouse,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <InventorySummaryCard
          key={card.title}
          title={card.title}
          value={card.value}
          description={card.description}
          icon={card.icon}
        />
      ))}
    </div>
  );
}