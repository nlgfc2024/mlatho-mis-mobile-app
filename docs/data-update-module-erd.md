# Data Update Module ERD

Schema-only handoff for the mobile data update module. The current implementation
adds the `dataUpdateRequests` PowerSync table and TanStack DB collection, but it
does not yet route UI writes or PowerSync uploads through this table.

## Entity relationship diagram

```mermaid
erDiagram
  HOUSEHOLDS ||--o{ HOUSEHOLD_MEMBERS : contains
  HOUSEHOLDS ||--o{ PAYMENT_ACCOUNTS : owns
  HOUSEHOLDS ||--o{ HOUSEHOLD_PAYMENT_HISTORY : receives
  HOUSEHOLDS ||--o{ HOUSEHOLD_CHANGE_REQUESTS : "legacy update queue"
  HOUSEHOLDS ||--o{ DATA_UPDATE_REQUESTS : "requested for"
  HOUSEHOLD_MEMBERS ||--o{ DATA_UPDATE_REQUESTS : "optionally affects"
  USERS ||--o{ DATA_UPDATE_REQUESTS : requests
  USERS ||--o{ DATA_UPDATE_REQUESTS : reviews
  PAYMENT_ACCOUNTS ||--o{ DATA_UPDATE_REQUESTS : "target record"
  HOUSEHOLD_PAYMENT_HISTORY ||--o{ DATA_UPDATE_REQUESTS : "audit context"

  HOUSEHOLDS {
    string id PK
    string uuid
    string reference
    string headName
    string representativeName
    string villageId
    string caseStatus
    string synchronizedAt
    string deletedAt
  }

  HOUSEHOLD_MEMBERS {
    string id PK
    string uuid
    string householdUuid FK
    string fullName
    int isHead
    int isRepresentative
    int isActive
    string synchronizedAt
    string deletedAt
  }

  PAYMENT_ACCOUNTS {
    string id PK
    string uuid
    string houseHoldId FK
    string accountProvider
    string accountNumber
    string accountName
    int isActive
    string synchronizedAt
    string deletedAt
  }

  HOUSEHOLD_PAYMENT_HISTORY {
    string id PK
    string uuid
    string householdUuid FK
    float amount
    string paymentWindow
    string paidAt
    string status
    string provider
    string paymentPhoneNumber
    string registeredPaymentName
  }

  HOUSEHOLD_CHANGE_REQUESTS {
    string id PK
    string householdUuid FK
    string memberUuid FK
    string type
    string payload
    string status
    string synchronizedAt
    string deletedAt
  }

  DATA_UPDATE_REQUESTS {
    string id PK
    string householdUuid FK
    string memberUuid FK
    string targetTable
    string targetRecordId
    string module
    string type
    string status
    string priority
    string reason
    string remarks
    string previousPayload
    string proposedPayload
    string reviewPayload
    string requestedByUserId FK
    string reviewedByUserId FK
    string reviewedAt
    string clientMutationId
    string synchronizedAt
    string createdAt
    string updatedAt
    string deletedAt
  }

  USERS {
    string id PK
    string uuid
    string reference
    string username
    string firstName
    string lastName
    string regionId
    string districtId
    string wardId
    string villageId
  }
```

## Relationship notes

| Relationship | Key | Notes |
|---|---|---|
| Household to data update request | `dataUpdateRequests.householdUuid` | Required for household-scoped update worklists, dashboards, and sync filters. |
| Member to data update request | `dataUpdateRequests.memberUuid` | Nullable. Use when the update targets a beneficiary, household head, representative, or member status. |
| User to data update request | `requestedByUserId`, `reviewedByUserId` | Nullable until authentication or review context is available. Store local user `id` unless the backend requires `uuid` or `reference`. |
| Polymorphic target | `targetTable`, `targetRecordId` | Points to the record being changed, such as `paymentAccounts` plus a payment account `id`. |
| Payload snapshots | `previousPayload`, `proposedPayload`, `reviewPayload` | JSON strings. Keep them small and domain-specific; do not duplicate full household records. |
| Legacy queue | `householdChangeRequests` | Existing household/payment audit flows still use this table. Migrate only after the new upload route is agreed. |

## Indexed access paths

`dataUpdateRequests` includes indexes for:

- Household worklists: `householdUuid`
- Member-specific work: `memberUuid`
- Polymorphic target lookup: `targetTable`, `targetRecordId`
- Module and request filtering: `module`, `type`, `status`
- Idempotent upload or ticket matching: `clientMutationId`
- Chronological pending queues: `createdAt`

## Status lifecycle

Recommended lifecycle for the first integration:

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Synchronized: uploaded / ticket created
  Pending --> Failed: upload rejected or network retry exhausted
  Failed --> Pending: retry
  Synchronized --> Approved: reviewer accepts
  Synchronized --> Rejected: reviewer rejects
  Pending --> Cancelled: requester cancels locally
  Approved --> [*]
  Rejected --> [*]
  Cancelled --> [*]
```

Use the existing project strings `Pending` and `Synchronized` for compatibility
with current sync banners. Add `Failed`, `Approved`, `Rejected`, and `Cancelled`
only when the backend workflow supports them.
