"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import {
  createManualJournal,
  type ManualJournalLineInput,
} from "@/lib/repositories/manual-journal.repository";

type RawLine = {
  glAccountId?: unknown;
  description?: unknown;
  debit?: unknown;
  credit?: unknown;
};

function parseAmount(
  value: unknown,
): number {
  const parsed = Number(
    value ?? 0,
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export async function createManualJournalAction(
  formData: FormData,
) {
  await requireAdmin();

  const journalDate =
    String(
      formData.get("journalDate") ?? "",
    ).trim();

  const postingDate =
    String(
      formData.get("postingDate") ?? "",
    ).trim();

  const reference =
    String(
      formData.get("reference") ?? "",
    ).trim();

  const description =
    String(
      formData.get("description") ?? "",
    ).trim();

  const rawLines =
    String(
      formData.get("lines") ?? "[]",
    );

  if (!journalDate) {
    throw new Error(
      "Journal date is required.",
    );
  }

  if (!postingDate) {
    throw new Error(
      "Posting date is required.",
    );
  }

  if (
    description.length < 3
  ) {
    throw new Error(
      "A meaningful journal description is required.",
    );
  }

  let parsedLines: RawLine[];

  try {
    const parsed =
      JSON.parse(
        rawLines,
      );

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      throw new Error(
        "Invalid journal lines.",
      );
    }

    parsedLines =
      parsed as RawLine[];
  } catch {
    throw new Error(
      "Unable to read journal lines.",
    );
  }

  if (
    parsedLines.length < 2
  ) {
    throw new Error(
      "A manual journal requires at least two lines.",
    );
  }

  const lines: ManualJournalLineInput[] =
    parsedLines.map(
      (line, index) => {
        const glAccountId =
          String(
            line.glAccountId ?? "",
          ).trim();

        const lineDescription =
          String(
            line.description ?? "",
          ).trim();

        const debit =
          parseAmount(
            line.debit,
          );

        const credit =
          parseAmount(
            line.credit,
          );

        if (!glAccountId) {
          throw new Error(
            `Line ${index + 1}: GL account is required.`,
          );
        }

        if (
          debit < 0 ||
          credit < 0
        ) {
          throw new Error(
            `Line ${index + 1}: Debit and credit cannot be negative.`,
          );
        }

        const debitUsed =
          debit > 0;

        const creditUsed =
          credit > 0;

        if (
          debitUsed ===
          creditUsed
        ) {
          throw new Error(
            `Line ${index + 1}: Enter either a debit or a credit amount, but not both.`,
          );
        }

        return {
          glAccountId,
          description:
            lineDescription ||
            null,
          debit,
          credit,
        };
      },
    );

  const totalDebit =
    lines.reduce(
      (total, line) =>
        total +
        line.debit,
      0,
    );

  const totalCredit =
    lines.reduce(
      (total, line) =>
        total +
        line.credit,
      0,
    );

  if (
    totalDebit <= 0 ||
    totalCredit <= 0
  ) {
    throw new Error(
      "The journal must contain both debit and credit amounts.",
    );
  }

  if (
    Math.abs(
      totalDebit -
      totalCredit,
    ) >
    0.005
  ) {
    throw new Error(
      `Journal is not balanced. Debit ${totalDebit.toFixed(
        2,
      )}, Credit ${totalCredit.toFixed(
        2,
      )}.`,
    );
  }

  const journalEntryId =
    await createManualJournal({
      journalDate,
      postingDate,
      description,
      reference:
        reference ||
        null,
      currencyCode:
        "AED",
      exchangeRate:
        1,
      lines,
    });

  redirect(
    `/admin/accounts/reports/journal-entry/${journalEntryId}`,
  );
}