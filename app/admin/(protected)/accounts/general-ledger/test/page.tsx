import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  runGlValidationSuiteAction,
  type GlValidationSuiteResult,
} from "./actions";


interface GlValidationPageProps {
  searchParams: Promise<{
    run?: string;
  }>;
}


function dateTimeLabel(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-AE",
    {
      dateStyle:
        "medium",

      timeStyle:
        "medium",
    },
  ).format(
    new Date(
      value,
    ),
  );
}


export default async function GlValidationPage({
  searchParams,
}: GlValidationPageProps) {
  await requireAdmin();

  const params =
    await searchParams;

  let suite:
    GlValidationSuiteResult | null =
      null;

  let executionError:
    string | null =
      null;


  /*
   * The validation suite only runs when explicitly requested.
   * Simply opening this page never creates GL transactions.
   */
  if (
    params.run ===
    "1"
  ) {
    try {
      suite =
        await runGlValidationSuiteAction();
    } catch (error) {
      executionError =
        error instanceof Error
          ? error.message
          : "The GL validation suite could not be completed.";
    }
  }


  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />

          Accounts
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <FlaskConical className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
              Accounting Engine Validation
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              General Ledger Test Suite
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Validate balanced posting, accounting controls,
              ERP idempotency, closed-period protection,
              immutability and formal journal reversal using
              your authenticated administrator session.
            </p>
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <div>
            <h2 className="font-semibold text-amber-950">
              Controlled accounting test
            </h2>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              The suite creates small AED 1.00 validation
              journals. Successful validation journals are
              formally reversed so the net accounting impact
              remains zero. The suite also temporarily closes
              one prior accounting period and restores its
              original status afterward.
            </p>
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Run complete validation
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Run all GL engine safeguards through the same
              authenticated Supabase session used by the ERP.
            </p>
          </div>

          <Link
            href="/admin/accounts/general-ledger/test?run=1"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            <FlaskConical className="h-4 w-4" />

            Run Complete GL Validation
          </Link>
        </div>
      </div>


      {executionError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />

            <div>
              <h2 className="font-bold text-red-950">
                Validation could not run
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                {executionError}
              </p>
            </div>
          </div>
        </div>
      )}


      {suite && (
        <>
          <div
            className={`rounded-2xl border p-6 ${
              suite.success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                {suite.success ? (
                  <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-red-600" />
                )}

                <div>
                  <h2
                    className={`text-xl font-bold ${
                      suite.success
                        ? "text-green-950"
                        : "text-red-950"
                    }`}
                  >
                    {suite.success
                      ? "General Ledger engine passed"
                      : "General Ledger engine requires attention"}
                  </h2>

                  <p
                    className={`mt-1 text-sm ${
                      suite.success
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    Completed{" "}
                    {dateTimeLabel(
                      suite.completedAt,
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="rounded-xl border border-green-200 bg-white px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {suite.passed}
                  </div>

                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Passed
                  </div>
                </div>

                <div className="rounded-xl border border-red-200 bg-white px-5 py-3 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {suite.failed}
                  </div>

                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Failed
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="font-bold text-slate-950">
                Validation results
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Each test is independently reported below.
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {suite.results.map(
                (
                  result,
                  index,
                ) => (
                  <div
                    key={result.key}
                    className="p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          result.status ===
                          "passed"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.status ===
                        "passed" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Test{" "}
                            {index +
                              1}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                              result.status ===
                              "passed"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>

                        <h3 className="mt-2 font-bold text-slate-950">
                          {result.title}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {result.message}
                        </p>

                        {result.details && (
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-200">
                            {result.details}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </>
      )}


      {!suite &&
        !executionError && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <FlaskConical className="mx-auto h-10 w-10 text-slate-400" />

            <h2 className="mt-4 font-bold text-slate-950">
              Ready for validation
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              No GL tests run automatically. Click the button
              above when you are ready to validate the
              accounting engine.
            </p>
          </div>
        )}
    </div>
  );
}