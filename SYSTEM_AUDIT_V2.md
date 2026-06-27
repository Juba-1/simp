# SIMP Platform — System Audit V2

**Date:** 16 June 2026  
**Scope:** Full-stack read-only audit (NestJS API + Next.js frontend)  
**Context:** Post–UX/RBAC sprint; fatal Project Team crash hotfixed; network/CORS stabilized  
**Verdict:** **Not MVP-ready for a real construction company.** Core backend engines exist, but the Golden Path is broken at the first offline submit step, several PRD-mandated features are partial or missing, and frontend offline/PWA layers have production-blocking gaps.

---

## Executive Summary

| Area | Grade | One-line verdict |
|------|-------|------------------|
| **Golden Path (WIR → IPC)** | 🔴 **Broken** | Offline WIR submit never enters workflow; IPC billing fields missing from WIR schema |
| **RBAC & Isolation** | 🟡 **Partial** | App-layer scoping is solid for cross-client; audit/lab leaks and backend QA role gaps remain |
| **Frontend stability** | 🟡 **Partial** | Team page crash fixed; sync ordering, photo display, PWA icons still broken |
| **MVP completeness vs BRD** | 🟡 **~55%** | 10/15 standard forms seeded; offline-first, camera anti-fraud, and full financial loop incomplete |

**Stop feature development.** Fix P0 chain-breakers before any new UI work.

---

## A. Golden Path Status

**Target chain:** Submit WIR → Internal QA/QC (Main Contractor) → Consultant map verification → Lab test → IPC generation

### Step-by-step

| # | Step | Status | Evidence |
|---|------|--------|----------|
| 1 | **Submit WIR** | 🔴 **Broken** | `new-form-page-client.tsx` saves `status: 'SUBMITTED'`. Sync upserts that status (`sync.service.ts`). Workflow `submit` only accepts `DRAFT` (`form-workflow.state-machine.ts:112`). `triggerWorkflowSubmit` in `sync-store.ts` catches 400 and **silently clears** the queue flag — forms stall forever. |
| 2 | **Internal QA/QC** | 🟡 **Partial** | Backend + `/dashboard/internal-review` wired. **Only runs when submitter is `SUB_CONTRACTOR`** (`resolveSubmitTransition`). Main Contractor own WIRs skip straight to consultant. Backend does not enforce QA/QC role — any MC user can `approve-internal`. |
| 3 | **Consultant map verification** | 🟡 **Partial** | `/dashboard/approvals` split-pane + Leaflet map from photo GPS (`consultant-command-center.tsx`, `location-verification-map.tsx`). **Display-only** — no verification action, audit event, or approval gate tied to GPS review. WIR `location` is plain text, not `gps_picker`. |
| 4 | **Lab test** | 🟡 **Partial** | Blind barcode path works (`laboratory.service.ts`, `laboratory-page-client.tsx`). `LabTestPanel` only after `APPROVED` — **not sequenced** between consultant review and IPC. Optional; no workflow gate. |
| 5 | **IPC generation** | 🟡 **Partial** | `project-ipc-client.tsx` + `POST /ipc/draft` wired. `extractWirBilling` needs `unitRate`/`lineAmount` in WIR JSONB — **standard WIR template has only `quantityUsed`** (`standard-form-templates.ts`). Draft IPC fails with "no billable amount" on default data. |

### Chain integrity matrix

| Transition | Wired? | Notes |
|------------|--------|-------|
| WIR create → workflow submit | ❌ | `SUBMITTED` vs `DRAFT` mismatch |
| Submit → Internal QA/QC | ⚠️ | Sub-contractor submissions only |
| Internal → Consultant queue | ✅ | When internal step applies |
| Consultant map → approve | ⚠️ | Map advisory; API approve works |
| Approve → Lab | ❌ | Not enforced; lab is post-approval |
| Lab → IPC | ❌ | IPC checks `APPROVED` + unbilled only |
| Approved WIR → IPC draft | ⚠️ | API OK; billing schema gap |

### P0 fixes for Golden Path (ordered)

1. **Align form status:** Offline create as `DRAFT`; call workflow submit after sync (or map `SUBMITTED` → submit transition in state machine).
2. **Add WIR billing fields:** `unitRate`, `unit`, `lineAmount` (or computed) to WIR template + dynamic renderer.
3. **Fix sync order:** Upload form instance before attachments (`sync-store.ts`).
4. **Decide MC QA policy:** Route all MC WIRs through internal review if PRD requires MC QA/QC on own work.

---

## B. RBAC & Isolation Health

### What works (backend-enforced)

- **Cross-client isolation:** Client A cannot list Client B projects (`TenantScopeService.getOrgProjectIds`, `projectWhereForUser`).
- **Access matrix:** Non-admin users only see `ProjectUser`-assigned projects; org admins see all org projects.
- **Client-only operations:** Project create, vendor onboard, portfolio analytics, global search (`assertClientAdmin`).
- **Vendor onboarding secrecy:** `VENDOR_ONBOARD` filtered from MC/consultant/sub audit views.
- **Sub-contractor management:** MC org admin only; password reset requires `subContractorLink`.
- **Lab blind barcode path:** `GET/POST /laboratory/barcode/*` returns anonymous labels only.

### Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| **No Postgres RLS** | High | All isolation is application-layer; one missed `assertProjectAccess` = leak. PRD calls for "RLS equivalent." |
| **Lab audit filter exempt** | High | `LABORATORY` not in `restrictedOrgTypes` — lab users can query full audit including `VENDOR_ONBOARD` with admin usernames. |
| **Project-wide form visibility** | Medium | Any project participant sees **all** orgs' forms on that project (`form-instances.service.ts` — no `organizationId` filter). Intentional for PMIS collaboration but not strict org silos. |
| **MC internal approval API** | Medium | Any `MAIN_CONTRACTOR` user can approve-internal; QA/QC restriction is **frontend-only** (`internal-review-access.ts`). |
| **IPC financial exposure** | Medium | All project participants can `GET` IPCs + WIR line-item `data` JSONB. |
| **Audit payloads raw** | Medium | Operational filter hides action types but returns full `previousData`/`newData` snapshots. |
| **IPC sub rollup** | Medium | PRD says sub data rolls up to MC; `eligibleWirWhere()` scopes to `user.organizationId` — MC cannot aggregate sub WIRs into MC IPC. |
| **Frontend workspace gates** | Low | `workspace.ts` path allowlists bypassable via direct API (expected). |

### Independence Law scorecard

| Question | Answer |
|----------|--------|
| Can contractors see client vendor passwords? | **No** (password not in audit; onboard client-only) |
| Can contractors see vendor onboarding events? | **Filtered** in audit for MC/consultant/sub |
| Can lab see client onboarding via audit? | **Yes** — gap |
| Can contractors see what they need operationally? | **Mostly yes** — forms, team, IPC, internal review (after fixes) |
| Can contractors see other clients? | **No** |

---

## C. Frontend Bugs & Missing Pieces

### Fixed this session

| Issue | Fix |
|-------|-----|
| `dedupeManagedSubContractors is not a function` on `/projects/[id]/team` | Deduplication moved inline to `project-team-client.tsx` (export existed but bundler/runtime failed to resolve) |

### P0 — Production blockers

| # | Issue | Location |
|---|-------|----------|
| 1 | **WIR workflow never starts** (status mismatch) | `new-form-page-client.tsx:172`, `sync-store.ts`, `form-workflow.state-machine.ts` |
| 2 | **Sync uploads photos before form exists** | `sync-store.ts` — `uploadPendingFiles` before `pushPendingSyncActions` |
| 3 | **No photo display in UI** — attachments have `storageKey` only, no URL fetch | `form-data-display.tsx`, `uploads.ts` |
| 4 | **PWA icons missing** — `sw.js` precache 404s `/icon-192.png`, `/icon-512.png` | `public/manifest.json`, `public/sw.js` |
| 5 | **Offline templates not read from Dexie** — always API fetch | `new-form-page-client.tsx` |

### P1 — High priority

| # | Issue | Location |
|---|-------|----------|
| 6 | Watermark uses **org name**, not project name | `new-form-page-client.tsx:120` |
| 7 | `/dashboard/sync` is dev sandbox, not user queue — post-submit redirect lands here | `sync/page.tsx`, `nav-profiles.ts` |
| 8 | Gallery not blocked on desktop (`capture=environment` only) | `smart-camera-input.tsx` |
| 9 | Blank loading states (`return null`) | `project-forms-page-client.tsx`, forms/new `page.tsx` |
| 10 | `useSyncStorePending` subscription leak | `role-dashboards.tsx:372-381` |

### P2 — Dead code / incomplete

| Item | Notes |
|------|-------|
| `role-dashboards.tsx` (Consultant/Contractor/Laboratory dashboards) | Never imported; superseded by command center / tasks hub |
| `dashboard-shell.tsx`, `app-sidebar.tsx`, `nav-config.ts` | Legacy; unused |
| `/dashboard/forms` route | Duplicate of `/dashboard/tasks`; not in workspace allowlist |
| Dexie `syncMeta`, `FILE_ATTACHMENT_LINK` | Defined, never used |
| System settings / super-admin settings | Placeholder or reuses tenant settings page |
| No online `POST /forms/instances` client | All creation is sync-path only |
| No form edit UI | Cannot recover stuck forms |

### Missing exports / import health

- **No broken `@/` imports** found in static scan; frontend `npm run build` passes.
- Runtime export failures (like `dedupeManagedSubContractors`) should be avoided by keeping utility logic colocated with consumers until barrel exports are stable.

---

## D. What Is Left for MVP

Based on `SIMP_MASTER_PRD.md` and `SIMP_FRONTEND_PRD.md`.

### 15 Standard Forms Matrix

| Form | Backend seed | Frontend renderer | In Golden Path |
|------|-------------|-------------------|----------------|
| MAR | ✅ | ✅ | Materials chain |
| MIR | ✅ | ✅ | Materials chain |
| MDR | ✅ | ✅ | Materials chain |
| SDS | ❌ | — | Missing |
| MSS | ❌ | — | Missing |
| WIR | ✅ | ✅ | **Broken submit** |
| NCR | ✅ | ✅ | — |
| SOR | ❌ | — | Missing |
| RFI | ✅ | ✅ | — |
| CVI | ✅ | ✅ | — |
| DPR | ❌ | — | Missing |
| VO | ✅ | ✅ | — |
| IPC | N/A (financial entity) | ✅ wizard | **Billing gap** |
| AS_BUILT | ❌ | — | Missing |
| PTW | ✅ | ✅ | — |
| IR (HSE) | ✅ | ✅ | — |

**5 of 15 form types not seeded** (SDS, MSS, SOR, DPR, AS_BUILT).

### PRD capability checklist

| Capability | Status | Gap |
|------------|--------|-----|
| Multi-tenancy + JWT auth | ✅ | No DB RLS |
| Bilingual AR/EN + RTL | ✅ | — |
| Org hierarchy (Client → vendors → subs) | ✅ | — |
| Project access matrix | ✅ | — |
| JSONB dynamic forms | ✅ | 5 forms missing |
| Internal + external approvals | ⚠️ | Status bug; MC QA routing |
| SLA auto-escalation | ✅ backend | UI badges only |
| Immutable audit log | ✅ | Lab filter gap |
| Material reconciliation + red flag | ✅ backend | UI warning modal partial |
| IPC auto-draft from approved WIRs | ⚠️ | Billing fields; chain broken |
| Lab blind testing | ⚠️ | Barcode path only |
| Offline-first PWA (Dexie) | ⚠️ | Template offline, sync order, icons |
| Live camera only + compression | ⚠️ | Desktop gallery bypass |
| Canvas watermark | ⚠️ | Wrong project name |
| GPS on photos + consultant map | ⚠️ | Display only |
| PDF exports (form + IPC) | ✅ | — |
| Client portfolio dashboard | ✅ | — |
| Consultant command center | ✅ | — |
| Contractor field PWA | ⚠️ | Sync sandbox UX |
| Super-admin platform console | ✅ | — |
| Background sync / service worker | ⚠️ | Broken precache |
| Conflict resolution → audit | ✅ backend | — |
| Time spoofing detection | ✅ backend | — |
| Dynamic form builder (admin UI) | ❌ | Templates seeded via API only |
| Notifications / email | ❌ | Not in codebase |
| Mobile installability (PWA manifest) | ⚠️ | Missing icons |

### MVP definition (minimum to hand to a construction company)

**Must-have before pilot:**

1. ✅ Fix WIR submit → approval chain (P0)
2. ✅ Fix sync pipeline (order, templates offline, photo URLs)
3. ✅ WIR billing fields → IPC draft works end-to-end
4. ✅ PWA icons + service worker stable
5. ✅ Photo verification actually shows images
6. ✅ Lab audit isolation fix
7. ⚠️ At least MAR → MIR → WIR → Consultant approve → IPC demonstrated on one project with real users
8. ⚠️ Field engineer can submit WIR offline and see it in consultant queue within 5 minutes of sync

**Should-have for credible pilot:**

- Remaining 5 standard forms (or explicit scope cut with client sign-off)
- MC QA/QC on own submissions (if required by contract)
- Backend QA role enforcement
- Real sync status UI (replace dev sandbox)
- Draft vs submit UX
- Form edit / resubmit for rejected forms

**Can defer post-pilot:**

- Dynamic form builder admin UI
- Email/push notifications
- Postgres RLS (if app-layer audit passes penetration test)
- Map verification as approval gate
- Lab as mandatory workflow step
- AS_BUILT, DPR, SDS, MSS, SOR (unless contract requires)

---

## Recommended Sprint Order (Stabilization Only)

| Sprint | Focus | Est. effort |
|--------|-------|-------------|
| **S0 Hotfix** | Team page crash ✅ | Done |
| **S1 Chain** | DRAFT/SUBMITTED fix, sync order, WIR billing fields | 2–3 days |
| **S2 Field** | Photo URLs, watermark project name, template offline read, PWA icons | 2 days |
| **S3 Hardening** | Lab audit filter, MC QA backend guard, remove sync sandbox redirect | 1–2 days |
| **S4 E2E** | One full Golden Path UAT script + fix regressions | 2 days |

**Do not start Sprint 6+ features until S1–S4 pass scripted UAT.**

---

## Appendix: Key File Index

| Topic | Path |
|-------|------|
| Tenant scoping | `src/common/services/tenant-scope.service.ts` |
| Audit secrecy filter | `src/modules/audit-log/audit-log-query.service.ts` |
| Workflow state machine | `src/modules/workflows/domain/form-workflow.state-machine.ts` |
| WIR template | `src/modules/forms/standard-form-templates.ts` |
| IPC billing extract | `src/modules/financial/wir-billing.extractor.ts` |
| Offline sync | `frontend/src/stores/sync-store.ts` |
| New form (field) | `frontend/src/components/forms/new-form-page-client.tsx` |
| Consultant approvals | `frontend/src/components/dashboard/consultant-command-center.tsx` |
| Project team (hotfixed) | `frontend/src/components/projects/project-team-client.tsx` |
| CORS / API boot | `src/main.ts` |

---

*This audit is read-only analysis. No new features were added beyond the Project Team hotfix.*
