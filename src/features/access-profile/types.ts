export type AccessRole = {
  id: string;
  uuid: string;
  name?: string | null;
  isSystem: number;
  isBlocked: boolean;
  rights?: {
    edges?:
      | ({
          node?: {
            rightId?: number | null;
          } | null;
        } | null)[]
      | null;
  } | null;
};

export type AccessDistrict = {
  uuid?: string | null;
  code?: string | null;
  name?: string | null;
  parent?: {
    uuid?: string | null;
    code?: string | null;
    name?: string | null;
  } | null;
};

export type AccessModulePermission = {
  moduleName?: string | null;
  permissions?:
    | {
        permsName?: string | null;
        permsValue?: number | null;
      }[]
    | null;
};

export type AccessProfile = {
  user?: {
    username: string;
    otherNames?: string | null;
    lastName?: string | null;
    iUser?: {
      roleId?: number | null;
      healthFacilityId?: number | null;
      roles?: (AccessRole | null)[] | null;
    } | null;
  } | null;
  userDistricts?: (AccessDistrict | null)[] | null;
  myModulesPermissions?: {
    modulePermsList?: (AccessModulePermission | null)[] | null;
  } | null;
};
