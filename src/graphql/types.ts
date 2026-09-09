export interface PageInfo {
  startCursor: string;
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GraphQlRegion {
  id: string;
  uuid: string;
  name: string;
  code: string;
  type?: string;
  children?: GraphQlConnection<GraphQlDistrict>;
}

export interface GraphQlDistrict {
  id: string;
  uuid: string;
  name: string;
  code: string;
  type?: string;
  children?: GraphQlConnection<GraphQlWard>;
}

export interface GraphQlWard {
  id: string;
  uuid: string;
  name: string;
  code: string;
  type?: string;
  children?: GraphQlConnection<GraphQlVillage>;
}

export interface GraphQlVillage {
  id: string;
  uuid: string;
  name: string;
  code: string;
  type?: string;
}

export interface GraphQlConnection<T> {
  edges: { node: T }[];
}
