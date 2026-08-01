"use client";

import { FieldValues, Path, UseFormRegister, FieldErrors } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

interface FormTextFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;

  description?: string;
  placeholder?: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
}

export default function FormTextField<T extends FieldValues>({
  name,
  label,
  register,
  errors,
  description,
  placeholder,
  required,
  type = "text",
}: FormTextFieldProps<T>) {
  const error = errors[name];

  return (
    <Field>
      <FieldLabel>
        {label}
        {required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </FieldLabel>

      <FieldContent>
        <Input
          type={type}
          placeholder={placeholder}
          {...register(name)}
        />

        {description && (
          <FieldDescription>
            {description}
          </FieldDescription>
        )}

        <FieldError
          errors={
            error
              ? [
                  {
                    message:
                      error.message?.toString(),
                  },
                ]
              : []
          }
        />
      </FieldContent>
    </Field>
  );
}