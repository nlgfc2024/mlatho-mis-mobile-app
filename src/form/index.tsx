import { createFormHook } from "@tanstack/react-form";

import { fieldComponents, formComponents } from "@/src/form/fields";
import { fieldContext, formContext } from "@/src/providers/form-context";

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
});
