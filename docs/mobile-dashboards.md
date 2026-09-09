# TASAF Mobile Dashboards — Role-Based Redesign

Implementation-ready specification for the seven role-based mobile dashboards.
Aligns with `src/components/dashboard/dashboard-groups.ts` (group ids, tile ids,
stat keys) and the location model on the `users` collection
(`regionId`, `districtId`/council, `wardId`, `villageId`).

The mobile app is **field- and action-oriented**. Heavy administration —
user/role management, permission config, workflow design, system settings, bulk
imports, and reporting exports — stays on the **web portal** and is intentionally
excluded below.

---

## 1. Foundations (shared by all dashboards)

### 1.1 Location scope model

Hierarchy: **National → Region → Council (District) → Ward → Village.**

Each user has an assigned scope level derived from their role + assigned
location. Every list, count, and summary is filtered to the **subtree** rooted at
the user's assigned location.

| Scope level | Sees data for | Set by |
|---|---|---|
| `village` | one village | `villageId` |
| `ward` | all villages in the ward | `wardId` |
| `council` | all wards + villages in the council | `districtId` |
| `region` | all councils in the region | `regionId` |
| `national` | everything | none (unscoped) |

Rules:
- **Never fetch outside the subtree.** Scope is applied server-side (PowerSync
  sync rules / GraphQL args) *and* re-asserted client-side as a guard.
- A user with no assigned location for their level sees an **empty state with a
  "set working location" prompt** (mirrors the existing `hasLocation` flow and
  `/account/location`).
- Scope is shown in the dashboard header as a chip (e.g. "Kibaha DC → Mlandizi
  Ward") so the user always knows what they are looking at.
- Read-only/executive roles may switch scope *down* (drill in) but never see
  identifying beneficiary PII unless permitted.

### 1.2 Permission model

Actions are gated by `module:action` permission keys resolved from the user's
role. **If the permission is absent, the action/card is not rendered** (not
disabled — hidden), except where a read-only summary is explicitly allowed.

Core keys referenced below: `grievance:{view,create,assign,comment,resolve}`,
`household:{view,update}`, `beneficiary:{view,verify}`, `attendance:confirm`,
`receipt:confirm`, `payment:{view,confirm,reconcile}`, `training:{view,report}`,
`enrolment:{check,review,approve}`, `communication:{view,acknowledge,publish}`,
`me:view`, `escalation:view`.

### 1.3 Shared UI conventions

- **Header**: user + greeting, scope chip, sync-status pill, notifications, account.
- **Dashboard switcher**: bottom sheet (already built) — only lists dashboards
  the user's role grants; if the user has exactly one, hide the switcher.
- **Summary cards**: horizontally scrollable, tappable → filtered list.
- **Alerts strip**: dismissible, priority-colored, deep-links to the item.
- **Quick actions**: 2-up grid of large tappable tiles, permission-filtered.
- **Empty state**: icon + one-line explanation + (optional) primary action.
- **Offline**: every card shows last-synced time; counts reflect local data.

---

## 2. Field Operations Dashboard  (`field_operations`)

**Purpose.** The daily worklist for frontline officers: who to visit, what to
verify, what to capture, and what still needs to sync.

**Target roles.** Village Executive Officer (village), Ward Executive Officer
(ward), Council Coordinator (council), Assistant Monitoring Officer
(council/ward, verification-focused).

**Main goals.**
1. See today's pending field tasks and clear them.
2. Verify beneficiaries and confirm attendance/receipts on site.
3. Capture grievances and household updates offline, then sync.

**Key summary cards.**
- `households` — households in scope.
- `beneficiaries` — active beneficiaries in scope.
- `pending_field_tasks` — assigned, not-yet-done tasks.
- `verification_tasks` — beneficiaries awaiting verification.
- `grievances` — open grievances captured in scope.
- `pending_sync` — local records not yet uploaded.

**Alerts / notifications.**
- Unsynced records older than 24h ("Sync before you lose connectivity").
- Overdue field tasks past their due date.
- New task assignments pushed from council/web.
- Verification list changed after a new enrolment batch.

**Quick actions** (permission-gated).
- Capture grievance (`grievance:create`).
- Update household (`household:update`).
- Verify beneficiary (`beneficiary:verify`).
- Confirm attendance/receipt (`attendance:confirm` / `receipt:confirm`).
- Sync now (always).

**Main content sections.**
1. Today's tasks (grouped: overdue, due today, upcoming).
2. Verification queue.
3. Recently captured (grievances + household edits, with sync state).
4. Sync status detail (pending count, last sync, failures + retry).

**Empty states.**
- No tasks: "You're all caught up. New tasks appear here when assigned."
- No location set: prompt to set working location.
- Offline first run: "Connect once to download your households and tasks."

**Location filtering.** Strictly the user's subtree. VEO = single village; WEO =
ward's villages; Council Coordinator = council; AMO = assigned verification area.

**Permission visibility.** Hide capture/verify/confirm actions the role lacks.
AMO typically has `verify`/`me:view` but not `household:update`. Council
Coordinator sees aggregated counts across wards but the same action set.

**Recommended layout.** Header → scope chip → alerts strip → summary cards
(scroll) → "Today's tasks" list → quick actions grid → sync card.

**Blind spots / improvements.**
- Add **GPS/geo-tag** on verification + a map view of pending visits.
- **Conflict handling** when the same household is edited on web and mobile.
- Batch "confirm attendance" for a whole session to cut taps.
- Show **route optimization** ("5 households nearby") to reduce travel.
- Distinguish "captured offline" vs "synced" vs "server-rejected" clearly.

---

## 3. GRM Dashboard  (`grm`)

**Purpose.** Grievance intake-to-resolution workflow on mobile.

**Target roles.** Grievance Officer, Grievance Redress Officer (council), Council
Coordinator, Ward Executive Officer, Village Executive Officer (capture-heavy at lower
levels).

**Main goals.**
1. Triage new grievances quickly.
2. Work assigned cases; add comments/attachments.
3. Resolve within SLA and watch overdue cases.

**Key summary cards.**
- `new_grievances` — unassigned/new in scope.
- `assigned_grievances` — assigned to me / my office.
- `overdue_grievances` — past SLA.
- `resolved_grievances` — closed (trailing 30 days).

**Alerts / notifications.**
- Grievance breaching SLA today.
- New grievance assigned to me.
- Complainant reply / new comment on my case.
- High-priority or sensitive category flagged.

**Quick actions.**
- New grievance (`grievance:create`).
- My queue (`grievance:view`).
- Add comment / attachment (`grievance:comment`).
- Assign (`grievance:assign`) — Council/GRO only.
- Resolve (`grievance:resolve`) — permission-scoped.

**Main content sections.**
1. Triage: new & unassigned.
2. My cases: assigned, sorted by SLA urgency.
3. Overdue.
4. Recently resolved (audit trail).

**Empty states.**
- No open grievances: "No grievances need attention. Great job."
- No assignment rights: hide triage/assign; show only "My cases".

**Location filtering.** Subtree-scoped. VEO/WEO mostly **capture + view**;
GRO/Council see the full council queue and can assign/resolve.

**Permission visibility.** `assign` and `resolve` hidden below GRO/Council.
Sensitive categories (e.g. safeguarding) visible only to permitted roles.

**Recommended layout.** Header → alerts strip (SLA) → status cards → segmented
list (Triage / Mine / Overdue) → quick actions.

**Blind spots / improvements.**
- **SLA countdown** chips per case, not just an overdue count.
- **Anonymous / sensitive** handling and restricted visibility.
- Offline attachment capture (photo/audio) with deferred upload.
- Duplicate-grievance detection at capture time.
- Escalation path when a case can't be resolved at the current level.

---

## 4. Programme Operations Dashboard  (`programme_operations`)

**Purpose.** Move enrolment and programme delivery work through checks, reviews,
and approvals.

**Target roles.** Programme Delivery Officer (council), Programme Manager
(region/national), Director of Programs (national). *Approval actions gated by
level.*

**Main goals.**
1. See what's pending a check/review/approval.
2. Clear the queue with confidence (see supporting data inline).
3. Track enrolment batch progress and programme health.

**Key summary cards.**
- `enrolment_batches` — active batches in scope.
- `pending_checks` — records awaiting first-line check.
- `pending_reviews` — awaiting review.
- `approval_queue` — awaiting approval (permission-gated visibility).
- `training_summaries` — linked training completion snapshot.

**Alerts / notifications.**
- Batch stuck > N days at a stage.
- Approval requested (for approvers).
- Data-quality exceptions flagged during checks.
- Enrolment target vs actual falling behind.

**Quick actions.**
- Run checks (`enrolment:check`).
- Review batch (`enrolment:review`).
- Approve / return (`enrolment:approve`) — approvers only.
- Open programme summary (`me:view`).

**Main content sections.**
1. My queue by stage (Check → Review → Approve), respecting permissions.
2. Enrolment batches with progress bars.
3. Exceptions / data-quality flags.
4. Programme summary snapshot (targets, coverage).

**Empty states.**
- Empty queue: "Nothing awaiting your action."
- Non-approver: hide approval column entirely.

**Location filtering.** PDO = council; PM = region/national roll-up with drill
down; Director = national. Approvals only appear for records within the
approver's authority.

**Permission visibility.** Approve/return hidden without `enrolment:approve`.
PDO sees check/review only. Managers see aggregates + drill-down, not raw PII
unless permitted.

**Recommended layout.** Header → scope chip → stage cards → queue list (segmented
by stage) → batches → exceptions.

**Blind spots / improvements.**
- Keep **bulk approvals light** — allow small batch approve on mobile but push
  large administrative operations to web.
- Show **why** a record was flagged, inline, to avoid app-switching.
- Audit trail: who checked/reviewed/approved and when.
- Clear separation of "my authority" vs "informational" items.

---

## 5. Training Dashboard  (`training`)

**Purpose.** Plan, run, and report on trainings and community sessions.

**Target roles.** Programme Delivery Officer, Programme Manager, Assistant
Monitoring Officer, Director of Programs.

**Main goals.**
1. Know what training is planned, ongoing, and completed.
2. Capture attendance and submit reports on time.
3. Access training materials in the field (offline).

**Key summary cards.**
- `planned_trainings`, `ongoing_trainings`, `completed_trainings`.
- `attendance_rate` — trailing average in scope.
- `pending_reports`, `overdue_reports`.

**Alerts / notifications.**
- Training starting today / this week.
- Report overdue for a completed session.
- New materials published for upcoming sessions.
- Low attendance flagged on a completed session.

**Quick actions.**
- Take attendance (`attendance:confirm`).
- Submit report (`training:report`).
- Open materials (`training:view`).
- Schedule/prepare session (permission-gated; light only).

**Main content sections.**
1. Upcoming (planned/ongoing) with date + venue.
2. Attendance to capture.
3. Reports due (pending/overdue).
4. Materials library (downloadable, offline).

**Empty states.**
- No trainings: "No sessions scheduled in your area yet."
- No reports due: "All reports submitted."

**Location filtering.** Subtree-scoped by role. AMO focuses on monitoring
attendance/reports; PDO on delivery; PM/Director on roll-ups.

**Permission visibility.** Report submission hidden without `training:report`.
AMO may view + verify but not author delivery reports.

**Recommended layout.** Header → status cards → "Upcoming" list → "Reports due" →
quick actions → materials.

**Blind spots / improvements.**
- **Offline attendance** with signature/thumbprint capture, deferred sync.
- Pre-fill attendance from the enrolled roster to cut manual entry.
- Materials **version + size** and download-for-offline control.
- Link training completion back to Programme Operations metrics.

---

## 6. Communication Feed Dashboard  (`communication_feed`)

**Purpose.** A read/acknowledge feed of official app communications; publishing
only for communication roles.

**Target roles.** Staff, Facilitators, Communication Officer, Communication
Manager, Executive roles (read). Publish limited to Communication Officer/Manager.

**Main goals.**
1. Read priority notices and required acknowledgements.
2. Never miss a message relevant to my role/area.
3. (Comms roles) publish to targeted audiences.

**Key summary cards.**
- `unread_messages`, `priority_notices`, `acknowledgements_required`,
  `published_communications`.

**Alerts / notifications.**
- New priority notice.
- Acknowledgement required by a deadline.
- (Comms roles) delivery/read stats on a published item.

**Quick actions.**
- View feed (`communication:view`).
- Acknowledge (`communication:acknowledge`).
- New communication (`communication:publish`) — comms roles only.

**Main content sections.**
1. Priority / action-required (pinned top).
2. Unread.
3. All communications (searchable).
4. (Comms roles) my published items + engagement stats.

**Empty states.**
- Nothing to read: "You're up to date."
- Non-publisher: hide compose + stats sections.

**Location filtering.** Audience targeting by scope/role: a village facilitator
sees national + their region/council/ward messages; publishers target audiences
within their authority. Never show messages outside the user's audience.

**Permission visibility.** Compose + analytics hidden without
`communication:publish`. Acknowledge shown only when required of this user.

**Recommended layout.** Header → priority strip → unread list → search/all →
(compose FAB for publishers).

**Blind spots / improvements.**
- **Acknowledgement receipts** (who/when) for compliance.
- Attachments viewable offline once downloaded.
- Do heavy audience segmentation on **web**; mobile picks from predefined groups.
- Language-aware delivery (EN/SW) matching user preference.

---

## 7. Payment Monitoring Dashboard  (`payment_monitoring`)

**Purpose.** Monitor payment cycles and confirm council-level disbursement and
reconciliation. **Monitoring/confirmation only — no money movement on mobile.**

**Target roles.** Payment Officer, Finance Manager, Director of Finance &
Administration, Council Coordinator (confirmation).

**Main goals.**
1. See the current cycle status and disbursement progress.
2. Confirm council-level receipts and flag reconciliation gaps.
3. Catch payment alerts/exceptions early.

**Key summary cards.**
- `active_cycles`, `disbursed` (%), `reconciliation_pending`,
  `council_confirmations`, `payment_alerts`.

**Alerts / notifications.**
- Reconciliation mismatch in scope.
- Cycle opened/closed.
- Confirmation pending from my council.
- Failed/held payments needing attention.

**Quick actions.**
- View cycle (`payment:view`).
- Confirm council disbursement (`payment:confirm`) — Council Coordinator.
- Flag reconciliation issue (`payment:reconcile`) — finance roles.

**Main content sections.**
1. Current cycle status (progress + timeline).
2. Disbursement summary by council/ward.
3. Reconciliation queue (pending + mismatches).
4. Alerts / exceptions.

**Empty states.**
- No active cycle: "No payment cycle is currently open."
- No confirmations due: "Nothing to confirm right now."

**Location filtering.** Payment/Finance roles = region/national roll-up with
drill-down; Council Coordinator = council confirmation only. Amount-level PII
gated by permission.

**Permission visibility.** Confirm hidden without `payment:confirm`; reconcile
hidden without `payment:reconcile`. **No initiate/edit-payment on mobile.**

**Recommended layout.** Header → cycle status card → disbursement summary →
reconciliation queue → alerts.

**Blind spots / improvements.**
- Strong **read-only guardrails**; make it obvious mobile cannot move funds.
- Confirmation needs an **audit trail + optional dual control**.
- Trend of disbursement vs plan over cycles.
- Keep reconciliation *investigation* on mobile but resolution/adjustment on web.

---

## 8. Executive / M&E Dashboard  (`executive_me`)  — read-only

**Purpose.** High-level, read-only visibility into performance, trends,
exceptions, and escalations across regions/national.

**Target roles.** Executive Director, National Steering Committee, Internal
Audit, M&E Analyst, Regional Coordinator.

**Main goals.**
1. Understand overall programme health at a glance.
2. Spot exceptions and open escalations.
3. Drill from national → region → council for context.

**Key summary cards.**
- `programme_coverage` (%), `active_regions`, `open_escalations`,
  `exceptions`, `reports`.

**Alerts / notifications.**
- New escalation raised.
- KPI breaching threshold.
- Audit exception flagged.

**Quick actions** (navigational, not transactional).
- View KPIs / trends (`me:view`).
- Open escalations (`escalation:view`).
- Browse reports (`me:view`).

**Main content sections.**
1. KPI headline tiles.
2. Trends (sparklines / small charts).
3. Exceptions & escalations.
4. Regional/national performance league (drill-down).

**Empty states.**
- No data for scope: "No results for this area yet."
- No escalations: "No open escalations."

**Location filtering.** Regional Coordinator = region; national roles =
national with drill-down. **Aggregated, de-identified** by default; raw PII only
for Internal Audit where permitted.

**Permission visibility.** Everything **read-only** — no create/edit/approve
actions rendered. Audit-only detail gated by `escalation:view` / audit role.

**Recommended layout.** Header (scope switcher) → KPI tiles → trend cards →
exceptions/escalations list → regional league.

**Blind spots / improvements.**
- Keep charts **lightweight**; deep analytics/export belong on web.
- Consistent **as-of timestamp** on every metric (avoid mixed freshness).
- Threshold config lives on web; mobile only reflects it.
- Snapshot/offline caching so executives can review without connectivity.

---

## 9. Cross-cutting recommendations

- **Derive dashboards from role**, not manual selection, in production; keep the
  bottom-sheet switcher only for users with multiple dashboards (and for demos).
- **Single permission source** resolved once at login; every tile/action/card
  checks it. Hidden-not-disabled for unavailable actions.
- **Scope-first data layer**: apply location subtree filtering in PowerSync sync
  rules so out-of-scope data never reaches the device.
- **Offline-first**: counts from local data, explicit sync state, deferred
  uploads for captures/attachments.
- **Mobile ≠ web**: capture, verify, confirm, acknowledge, report on mobile;
  configuration, user/role/permission management, workflow design, bulk ops,
  and analytics export on web.
- **Consistent card contract**: title, count/status, as-of time, tap target →
  filtered list; alerts deep-link to the item.
