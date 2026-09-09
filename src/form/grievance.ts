import { formOptions } from "@tanstack/react-form";

import { complaintSchema, detailsSchema, formSchema, type FormValues } from "@/src/form/schema";

const defaultValues: FormValues = {
  section: "complaint",
  complaint: {
    id: "",
    fullname: "",
    phone: "",
    email: null,
    isBeneficiary: true,
    isBulk: false,
  },
  details: {
    description: "",
    category: "",
    type: "",
    paymentWindowPeriod: "",
    paymentWindowYear: null,
    priority: "Low",
    flag: "Investigation",
    channel: "Mobile app",
    dateOfIncident: new Date(),
  },
  evidence: {
    images: [],
    videos: [],
    audios: [],
  },
};

export const grievanceFormOptions = formOptions({
  defaultValues,
  validators: {
    onSubmit: ({ value, formApi }) => {
      if (value.section === "complaint") {
        return formApi.parseValuesWithSchema(complaintSchema as typeof formSchema);
      }
      if (value.section === "details") {
        return formApi.parseValuesWithSchema(detailsSchema as typeof formSchema);
      }
      if (value.section === "evidence") {
        return formApi.parseValuesWithSchema(formSchema);
      }
      if (value.section === "confirmation") {
        return formApi.parseValuesWithSchema(formSchema);
      }
    },
  },
});
