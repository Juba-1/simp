# SIMP PLATFORM — MASTER E2E BLUEPRINT

> Definitive current-state map of the SIMP Construction PMIS (NestJS + PostgreSQL/Prisma backend, Next.js 16 / React / Zustand / Dexie frontend).
> Generated after the **Holistic Common-Sense Sweep & Automation Enforcement** sprint.
> Status legend: ✅ implemented & wired · 🟡 partial / needs attention · ❌ missing.

---

## 0. EXECUTIVE SUMMARY

The platform implements the full PMIS golden path: **Field Initiation → Offline Auto-Sync → Internal QA/QC → External Consultant Review → Lab Test → IPC Financial Closure**. The backend RBAC, multi-tenant scoping, offline sync engine, and approval state machines are solid and were **not rewritten** in this sprint.

This sprint delivered:
- **Killed the developer sandbox** at `/dashboard/sync` (raw UUID inputs, JSON dumps, "simulate offline" toggle, debug camera) and replaced it with a clean **Field Sync Hub**.
- **Hardened auto-sync omnipresence** — background flush now triggers on `online`, **tab focus**, **visibility change**, and **session authentication**, in addition to the existing 30 s safety poll.
- **Purged technical jargon** (UUID / IndexedDB / "template ID") from all end-user copy.
- Confirmed **contextual inference**: forms derive `projectId` from the route and `organizationId` from the authenticated session — the user never types or selects an ID.

**MVP readiness: ~85%.** The remaining 15% ("The Missing 1%" expanded) is enumerated in §6 — none of it blocks a controlled pilot, but several items should close before a contractual handover.

---

## 1. FULL UI TOPOLOGY (PER ROLE)

Two navigation layers exist:
- **Global sidebar** (`getNavForWorkspace`) — top-level workspace per organization type.
- **Project sidebar** (`ProjectSidebar`) — appears inside `/dashboard/projects/[id]/*`.

### 1.1 Global Sidebar by Role

| Role (workspace) | Sidebar items |
|---|---|
| **Super Admin** | System Overview · Organizations · Global Audit Log · Settings |
| **Client (Owner)** | Dashboard · Projects · Invoices / IPC · Audit Log · Settings |
| **Consultant** | Approval Queue · Projects · Reports · Settings |
| **Main Contractor** (org admin / QA-QC) | My Tasks · Projects · Internal QA/QC · Audit Log · IPC Generator · Sub-contractors · Field Sync · Settings |
| **Sub-Contractor** (org admin / QA-QC) | My Tasks · Field Sync · Projects · Settings |
| **Field Engineer** (MC or Sub, non-admin, non-QA) | **My Field Tasks · New Form · Offline Sync Status** *(only 3 — deliberately stripped)* |
| **Laboratory** | Blind Testing *(single-purpose portal)* |

### 1.2 Project Sidebar (inside a project)

| Item | Visible to |
|---|---|
| Overview | All except Field Engineer |
| Forms | All (Field Engineer too) |
| Materials | All except Field Engineer & Lab |
| Invoices / IPC | Client, Main Contractor, Consultant only (`canViewIpcBilling`) — hidden from Sub-Contractor & Field Engineer |
| Audit | All except Field Engineer |
| Team | Org admins only (not Field Engineer) |
| Settings | Client org admin only |

### 1.3 Key Action Buttons by Role

| Role | Primary actions they can see |
|---|---|
| **Super Admin** | Create org, view global audit, platform settings |
| **Client** | Create Project · Onboard Vendor (provision consultant/contractor/lab) · Assign stakeholders · Approve/Reject **IPC (client tier)** · Refresh system templates · Manage own users |
| **Consultant** | Open **Split-pane Command Center** → review GPS pin on map → **Approve/Reject (external)** · Approve/Reject **IPC (consultant tier)** · Initiate **NCR & CVI only** · Reports |
| **Main Contractor** | Create WIR/MIR/MDR/MAR/RFI/VO/PTW/IR · **Internal QA/QC: Approve & forward / Reject** · **Generate IPC draft → Submit** · Link/Provision Sub-contractors · Reset sub-contractor admin password · Team management |
| **Sub-Contractor** | Create field forms · Field Sync · (data rolls up to Main Contractor) |
| **Field Engineer** | **Create WIR** · **Create MIR** (big mobile buttons) · view own submissions · **Sync now** |
| **Laboratory** | Scan/lookup **blind barcode** · Submit **Pass/Fail** result (no project/contractor identity shown) |

---

## 2. FORM MATRIX STATUS (16 STANDARD CODES)

`StandardFormCode` enum defines **16** codes. **10** have fully seeded JSONB field schemas and are auto-installed on project creation. Field-execution forms carry the **strict anti-fraud live camera** (GPS + timestamp + device-id embedded in photo metadata); administrative forms carry **file attachments** instead.

| # | Code | Name | Seeded | Field types present | Strict Camera/GPS |
|---|---|---|---|---|---|
| 1 | **WIR** | Work Inspection Request | ✅ | select(MIR source), number(qty), text(unit), **number(unitRate, billable)**, number(lineAmount), textarea, text(location), **photo(live)** | ✅ camera (GPS via photo) |
| 2 | **NCR** | Non-Conformance Report | ✅ | textarea, select(severity), text, textarea, **photo(live)** | ✅ camera |
| 3 | **MIR** | Material Inspection Report | ✅ | text×2, number(qty), select(unit), **photo(live)** | ✅ camera |
| 4 | **MDR** | Material Delivery Report | ✅ | select(MIR source), number, textarea, **photo(live)** | ✅ camera |
| 5 | **MAR** | Material Approval Request | ✅ | text×3, number, select, text, textarea, **gps_picker**, file_attachment, photo(optional) | ✅ GPS + camera |
| 6 | **RFI** | Request for Information | ✅ | text, select(discipline), select(urgency), textarea×2, text×2, **file_attachment** | ❌ admin form (correct) |
| 7 | **CVI** | Confirmation of Verbal Instruction | ✅ | date, text, textarea×2, boolean, number×2, textarea, **file_attachment** | ❌ admin form (correct) |
| 8 | **VO** | Variation Order | ✅ | text, textarea×2, boolean, number(cost), select(currency), number(days), **file_attachment** | ❌ admin form (correct) |
| 9 | **PTW** | Permit to Work | ✅ | select(type), text, date×2, textarea×2, **gps_picker**, **photo(live)** | ✅ GPS + camera |
| 10 | **IR** | Inspection Request | ✅ | select(type), text, date, textarea×2, **gps_picker**, photo(optional) | 🟡 GPS req, photo optional |
| 11 | **SDS** | (Shop Drawing Submittal) | ❌ | — | — |
| 12 | **MSS** | (Method Statement Submittal) | ❌ | — | — |
| 13 | **SOR** | (Site Observation Report) | ❌ | — | — |
| 14 | **DPR** | (Daily Progress Report) | ❌ | — | — |
| 15 | **IPC** | Interim Payment Certificate | ✅* | *Handled by dedicated Financial module, not a JSONB field form* | n/a |
| 16 | **AS_BUILT** | As-Built Drawing | ❌ | — | — |

**Field-type library in production:** `text`, `textarea`, `number`, `select`, `boolean`, `date`, `photo` (live anti-fraud camera), `gps_picker`, `file_attachment`.

**Gap:** 5 enum codes (SDS, MSS, SOR, DPR, AS_BUILT) have **no seed schema** → they cannot be initiated. See §6.

---

## 3. WORKFLOW VALIDATION (BACKEND STATE MACHINES)

### 3.1 Form Approval State Machine (`FormWorkflowStateMachine`)

Default policy (`WorkflowPolicyService`, configurable per project + form code):
`requiresInternalApproval = true` · internal approver = **MAIN_CONTRACTOR** · external approver = **CONSULTANT** · `externalSlaHours = 48`.

```
DRAFT
  │  submit()
  ├─ field submitter (Main/Sub Contractor) + requiresInternalApproval
  │        → PENDING_INTERNAL_APPROVAL   (phase: INTERNAL_REVIEW, pending: MAIN_CONTRACTOR)
  │             │ approveInternal()          → PENDING_EXTERNAL_APPROVAL
  │             │ rejectInternal()           → REJECTED
  │
  └─ non-field submitter (e.g. Consultant NCR/CVI)
           → PENDING_EXTERNAL_APPROVAL   (phase: EXTERNAL_REVIEW, pending: CONSULTANT)
                 │ approveExternal()          → APPROVED  (phase: COMPLETED)
                 │ rejectExternal()           → REJECTED
                 │ SLA breach (>48h)          → SLA_BREACHED (still externally actionable)
```

**Guards enforced (`assertActionAllowed`):**
- SUBMIT only from `DRAFT`.
- APPROVE/REJECT_INTERNAL only from `PENDING_INTERNAL_APPROVAL` **and** actor org type == pending org type.
- APPROVE/REJECT_EXTERNAL only from `PENDING_EXTERNAL_APPROVAL` or `SLA_BREACHED` **and** actor org type == pending org type.
- **ORG_ADMIN inheritance:** a Main Contractor org admin may submit/act on a **managed sub-contractor's** form (`isManagedSubContractorForm`).

### 3.2 IPC Financial State Machine (`IpcStateMachine`)

```
DRAFT  ──submitForConsultantReview()──▶  PENDING_CONSULTANT_REVIEW
       ──consultantApprove()─────────▶  PENDING_CLIENT_APPROVAL
       ──clientApprove()─────────────▶  APPROVED
       ──reject() (any stage)────────▶  REJECTED
```
- **Only the Main Contractor** may create/submit an IPC draft (`assertContractor` — sub-contractors blocked).
- Consultant tier approves first, then Client tier — matches real disbursement governance.

---

## 4. AUTOMATION CHECKLIST

| Automation | Status | Where |
|---|---|---|
| **Project creation → auto-seed 10 templates** | ✅ | `ProjectsService.create()` calls `seedStandardTemplates` post-insert |
| **Offline-first capture** (IndexedDB via Dexie) | ✅ | `saveFormInstanceOffline` |
| **Auto-sync on reconnect** (`window 'online'`) | ✅ | `sync-store.initialize()` |
| **Auto-sync on tab focus / visibility / login** | ✅ **(new)** | `sync-store` listeners + `use-sync-manager` token effect |
| **30 s safety poll** while items pending | ✅ | `use-sync-manager` |
| **Auto workflow submit after sync** | ✅ | `workflowSubmitPending` flag → `triggerWorkflowSubmit` |
| **Sync ordering** (forms before photos) | ✅ | `processQueue` runs `pushPendingSyncActions` then `uploadPendingFiles` |
| **WIR line amount = qty × unit rate** | ✅ | computed in `new-form-page-client` on submit |
| **Anti-fraud camera** embeds GPS + timestamp + device-id | ✅ | `uploadPhoto` metadata |
| **Lab blind barcode + anonymized label** | ✅ | `BarcodeService.generate()` → `SAMPLE-xxxxx` |
| **Context inference** (org from token, project from route) | ✅ | server derives `organizationId`; route supplies `projectId` |
| **Last-write-wins conflict handling** | ✅ | `upsertWithLastWriteWins` (server-side) |
| **SLA breach escalation** | 🟡 | SLA module + `SLA_BREACHED` state exist; delivery/notification wiring unverified |
| **Lab test auto-requested on MIR/WIR approval** | ❌ | Lab test request is a **manual** action today (see §6) |
| **Reference-number auto-generation scheme** | 🟡 | `referenceNumber` field exists; per-project/year numbering scheme not confirmed |

---

## 5. PART 2 CHANGES APPLIED THIS SPRINT

### A) Killed the developer sandbox → clean **Field Sync Hub**
- **Removed:** raw `Project ID (UUID)` / `Template ID (UUID)` text inputs, `Save form offline` debug action, debug camera capture, raw queue/upload/instance JSON lists with truncated UUIDs, and the `Simulate offline` toggle.
- **New `SyncHubClient`** (`components/sync/sync-hub-client.tsx`) shows exactly three things:
  1. **Connection status** card — Online / Offline / Syncing with plain-language guidance.
  2. **Progress bar + friendly waiting list** — "WIR · Form submission", "Site photo", "Document" with Waiting / Uploading / Uploaded / Will-retry badges. No UUIDs, no JSON.
  3. **"Sync now"** force-fallback button (disabled while offline/syncing/empty).
- Empty state: "All caught up — every submission on this device has been uploaded."

### B) Auto-sync omnipresence
- Added `focus` + `visibilitychange` listeners in `sync-store.initialize()` → silent `processQueue()` whenever the user returns to the app on **any** page.
- Added a token-availability effect in `use-sync-manager` → flush immediately after login/refresh.
- Pre-existing `online`/`offline` listeners and 30 s poll retained.

### C) Jargon & context sweep
- Deleted the entire `sandbox` i18n block (the only source of "UUID" / "IndexedDB" user-facing strings) from `en.ts`, `ar.ts`, `types.ts`; replaced with a clean `syncHub` block (EN + AR).
- Verified no remaining end-user strings contain `UUID`, `API`, `endpoint`, or `IndexedDB`.
- Confirmed form creation never asks the user for an org/project ID — both are inferred.

**Build status:** Frontend `next build` ✅ · Backend `nest build` ✅ (backend untouched this turn) · Lints clean on all changed files.

---

## 6. THE MISSING 1% (ENTERPRISE PMIS GAP ANALYSIS — vs Procore / Aconex)

Ordered by risk to a real construction handover.

### 🔴 High priority (close before contractual go-live)
1. **Unseeded standard forms.** SDS, MSS, SOR, DPR, AS_BUILT are in the enum but have **no schema** → cannot be raised. Daily Progress Report (DPR) and Method Statement (MSS) are daily-use staples on real sites.
2. **No digital signature / PIN sign-off on approvals.** Procore/Aconex capture a legally-attributable signature at each gate. Today approval = an authenticated button click + audit row. Add signature/PIN capture to internal & external approvals and IPC sign-off.
3. **Lab barcode is not auto-generated on MIR/WIR approval.** Golden-path step 5 implies automatic blind-sample creation; today a lab test request is a separate manual action. Wire approved MIR/WIR (where material testing applies) to auto-create the lab request + barcode.
4. **Unit-rate integrity / BOQ master.** WIR `unitRate` is free-typed by the field user → fraud/error risk feeding directly into IPC billing. Introduce a project **BOQ/rate schedule** and look up the rate (read-only) instead of manual entry.

### 🟡 Medium priority
5. **Rejection → resubmission loop.** `REJECTED` moves to `COMPLETED` phase. Confirm/implement a clean "revise & resubmit" (clone to new DRAFT, linked to original) — real QA cycles iterate.
6. **RFI ball-in-court / distribution lists.** Routing is **org-type** level only. Enterprise RFIs route to **named responsible parties** with due dates and reminders.
7. **PTW expiry enforcement.** `validTo` is captured but no automated permit auto-close/alert on expiry — a safety-critical gap.
8. **Notifications delivery.** Profile has email/push/SLA toggles, but actual email/push dispatch is not confirmed wired. Approvals & SLA breaches need real out-of-band alerts.
9. **Document & drawing register with version control.** No central register or drawing revision tracking (core Aconex capability) feeding RFI/SDS references.
10. **GPS guarantee on photo-only forms.** WIR/MIR/NCR/MDR rely on GPS embedded in the **photo** (no standalone `gps_picker`). For IR/MAR the photo is optional → a submission could lack coordinates. Enforce GPS presence server-side for field-execution forms.

### 🟢 Lower priority / polish
11. **Offline conflict UX.** Server does last-write-wins; the user gets no visibility when their offline edit was overwritten.
12. **Reference numbering scheme.** Confirm human-readable per-project sequential refs (e.g., `WIR-PRJ-2026-0001`).
13. **VO → contract budget linkage.** Approved VOs don't yet adjust a tracked contract value / variation register.
14. **DPR analytics** (weather, manpower, plant, productivity) — absent because DPR is unseeded.
15. **Bulk approvals** for Consultant Command Center (approve several compliant WIRs at once with audit).

---

## 7. GOLDEN-PATH CONFORMANCE VERDICT

| Step | Spec | Implementation | Verdict |
|---|---|---|---|
| 1. Field initiation (mobile, GPS/camera, offline) | required | Field Engineer dashboard + dynamic renderer + anti-fraud camera + Dexie | ✅ |
| 2. Auto-sync on reconnect (silent) | required | online/focus/visibility/login + poll → batch push + workflow submit | ✅ (hardened) |
| 3. QA/QC internal review | required | `PENDING_INTERNAL_APPROVAL` → MC QA/QC queue | ✅ |
| 4. Consultant external review (map + GPS pin) | required | Split-pane Command Center + map | ✅ |
| 5. Lab blind test | required | Blind barcode + Pass/Fail portal | 🟡 manual request step |
| 6. IPC financial closure | required | MC drafts → Consultant → Client approve | ✅ |

**Bottom line:** The wires are connected, the developer sandbox is gone, and automation is omnipresent. The system is demo- and pilot-ready. Close §6 items 1–4 before putting a real contractor's payment cycle on it.
