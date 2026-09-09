import type { TrainingRecord } from "@/src/powersync/schema";

export type TrainingStatus = string;

export type TrainingReference = {
  id: string;
  name: string;
};

export type Training = {
  id: string;
  title: string;
  description: string;
  venue: string;
  code: string;
  status: TrainingStatus;
  paaReference: string;
  category: TrainingReference;
  level: TrainingReference;
  location: TrainingReference;
  startDatetime: string | null;
  endDatetime: string | null;
  dateCreated: string | null;
};

export type TrainingFilters = {
  status: string | null;
  location: string | null;
  category: string | null;
  level: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export const emptyTrainingFilters: TrainingFilters = {
  status: null,
  location: null,
  category: null,
  level: null,
  dateFrom: null,
  dateTo: null,
};

function text(value: string | null | undefined) {
  return value?.trim() ?? "";
}

/** Convert a persisted PowerSync row into the nested shape returned by GraphQL. */
export function toTraining(record: TrainingRecord): Training {
  return {
    id: record.id,
    title: text(record.title),
    description: text(record.description),
    venue: text(record.venue),
    code: text(record.code),
    status: text(record.status)
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
    paaReference: text(record.paaReference),
    category: { id: text(record.categoryId), name: text(record.categoryName) },
    level: { id: text(record.levelId), name: text(record.levelName) },
    location: { id: text(record.locationId), name: text(record.locationName) },
    startDatetime: record.startDatetime ?? null,
    endDatetime: record.endDatetime ?? null,
    dateCreated: record.dateCreated ?? null,
  };
}

export function formatTrainingStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getUpcomingTrainings(source: Training[], limit?: number): Training[] {
  const upcoming = source
    .filter((training) => training.status === "planned" || training.status === "approved")
    .sort((a, b) => (a.startDatetime ?? "").localeCompare(b.startDatetime ?? ""));

  return typeof limit === "number" ? upcoming.slice(0, limit) : upcoming;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function getTrainingFilterOptions(source: Training[]) {
  return {
    status: uniqueSorted(source.map((training) => training.status)),
    location: uniqueSorted(source.map((training) => training.location.name)),
    category: uniqueSorted(source.map((training) => training.category.name)),
    level: uniqueSorted(source.map((training) => training.level.name)),
  };
}

export function countActiveFilters(filters: TrainingFilters): number {
  return Object.values(filters).filter((value) => value !== null).length;
}

export function filterTrainings(
  source: Training[],
  filters: TrainingFilters,
  query = "",
): Training[] {
  const normalizedQuery = query.trim().toLowerCase();

  return source.filter((training) => {
    if (filters.status && training.status !== filters.status) return false;
    if (filters.location && training.location.name !== filters.location) return false;
    if (filters.category && training.category.name !== filters.category) return false;
    if (filters.level && training.level.name !== filters.level) return false;
    if (
      filters.dateFrom &&
      (!training.startDatetime || training.startDatetime < filters.dateFrom)
    ) {
      return false;
    }
    if (filters.dateTo && (!training.startDatetime || training.startDatetime > filters.dateTo)) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = [
        training.title,
        training.description,
        training.venue,
        training.code,
        training.paaReference,
        training.category.name,
        training.level.name,
        training.location.name,
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

// Retained for the standalone facilitator sheet while older routes transition
// away from facilitator data. The training endpoint does not supply this type.
export type Facilitator = {
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
};
