export type GrievanceEvidenceAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type GrievanceEvidence = {
  images: GrievanceEvidenceAsset[];
  videos: GrievanceEvidenceAsset[];
  audios: GrievanceEvidenceAsset[];
};

export const emptyGrievanceEvidence: GrievanceEvidence = {
  images: [],
  videos: [],
  audios: [],
};

export function normalizeGrievanceEvidenceAsset(asset: unknown): GrievanceEvidenceAsset | null {
  if (typeof asset === "string") {
    return asset.trim() ? { uri: asset } : null;
  }

  if (!asset || typeof asset !== "object") {
    return null;
  }

  const value = asset as Record<string, unknown>;
  const uri = typeof value.uri === "string" ? value.uri : null;

  if (!uri) {
    return null;
  }

  return {
    uri,
    fileName: typeof value.fileName === "string" ? value.fileName : null,
    mimeType: typeof value.mimeType === "string" ? value.mimeType : null,
    width: typeof value.width === "number" ? value.width : null,
    height: typeof value.height === "number" ? value.height : null,
    duration: typeof value.duration === "number" ? value.duration : null,
  };
}

export function normalizeGrievanceEvidence(evidence: unknown): GrievanceEvidence {
  if (!evidence || typeof evidence !== "object") {
    return emptyGrievanceEvidence;
  }

  const value = evidence as Partial<Record<keyof GrievanceEvidence, unknown>>;

  return {
    images: normalizeEvidenceList(value.images),
    videos: normalizeEvidenceList(value.videos),
    audios: normalizeEvidenceList(value.audios),
  };
}

export function normalizeEvidenceList(value: unknown): GrievanceEvidenceAsset[] {
  if (typeof value === "string") {
    try {
      return normalizeEvidenceList(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((asset) => normalizeGrievanceEvidenceAsset(asset))
    .filter((asset): asset is GrievanceEvidenceAsset => Boolean(asset));
}

export function getGrievanceEvidenceCount(evidence: GrievanceEvidence) {
  return evidence.images.length + evidence.videos.length + evidence.audios.length;
}
