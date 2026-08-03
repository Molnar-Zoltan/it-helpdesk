"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useUpdateName } from "@/lib/mutations/use-update-name";
import {
  updateNameSchema,
  type UpdateNameFormValues,
} from "@/lib/validation/account-schemas";
import type { UserProfile } from "@/lib/api/types";

interface NameTabProps {
  profile: UserProfile;
}

// No currentPassword required and no other-session revocation — name isn't
// security-sensitive, per the backend's PATCH /users/me design (see
// docs/architecture.md's account self-service table).
export function NameTab({ profile }: NameTabProps) {
  const updateNameMutation = useUpdateName();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateNameMutation.mutateAsync(values);
      // Resets the dirty flag against the just-saved values, rather than
      // waiting on the invalidated profile query to refetch and re-key the
      // form's defaultValues.
      reset({ firstName: updated.firstName, lastName: updated.lastName });
      toast.success("Name updated");
    } catch {
      // Surfaced below via updateNameMutation.error.
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Name</h2>
        <p className="mt-1 text-sm text-text-secondary">
          The name shown on your tickets and in the header menu.
        </p>
      </div>

      <FormField label="First name" error={errors.firstName?.message}>
        {(field) => (
          <Input
            {...field}
            autoComplete="given-name"
            hasError={Boolean(errors.firstName)}
            {...register("firstName")}
          />
        )}
      </FormField>

      <FormField label="Last name" error={errors.lastName?.message}>
        {(field) => (
          <Input
            {...field}
            autoComplete="family-name"
            hasError={Boolean(errors.lastName)}
            {...register("lastName")}
          />
        )}
      </FormField>

      {updateNameMutation.isError && (
        <Alert tone="danger">{updateNameMutation.error.message}</Alert>
      )}

      <Button
        type="submit"
        disabled={!isDirty}
        isLoading={updateNameMutation.isPending}
        className="self-start"
      >
        Save changes
      </Button>
    </form>
  );
}
