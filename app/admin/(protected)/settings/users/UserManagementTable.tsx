"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  BadgeCheck,
  BadgeX,
  Pencil,
  Save,
  X,
} from "lucide-react";

import type {
  ManagedUser,
  UserManagementRole,
} from "@/lib/repositories/user-management.repository";

import {
  updateUserAction,
} from "./actions";

type Props = {
  users: ManagedUser[];
};

const roles: {
  value: UserManagementRole;
  label: string;
}[] = [
  {
    value: "super_admin",
    label: "Super Admin",
  },
  {
    value: "admin",
    label: "Admin",
  },
  {
    value: "manager",
    label: "Manager",
  },
  {
    value: "sales",
    label: "Sales",
  },
  {
    value: "viewer",
    label: "Viewer",
  },
];

const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export default function UserManagementTable({
  users,
}: Props) {
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const [isPending, startTransition] =
    useTransition();

  function handleSubmit(
    formData: FormData,
  ) {
    setMessage(null);

    startTransition(async () => {
      const result =
        await updateUserAction(
          formData,
        );

      if (result.success) {
        setEditingId(null);

        setMessage({
          type: "success",
          text: result.message,
        });

        return;
      }

      setMessage({
        type: "error",
        text: result.message,
      });
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm font-medium",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  User
                </th>

                <th className="px-4 py-3">
                  Designation
                </th>

                <th className="px-4 py-3">
                  ERP Role
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {users.map((user) => {
                const editing =
                  editingId === user.id;

                if (editing) {
                  return (
                    <tr
                      key={user.id}
                      className="bg-amber-50/40 align-top"
                    >
                      <td
                        colSpan={5}
                        className="p-4"
                      >
                        <form
                          action={handleSubmit}
                          className="space-y-4"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={user.id}
                          />

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <Field
                              label="Full Name"
                              required
                            >
                              <input
                                name="full_name"
                                required
                                defaultValue={
                                  user.fullName ??
                                  ""
                                }
                                className={
                                  inputClass
                                }
                              />
                            </Field>

                            <Field label="Email">
                              <input
                                value={
                                  user.email
                                }
                                disabled
                                className={`${inputClass} bg-slate-100 text-slate-500`}
                              />
                            </Field>

                            <Field label="Designation">
                              <input
                                name="designation"
                                defaultValue={
                                  user.designation ??
                                  ""
                                }
                                placeholder="Sales Executive"
                                className={
                                  inputClass
                                }
                              />
                            </Field>

                            <Field
                              label="ERP Role"
                              required
                            >
                              <select
                                name="role"
                                required
                                defaultValue={
                                  user.role
                                }
                                className={
                                  inputClass
                                }
                              >
                                {roles.map(
                                  (role) => (
                                    <option
                                      key={
                                        role.value
                                      }
                                      value={
                                        role.value
                                      }
                                    >
                                      {
                                        role.label
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </Field>

                            <Field
                              label="Status"
                              required
                            >
                              <select
                                name="is_active"
                                defaultValue={
                                  user.isActive
                                    ? "true"
                                    : "false"
                                }
                                className={
                                  inputClass
                                }
                              >
                                <option value="true">
                                  Active
                                </option>

                                <option value="false">
                                  Inactive
                                </option>
                              </select>
                            </Field>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={
                                isPending
                              }
                              onClick={() =>
                                setEditingId(
                                  null,
                                )
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              <X className="size-4" />
                              Cancel
                            </button>

                            <button
                              type="submit"
                              disabled={
                                isPending
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              <Save className="size-4" />

                              {isPending
                                ? "Saving..."
                                : "Save Changes"}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={user.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">
                        {user.fullName ||
                          "Unnamed User"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {user.email}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {user.designation ||
                        "—"}
                    </td>

                    <td className="px-4 py-4">
                      <RoleBadge
                        role={user.role}
                      />
                    </td>

                    <td className="px-4 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <BadgeCheck className="size-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <BadgeX className="size-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null);
                          setEditingId(
                            user.id,
                          );
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="size-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No ERP users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      {children}
    </label>
  );
}

function RoleBadge({
  role,
}: {
  role: UserManagementRole;
}) {
  const label =
    roles.find(
      (item) =>
        item.value === role,
    )?.label ?? role;

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {label}
    </span>
  );
}