import Link from "next/link";

import {
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getManualJournalAccounts } from "@/lib/repositories/manual-journal.repository";

import { createManualJournalAction } from "./actions";
import { ManualJournalForm } from "./ManualJournalForm";

export default async function NewManualJournalPage() {
  await requireAdmin();

  const accounts =
    await getManualJournalAccounts();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Accounts
        </Link>

        <p className="mt-6 text-sm font-medium text-amber-600">
          Finance &amp; Accounting
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Manual Journal Entry
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Post a controlled AED accounting adjustment directly
          to the General Ledger.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-amber-700" />

          <div>
            <p className="font-semibold text-amber-900">
              Posted immediately
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Manual journals are validated and posted atomically.
              Once posted they cannot be edited or deleted. Any
              correction must be made through a formal reversal.
            </p>
          </div>
        </div>
      </div>

      <ManualJournalForm
        accounts={accounts}
        action={
          createManualJournalAction
        }
      />
    </div>
  );
}