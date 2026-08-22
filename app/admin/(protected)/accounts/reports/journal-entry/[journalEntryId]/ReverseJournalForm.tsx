"use client";

import {
  useState,
} from "react";

import {
  AlertTriangle,
} from "lucide-react";


export function ReverseJournalForm({
  journalEntryId,
  postingDate,
  action,
}: {
  journalEntryId: string;
  postingDate: string;
  action: (
    journalEntryId: string,
    formData: FormData,
  ) => void | Promise<void>;
}) {
  const [
    confirmed,
    setConfirmed,
  ] = useState(
    false,
  );

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-red-700" />

        <div className="flex-1">
          <p className="font-semibold text-red-900">
            Reverse Posted Journal
          </p>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-red-800">
            Posted journals cannot be edited or deleted.
            Reversal creates a new posted journal containing
            the exact opposite debit and credit entries while
            preserving the original journal permanently.
          </p>

          {!confirmed ? (
            <button
              type="button"
              onClick={() =>
                setConfirmed(
                  true,
                )
              }
              className="mt-4 inline-flex h-10 items-center rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Reverse Journal
            </button>
          ) : (
            <form
              action={action.bind(
                null,
                journalEntryId,
              )}
              className="mt-5 space-y-4 rounded-xl border border-red-200 bg-white p-4"
            >
              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Reversal Date
                </span>

                <input
                  type="date"
                  name="reversalDate"
                  required
                  defaultValue={
                    postingDate
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Reversal Reason
                </span>

                <textarea
                  name="reason"
                  required
                  minLength={3}
                  rows={3}
                  placeholder="Explain why this journal is being reversed."
                  className="w-full rounded-lg border bg-background px-3 py-3 text-sm"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmed(
                      false,
                    )
                  }
                  className="inline-flex h-10 items-center rounded-lg border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}