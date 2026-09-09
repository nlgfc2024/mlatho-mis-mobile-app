import { formOptions } from "@tanstack/react-form";
import * as z from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username field is required."),
  password: z.string().trim().min(1, "Password field is required."),
});

export type FormValues = z.infer<typeof loginSchema>;

const defaultValues: FormValues = {
  // username: "Admin",
  // password: "Tasaf@2031",
  username: "",
  password: "",
};

export const loginFormOptions = formOptions({
  defaultValues,
  validators: {
    onChange: loginSchema,
  },
});
