type HouseholdAddressPathInput = {
  regionName?: string | null;
  districtName?: string | null;
  wardName?: string | null;
  villageName?: string | null;
};

export function formatHouseholdAddressPath({
  regionName,
  districtName,
  wardName,
  villageName,
}: HouseholdAddressPathInput) {
  const address = [regionName, districtName, wardName, villageName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" -> ");

  return address || null;
}
