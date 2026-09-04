"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

function returnPath(
  salesReturnId: string,
) {
  return `/admin/sales/returns/${salesReturnId}`;
}

export async function approveSalesReturnAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const salesReturnId =
    String(
      formData.get(
        "salesReturnId",
      ) ?? "",
    ).trim();

  if (!salesReturnId) {
    throw new Error(
      "Sales Return ID is required.",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.rpc(
      "approve_sales_return",
      {
        p_sales_return_id:
          salesReturnId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to approve Sales Return: ${error.message}`,
    );
  }

  revalidatePath(
    "/admin/sales/returns",
  );

  revalidatePath(
    returnPath(
      salesReturnId,
    ),
  );

  redirect(
    returnPath(
      salesReturnId,
    ),
  );
}

export async function receiveSalesReturnAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const salesReturnId =
    String(
      formData.get(
        "salesReturnId",
      ) ?? "",
    ).trim();

  if (!salesReturnId) {
    throw new Error(
      "Sales Return ID is required.",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.rpc(
      "receive_sales_return_inventory",
      {
        p_sales_return_id:
          salesReturnId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to receive Sales Return: ${error.message}`,
    );
  }

  revalidatePath(
    "/admin/sales/returns",
  );

  revalidatePath(
    returnPath(
      salesReturnId,
    ),
  );

  redirect(
    returnPath(
      salesReturnId,
    ),
  );
}

export async function postSalesReturnAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const salesReturnId =
    String(
      formData.get(
        "salesReturnId",
      ) ?? "",
    ).trim();

  if (!salesReturnId) {
    throw new Error(
      "Sales Return ID is required.",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } =
    await supabase.rpc(
      "post_sales_return_gl",
      {
        p_sales_return_id:
          salesReturnId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to post Sales Return: ${error.message}`,
    );
  }

  revalidatePath(
    "/admin/sales/returns",
  );

  revalidatePath(
    returnPath(
      salesReturnId,
    ),
  );

  revalidatePath(
    "/admin/accounts/general-ledger",
  );

  redirect(
    returnPath(
      salesReturnId,
    ),
  );
}