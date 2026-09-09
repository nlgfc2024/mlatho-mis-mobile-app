# Data Update Module Contract

This document defines the collaboration surface for the schema-only data update
module. The source of truth is the PowerSync schema in `src/powersync/schema.ts`
and the collection export in `src/powersync/collections.ts`.

## Current scope

Implemented:

- `dataUpdateRequests` PowerSync table.
- `DataUpdateRequestRecord` TypeScript row type.
- `dataUpdateRequestsCollection` TanStack DB collection.
- Collection registration in the shared `collections` object.

Not implemented yet:

- UI writes into `dataUpdateRequests`.
- PowerSync upload route in `src/powersync/connector.ts`.
- Backend GraphQL mutation for data update requests.
- Migration away from the existing `householdChangeRequests` queue.

## Field dictionary

| Field | Type | Required | Purpose |
|---|---:|---:|---|
| `id` | text | yes | PowerSync row id. Generate locally with `randomUUID()` for offline creation. |
| `householdUuid` | text | yes | Household being updated or reviewed. |
| `memberUuid` | text | no | Member affected by the request, when applicable. |
| `targetTable` | text | yes | Table containing the record to update, e.g. `paymentAccounts`. |
| `targetRecordId` | text | no | Target row id. Nullable for new-record requests. |
| `module` | text | yes | Functional area, e.g. `payment`, `household`, `member`. |
| `type` | text | yes | Specific request type. See recommended values below. |
| `status` | text | yes | Workflow status. Start with `Pending`. |
| `priority` | text | no | `Low`, `Medium`, `High`, or backend-defined equivalent. |
| `reason` | text | no | User-selected reason for the update. |
| `remarks` | text | no | Free-text supporting note. |
| `previousPayload` | text | no | JSON snapshot of fields before the update. |
| `proposedPayload` | text | yes | JSON payload containing requested changes. |
| `reviewPayload` | text | no | JSON payload containing reviewer decision details. |
| `requestedByUserId` | text | no | Local user id that created the request. |
| `reviewedByUserId` | text | no | Local or backend user id that reviewed the request. |
| `reviewedAt` | text | no | ISO timestamp for review completion. |
| `clientMutationId` | text | no | Idempotency key for upload or backend ticket creation. |
| `synchronizedAt` | text | no | ISO timestamp once uploaded. Null means still pending local sync. |
| `createdAt` | text | yes | ISO creation timestamp. |
| `updatedAt` | text | yes | ISO last update timestamp. |
| `deletedAt` | text | no | Soft delete timestamp. |

## Recommended value sets

Use these values unless the backend contract says otherwise.

| Field | Values |
|---|---|
| `module` | `payment`, `household`, `member`, `address`, `representative` |
| `type` | `payment_account_update`, `payment_phone_update`, `household_details_update`, `household_address_update`, `representative_update`, `member_update`, `member_deactivation` |
| `status` | `Pending`, `Synchronized`, `Failed`, `Approved`, `Rejected`, `Cancelled` |
| `priority` | `Low`, `Medium`, `High` |

## Payload shape

Payload columns are JSON strings because the module needs to support several
update types without changing the local schema for every backend workflow
revision.

Payment phone update example:

```json
{
  "accountProvider": "Airtel Money",
  "accountNumber": "0785123456",
  "accountName": "Asha Juma",
  "paymentHistory": {
    "count": 3,
    "preserved": true
  }
}
```

Previous payment snapshot example:

```json
{
  "accountProvider": "M-PESA",
  "accountNumber": "0755123456",
  "accountName": "Asha Juma"
}
```

Review payload example:

```json
{
  "decision": "Approved",
  "reviewNotes": "Verified with household representative.",
  "backendTicketId": "12345"
}
```

## Write rules

- Insert one `dataUpdateRequests` row per requested business change.
- Keep `previousPayload` and `proposedPayload` limited to fields needed for
  audit, review, and backend mutation construction.
- Do not directly mutate protected payment details when the flow requires
  review. Store the proposed change and wait for approval.
- For unprotected direct updates, existing flows may continue writing to
  `paymentAccounts` until the upload contract is agreed.
- Keep `clientMutationId` stable across retries to prevent duplicate backend
  tickets or requests.

## Upload handoff

The upload implementer should add a `dataUpdateRequests` case in
`src/powersync/connector.ts`.

Minimum upload payload:

```json
{
  "clientMutationId": "local-request-id-or-uuid",
  "householdUuid": "household-uuid",
  "memberUuid": null,
  "targetTable": "paymentAccounts",
  "targetRecordId": "payment-account-id",
  "module": "payment",
  "type": "payment_phone_update",
  "reason": "Mobile network change",
  "remarks": null,
  "previousPayload": {},
  "proposedPayload": {},
  "requestedByUserId": "user-id",
  "createdAt": "2026-08-20T10:30:00.000Z"
}
```

On successful upload:

- Set `status` to `Synchronized`.
- Set `synchronizedAt` to the current ISO timestamp.
- Preserve the original payloads for offline audit visibility.

On failure:

- Keep the row available for retry.
- Prefer `status = Failed` only for a terminal backend rejection.
- For transient network errors, leave `status = Pending` and let the existing
  retry path attempt upload later.

## Migration note

The existing `householdChangeRequests` table is still used by current screens
and dashboards. Treat `dataUpdateRequests` as the next schema contract. The
other developer can migrate one flow at a time by changing writes from
`enqueueHouseholdChangeRequest()` to `dataUpdateRequestsCollection.insert()`
after the upload route and backend mutation are ready.
