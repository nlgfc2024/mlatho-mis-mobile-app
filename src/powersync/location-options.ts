import type {
  GraphQlDistrict,
  GraphQlRegion,
  GraphQlVillage,
  GraphQlWard,
} from "@/src/graphql/types";

type LocationRow = {
  id: string;
  uuid?: string | null;
  name?: string | null;
  code?: string | null;
};

function requiredText(value: string | null | undefined) {
  return value ?? "";
}

export function toGraphQlRegion(row: LocationRow): GraphQlRegion {
  return {
    id: row.id,
    uuid: requiredText(row.uuid),
    name: requiredText(row.name),
    code: requiredText(row.code),
    type: "R",
  };
}

export function toGraphQlDistrict(row: LocationRow): GraphQlDistrict {
  return {
    id: row.id,
    uuid: requiredText(row.uuid),
    name: requiredText(row.name),
    code: requiredText(row.code),
    type: "D",
  };
}

export function toGraphQlWard(row: LocationRow): GraphQlWard {
  return {
    id: row.id,
    uuid: requiredText(row.uuid),
    name: requiredText(row.name),
    code: requiredText(row.code),
    type: "W",
  };
}

export function toGraphQlVillage(row: LocationRow): GraphQlVillage {
  return {
    id: row.id,
    uuid: requiredText(row.uuid),
    name: requiredText(row.name),
    code: requiredText(row.code),
    type: "V",
  };
}
