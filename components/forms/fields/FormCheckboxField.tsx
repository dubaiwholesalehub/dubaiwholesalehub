"use client";

import {
  Control,
  FieldValues,
  Path,
  Controller,
} from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

interface FormCheckboxFieldProps<
  T extends FieldValues,
> {
  name: Path<T>;

  label: string;

  control: Control<T>;

  description?: string;
}

export default function FormCheckboxField<
  T extends FieldValues,
>({
  name,
  label,
  control,
  description,
}: FormCheckboxFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field,
        fieldState,
      }) => (
        <Field orientation="horizontal">
          <Checkbox
            checked={!!field.value}
            onCheckedChange={
              field.onChange
            }
          />

          <FieldContent>
            <FieldLabel>
              {label}
            </FieldLabel>

            {description && (
              <FieldDescription>
                {description}
              </FieldDescription>
            )}

            <FieldError
              errors={
                fieldState.error
                  ? [
                      {
                        message:
                          fieldState.error
                            .message,
                      },
                    ]
                  : []
              }
            />
          </FieldContent>
        </Field>
      )}
    />
  );
}