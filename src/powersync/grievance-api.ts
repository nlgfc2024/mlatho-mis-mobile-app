import type {
  CreateGrievanceTicketResponse,
  CreateGrievanceTicketVariables,
  GrievanceAttachmentFile,
  GrievanceAttachmentUploadResult,
  GrievanceBackendComment,
  GrievanceBackendTicket,
} from "./grievance-sync";
import { File } from "expo-file-system";
import { gql } from "graphql-request";

import { graphqlClient } from "@/src/lib/graphql-client";
import { SECURE_STORAGE_KEYS, secureStorage } from "@/src/lib/secure-storage";
import { env } from "@/src/utils/env";

import { GrievanceSyncValidationError, rawUuidFromValue, relayNodeValue } from "./grievance-sync";

export type GrievanceTicketComment = {
  id: string;
  comment: string;
  commenter?: unknown;
  isResolution?: boolean | null;
  commenterTypeName?: string | null;
  commenterFirstName?: string | null;
  commenterLastName?: string | null;
  dateCreated?: string | null;
  dateUpdated?: string | null;
};

export type GrievanceTicket = {
  id: string;
  category?: string | null;
  clientMutationId?: string | null;
  isHistory?: boolean | null;
  status?: string | null;
  resolution?: string | null;
  dateUpdated?: string | null;
  commentSet?: {
    edges?: { node?: GrievanceTicketComment | null }[] | null;
  } | null;
};

type GetTicketsResponse = {
  tickets?: {
    edges?: { node?: GrievanceTicket | null }[] | null;
  } | null;
};

type GetTicketsVariables = {
  id: string;
};

export const GET_TICKETS = gql`
  query GetTickets($id: ID!) {
    tickets(id: $id, first: 1) {
      edges {
        node {
          id
          category
          clientMutationId
          isHistory
          status
          resolution
          dateUpdated
          commentSet(first: 100) {
            edges {
              node {
                id
                comment
                commenter
                isResolution
                commenterTypeName
                commenterFirstName
                commenterLastName
                dateCreated
                dateUpdated
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_GRIEVANCE_TICKET = gql`
  mutation CreateGrievance(
    $clientMutationId: String
    $clientMutationLabel: String
    $category: String!
    $title: String
    $attendingStaffId: UUID
    $description: String
    $priority: String
    $dateOfIncident: Date
    $channel: String
    $flags: String
    $consentGiven: Boolean
    $regionId: Int
    $districtId: Int
    $wardId: Int
    $villageId: Int
    $eventLocationId: Int
  ) {
    createTicket(
      input: {
        clientMutationId: $clientMutationId
        clientMutationLabel: $clientMutationLabel
        category: $category
        title: $title
        attendingStaffId: $attendingStaffId
        description: $description
        priority: $priority
        dateOfIncident: $dateOfIncident
        channel: $channel
        flags: $flags
        consentGiven: $consentGiven
        regionId: $regionId
        districtId: $districtId
        wardId: $wardId
        villageId: $villageId
        eventLocationId: $eventLocationId
      }
    ) {
      clientMutationId
      internalId
    }
  }
`;

const VERIFY_GRIEVANCE_TICKET = gql`
  query VerifyGrievanceTicket($clientMutationId: String) {
    mutationLogs(clientMutationId: $clientMutationId, first: 1) {
      edges {
        node {
          status
          error
        }
      }
    }
    tickets(clientMutationId: $clientMutationId, first: 1) {
      edges {
        node {
          id
          clientMutationId
        }
      }
    }
  }
`;

const GET_GRIEVANCE_BACKEND_UPDATE = gql`
  query GetGrievanceBackendUpdate($id: ID, $clientMutationId: String) {
    tickets(id: $id, clientMutationId: $clientMutationId, showHistory: false, first: 1) {
      edges {
        node {
          id
          clientMutationId
          status
          resolution
          dateUpdated
          commentSet(first: 100) {
            edges {
              node {
                id
                comment
                commenter
                isResolution
                commenterTypeName
                commenterFirstName
                commenterLastName
                dateCreated
                dateUpdated
              }
            }
          }
        }
      }
    }
  }
`;

type VerifyGrievanceTicketResponse = {
  mutationLogs?: {
    edges?: { node?: { status?: number | null; error?: string | null } | null }[] | null;
  } | null;
  tickets?: {
    edges?:
      | {
          node?: { id?: string | null; clientMutationId?: string | null } | null;
        }[]
      | null;
  } | null;
};

type GrievanceBackendUpdateResponse = {
  tickets?: {
    edges?:
      | {
          node?:
            | (Omit<GrievanceBackendTicket, "comments"> & {
                commentSet?: {
                  edges?: { node?: Partial<GrievanceBackendComment> | null }[] | null;
                } | null;
              })
            | null;
        }[]
      | null;
  } | null;
};

class GrievanceSyncTimeoutError extends Error {
  status = 503;

  constructor() {
    super("Timed out waiting for the synchronized grievance to appear on the server.");
    this.name = "GrievanceSyncTimeoutError";
  }
}

function serverMutationErrorMessage(value: string | null | undefined) {
  if (!value) return "The server rejected the grievance.";

  try {
    const parsed = JSON.parse(value) as { message?: string; detail?: string | string[] };
    const detail = Array.isArray(parsed.detail) ? parsed.detail.join(" ") : parsed.detail;
    return [parsed.message, detail].filter(Boolean).join(": ") || value;
  } catch {
    return value;
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function createGrievanceTicket(variables: CreateGrievanceTicketVariables) {
  const accepted = await graphqlClient.request<CreateGrievanceTicketResponse>(
    CREATE_GRIEVANCE_TICKET,
    variables,
  );

  if (!accepted.createTicket?.internalId) return accepted;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const verification = await graphqlClient.request<VerifyGrievanceTicketResponse>(
      VERIFY_GRIEVANCE_TICKET,
      { clientMutationId: variables.clientMutationId },
    );
    const mutation = verification.mutationLogs?.edges?.[0]?.node;

    if (mutation?.status === 1) {
      throw new GrievanceSyncValidationError(serverMutationErrorMessage(mutation.error));
    }

    const ticket = verification.tickets?.edges?.[0]?.node;
    if (mutation?.status === 2 && ticket?.id) {
      return {
        createTicket: {
          internalId: ticket.id,
          clientMutationId: ticket.clientMutationId ?? variables.clientMutationId,
        },
      };
    }

    await wait(500);
  }

  throw new GrievanceSyncTimeoutError();
}

export async function fetchGrievanceBackendTicket(locator: {
  internalId: string | null;
  clientMutationId: string | null;
}): Promise<GrievanceBackendTicket | null> {
  if (!locator.internalId && !locator.clientMutationId) return null;

  const response = await graphqlClient.request<GrievanceBackendUpdateResponse>(
    GET_GRIEVANCE_BACKEND_UPDATE,
    {
      id: locator.clientMutationId ? null : locator.internalId,
      clientMutationId: locator.clientMutationId,
    },
  );
  const ticket = response.tickets?.edges?.[0]?.node;
  if (!ticket) return null;

  return {
    id: ticket.id,
    clientMutationId: ticket.clientMutationId,
    status: ticket.status,
    resolution: ticket.resolution,
    dateUpdated: ticket.dateUpdated,
    comments: (ticket.commentSet?.edges ?? []).map((edge) => edge?.node ?? null),
  };
}

export async function getGrievanceTicket(id: string) {
  const response = await graphqlClient.request<GetTicketsResponse, GetTicketsVariables>(
    GET_TICKETS,
    { id },
  );

  return response.tickets?.edges?.[0]?.node ?? null;
}

/**
 * The attachment endpoints are REST, not GraphQL, and live next to the
 * GraphQL endpoint under the same site root (`/api` by default).
 */
const ATTACHMENT_UPLOAD_URL = env.GRAPHQL_URL.replace(
  /\/graphql\/?$/,
  "/grievance_social_protection/upload",
);

const GET_TICKET_ATTACHMENTS = gql`
  query TicketAttachments($ticketId: ID!) {
    ticketAttachments(ticket_Id: $ticketId) {
      edges {
        node {
          id
          filename
        }
      }
    }
  }
`;

type TicketAttachmentsResponse = {
  ticketAttachments?: {
    edges?: { node?: { id?: string | null; filename?: string | null } | null }[] | null;
  } | null;
};

/**
 * Filenames already attached to the ticket, used to avoid duplicating files
 * on retry (the upload endpoint has no idempotency key). Returns null when
 * the ticket cannot be resolved to a raw UUID or the query fails — callers
 * then upload without deduplication.
 */
export async function fetchGrievanceTicketAttachmentFilenames(locator: {
  internalId: string | null;
  clientMutationId: string | null;
}): Promise<string[] | null> {
  const ticketId = rawUuidFromValue(locator.internalId) ?? relayNodeValue(locator.internalId);
  if (!ticketId) return null;

  try {
    const response = await graphqlClient.request<TicketAttachmentsResponse>(
      GET_TICKET_ATTACHMENTS,
      { ticketId },
    );
    return (response.ticketAttachments?.edges ?? [])
      .map((edge) => edge?.node?.filename)
      .filter((filename): filename is string => Boolean(filename));
  } catch (error) {
    console.warn("[Grievance Sync] Failed to list ticket attachments:", error);
    return null;
  }
}

/**
 * Multipart upload of evidence files to the grievance attachment endpoint.
 * Links the files by `client_mutation_id` (preferred for freshly created
 * tickets) or the ticket's raw UUID. An HTTP 200 can still carry per-file
 * failures, so callers must inspect both `saved` and `errors`.
 */
export async function uploadGrievanceTicketAttachments(
  locator: { internalId: string | null; clientMutationId: string | null },
  files: GrievanceAttachmentFile[],
): Promise<GrievanceAttachmentUploadResult> {
  const formData = new FormData();

  if (locator.clientMutationId) {
    formData.append("client_mutation_id", locator.clientMutationId);
  } else {
    const ticketUuid = rawUuidFromValue(locator.internalId);
    if (!ticketUuid) {
      throw new Error("Cannot upload grievance attachments without a ticket locator.");
    }
    formData.append("ticket_uuid", ticketUuid);
  }

  let appended = 0;
  for (const file of files) {
    // Expo's WinterCG fetch does not support React Native's { uri, name, type }
    // FormData descriptors. It accepts any part exposing `bytes()`, and reads
    // `name`/`type` off the part for the multipart headers — which also keeps
    // the uploaded filename identical to the one used for retry deduplication.
    const source = new File(file.uri);
    if (!source.exists) {
      console.warn(`[Grievance Sync] Evidence file missing, skipping upload: ${file.name}`);
      continue;
    }

    formData.append("files", {
      name: file.name,
      type: file.type,
      bytes: () => source.bytes(),
    } as unknown as Blob);
    appended += 1;
  }

  // Nothing left on disk to upload (e.g. the OS purged the cache). Report
  // success so the grievance is not retried forever for files that no longer
  // exist.
  if (appended === 0) {
    return { saved: [], errors: [] };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const authToken = secureStorage.getString(SECURE_STORAGE_KEYS.SESSION_AUTH_TOKEN);
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const response = await fetch(ATTACHMENT_UPLOAD_URL, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Attachment upload failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const result = (await response.json()) as Partial<GrievanceAttachmentUploadResult>;
  return { saved: result.saved ?? [], errors: result.errors ?? [] };
}
