import { Store } from "@tanstack/react-store";

import { GraphQlDistrict, GraphQlRegion, GraphQlVillage, GraphQlWard } from "../graphql/types";

interface LocationState {
  region: GraphQlRegion | null;
  district: GraphQlDistrict | null;
  ward: GraphQlWard | null;
  village: GraphQlVillage | null;
}

export const locationStore = new Store<LocationState>({
  region: null,
  district: null,
  ward: null,
  village: null,
});
