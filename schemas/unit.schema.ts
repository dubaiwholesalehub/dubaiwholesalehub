import { z } from "zod";

export const unitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "Unit name must contain at least 2 characters.",
    )
    .max(
      100,
      "Unit name cannot exceed 100 characters.",
    ),

  shortName: z
    .string()
    .trim()
    .min(
      1,
      "Short name is required.",
    )
    .max(
      20,
      "Short name cannot exceed 20 characters.",
    )
    .transform((value) =>
      value.toUpperCase(),
    ),
});

export type UnitValidatedValues =
  z.infer<typeof unitSchema>;