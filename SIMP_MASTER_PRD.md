SIMP_MASTER_PRD.md
# SIMP (Smart Infrastructure Management Platform) - Master PRD & Architecture Guide (v3.0)

## 1. Core Philosophy & Strict Anti-Fraud Constraints
- **Objective:** B2B Enterprise SaaS PMIS for infrastructure. Eliminates delays, financial fraud, and blame-shifting.
- **Language:** Fully Bilingual (Arabic / English). UI and Form Schemas must support seamless switching.
- **Strict Anti-Fraud Measures:**
  - **Live Camera STRICT:** PWA must FORCE the native device camera for site photos. Uploads from the Gallery/Camera Roll are STRICTLY FORBIDDEN.
  - **Auto-Compression:** Photos must be auto-compressed (< 1MB) on the client-side before upload to save bandwidth in poor network areas.
  - **Time Integrity:** Offline submissions capture `device_timestamp`. On sync, log `server_sync_timestamp`. Huge deltas trigger a "Time Spoofing" red flag.

## 2. Multi-Tenancy, Hierarchy & Sub-Contractors
- **Architecture:** PostgreSQL with strict tenant-scoping (RLS equivalent). Client A must NEVER see Client B's data.
- **Hierarchy:** 1. `Client` (Owner) creates the Project.
  2. Client invites `Consultant`, `Main Contractor`, and `Laboratory` (Orgs, not individual users).
  3. `Main Contractor` can invite `Sub-contractors`. Sub-contractor data rolls up to the Main Contractor.
- **Users:** Org Admins manage their own users and assign them to projects.

## 3. Offline-First & Sync Hell Resolution
- **Architecture:** Local-First PWA (IndexedDB/Dexie.js or Zustand persist) from Day 1.
- **Conflict Resolution (CRITICAL):** Use `Last-Write-Wins` based on UUIDs if two users edit the same offline record. HOWEVER, the overwritten data MUST NOT be deleted; it must be silently saved into the `Immutable Audit Log` so no data is ever lost.

## 4. Core Software Engines
1. **Dynamic Form Builder (JSONB):** Do NOT use classic EAV tables. Use PostgreSQL `JSONB` columns for form fields to ensure extreme high performance and scalability. *Every form must have a "Comments/Notes" base field.*
2. **Approval Engine:** Supports Internal Approvals (e.g., Sub-contractor Site Eng -> Main Contractor QA/QC) BEFORE External Approvals (-> Consultant).
3. **SLA & Auto-Escalation:** Timers on workflows (e.g., 48hrs). Breaches auto-escalate to the Client.
4. **Immutable Audit Log:** Track who, what, when, IP. No hard deletes (Soft deletes only).

## 5. The 15 Standardized Forms Matrix
The JSONB Form Engine must support these exact flows:
- **Materials:** MAR (Approval) -> MIR (Inspection/Delivery) -> MDR (Material Damage/Wastage).
- **Engineering:** SDS (Shop Drawings) -> MSS (Method Statement).
- **Execution:** WIR (Work Inspection) -> NCR (Non-Conformance) -> SOR (Site Observation).
- **Communication:** RFI (Info Request) -> CVI (Verbal Instruction Confirmation).
- **Admin/Financial:** DPR (Daily Progress) -> VO (Variation Order) -> **IPC (Interim Payment Certificate)** -> As-Built.
- **HSE:** PTW (Permit to Work) -> IR (Incident Report).

## 6. Smart Liability Transfer (Materials) & IPC Generation
- **Material Reconciliation:** - `MIR` creates an inventory balance. `WIR` and `MDR` deduct from it.
  - If a WIR quantity exceeds the MIR balance, DO NOT hard-block. Allow submission but attach a **CRITICAL RED FLAG**. Liability shifts to the Consultant to investigate/reject.
- **Financial Motivation (IPC):**
  - Contractors will love the system because it auto-generates draft **IPCs (Interim Payment Certificates)** based purely on `WIRs` that are marked as "Approved". No approved WIR = No Money.

## 7. Execution Roadmap (Sprint by Sprint)
- **Sprint 1 (Foundation):** NestJS + Prisma + PostgreSQL. Multi-tenancy Orgs, Users, Projects, Auth (JWT). Tenant-scoping logic.
- **Sprint 2 (Offline & Forms):** IndexedDB/PWA setup. JSONB Dynamic Form Engine. Secure Camera-only file uploads.
- **Sprint 3 (Workflows):** Internal/External Approvals, SLAs, Material Reconciliation Logic.
- **Sprint 4 (Financial & Lab):** IPC auto-generation, Lab Module (Blind testing via barcodes).
- **Sprint 5 (Analytics & Polish):** Client Dashboards, Search, PDF Exports, Audit Logs.