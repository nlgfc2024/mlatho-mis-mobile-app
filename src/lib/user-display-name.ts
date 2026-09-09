type UserDisplayNameFields = {
  otherNames?: string | null;
  lastName?: string | null;
  fallback?: string | null;
};

function cleanNamePart(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

export function getUserDisplayName({ otherNames, lastName, fallback }: UserDisplayNameFields) {
  const fullName = [cleanNamePart(otherNames), cleanNamePart(lastName)].filter(Boolean).join(" ");
  return fullName || cleanNamePart(fallback);
}
