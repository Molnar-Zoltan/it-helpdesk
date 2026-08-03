import { z } from "zod";
import { nameField } from "./auth-schemas";

export const updateNameSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
});
export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;
