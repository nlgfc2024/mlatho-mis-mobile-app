export function grievanceStatusDotClassName(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();

  switch (normalized) {
    case "pending":
    case "closed":
      return "bg-gray-600 dark:bg-gray-300";
    case "synchronized":
    case "received":
      return "bg-blue-700 dark:bg-blue-400";
    case "open":
    case "opened":
      return "bg-yellow-600 dark:bg-yellow-300";
    case "in progress":
    case "in_progress":
      return "bg-orange-600 dark:bg-orange-400";
    case "resolved":
      return "bg-green-700 dark:bg-green-400";
    default:
      return "bg-gray-950 dark:bg-gray-50";
  }
}

export function grievanceStatusTextClassName(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();

  switch (normalized) {
    case "pending":
    case "closed":
      return "text-gray-600 dark:text-gray-300";
    case "synchronized":
    case "received":
      return "text-blue-700 dark:text-blue-400";
    case "open":
    case "opened":
      return "text-yellow-600 dark:text-yellow-300";
    case "in progress":
    case "in_progress":
      return "text-orange-600 dark:text-orange-400";
    case "resolved":
      return "text-green-700 dark:text-green-400";
    default:
      return "text-gray-950 dark:text-gray-50";
  }
}
