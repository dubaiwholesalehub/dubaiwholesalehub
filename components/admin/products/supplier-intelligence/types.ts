export type SupplierFormMode = "create" | "edit";

export type SupplierActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};