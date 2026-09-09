import type { HouseholdRecord } from "@/src/powersync/schema";
import { Store } from "@tanstack/react-store";

interface GrievanceState {
  categoryId: string | null;
  category: string | null;
  typeId: string | null;
  type: string | null;
  channelId: string | null;
  channel: string | null;
  complainantId: string | null;
  complainant: HouseholdRecord | null;
  paymentWindowPeriod: string | null;
  paymentWindowYear: number | null;
}

const createInitialGrievanceState = (): GrievanceState => ({
  categoryId: null,
  category: null,
  typeId: null,
  type: null,
  channelId: null,
  channel: null,
  complainantId: null,
  complainant: null,
  paymentWindowPeriod: "",
  paymentWindowYear: null,
});

export const grievanceStore = new Store<GrievanceState>(createInitialGrievanceState());

export const resetGrievanceStore = () => {
  grievanceStore.setState(() => createInitialGrievanceState());
};

export const isPaymentRelatedCategory = (category: string | null | undefined) => {
  return category?.trim().toLocaleLowerCase().startsWith("malipo") ?? false;
};
