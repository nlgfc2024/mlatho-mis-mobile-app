import { useFieldContext } from "@/src/providers/form-context";

import SwitchRow from "./switch-row";

const SwitchField = ({ label }: { label: string }) => {
  const field = useFieldContext<boolean>();

  return (
    <SwitchRow
      label={label}
      value={field.state.value}
      onValueChange={(value) => field.handleChange(value)}
    />
  );
};

export default SwitchField;
