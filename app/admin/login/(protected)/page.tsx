import Link from "next/link";
import { Building2, LockKeyhole, Mail } from "lucide-react";

import { login } from "../actions";

interface AdminLoginPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen bg-slate-100">
      <section className="hidden flex-1 bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
            <Building2 className="h-6 w-6" />
          </span>

          <span>
            <span className="block text-xl font-bold">
              DubaiWholesaleHub
            </span>

            <span className="text-xs uppercase tracking-[0.2em] text-amber-400">
              Sanwan Alshams Trading LLC
            </span>
          </span>
        </Link>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
            Business Management Platform
          </p>

          <h1 className="mt-5 text-5xl font-bold leading-tight">
            Manage your wholesale catalog, suppliers and inquiries.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Secure access for authorized SANWAN ALSHAMS TRADING LLC
            employees.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} SANWAN ALSHAMS TRADING LLC
        </p>
      </section>

      <section className="flex w-full items-center justify-center p-6 lg:max-w-xl">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl sm:p-10">
          <div className="lg:hidden">
            <Link
              href="/"
              className="text-xl font-bold text-slate-900"
            >
              DubaiWholesaleHub
            </Link>
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
              Admin Portal
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-3 text-slate-600">
              Sign in with your authorized business account.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form action={login} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@example.com"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative mt-2">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950"
            >
              Sign in to dashboard
            </button>
          </form>

          <Link
            href="/"
            className="mt-6 block text-center text-sm font-medium text-slate-500 transition hover:text-amber-600"
          >
            Return to public website
          </Link>
        </div>
      </section>
    </main>
  );
}