SIMP_FRONTEND_PRD.md
# SIMP (Smart Infrastructure Management Platform) - Frontend Master PRD

## 1. Core Philosophy & Tech Stack
- **Objective:** Build the ultimate Enterprise PWA (Progressive Web App) for construction management.
- **Tech Stack:** `Next.js` (App Router, React), `Tailwind CSS` (native RTL support), `Zustand` (global state), `Dexie.js / IndexedDB` (offline database), `browser-image-compression` (client-side compression), and `Shadcn UI` (accessible components).
- **Language & RTL:** Native Bilingual (English/Arabic). The UI must dynamically flip (RTL/LTR) based on the locale without reloading.

## 2. The Two Faces of SIMP (UX Strategy)
1. **The Field View (Mobile-First PWA for Contractors):**
   - Extremely simple, large touch targets, high contrast. "Simpler than WhatsApp."
   - Focus: Open form, take photo, input quantity, submit.
   - Persistent "Sync Status" indicator (Online/Offline/Syncing).
2. **The Command Center (Desktop-First for Consultants/Clients):**
   - Dense information architecture, split-pane views (List on left, details on right).
   - Interactive Dashboards, Map views (for GPS pin verification), and Financial ledgers.

## 3. The Smart Camera Engine (Anti-Fraud UI) - CRITICAL
- **Live Camera Only:** Form photo fields MUST trigger the native device camera (`capture="environment"` attribute). File picking from the gallery is hidden/disabled.
- **Client-Side Compression:** Images must be compressed to `< 1MB` instantly before storing offline or uploading.
- **The Visual Watermark (Canvas API):** Before saving the image, the frontend must use the HTML Canvas API to draw a semi-transparent black bar at the bottom and overlay text: `Project Name | Date & Time | GPS Coordinates (Lat, Lng) | User Name`.
- **EXIF Tagging:** The original GPS and Time metadata must be sent to the backend.

## 4. Offline-First Sync Manager
- **Local Database (Dexie.js):** All forms, schemas, and pending submissions live in IndexedDB.
- **Last-Write-Wins UUIDs:** Every action generates a UUID locally before hitting the server.
- **Sync Queue:** A background service worker (or background sync hook) that monitors connectivity. When online, it pushes the batch to `/api/v1/sync`. If an image upload fails mid-way, it retries automatically.

## 5. Dynamic Form Renderer (JSONB to UI)
- The UI must dynamically generate inputs based on the `FormTemplate` JSON schema fetched from the backend.
- Support for Field types: Text, Number, Dropdown (e.g., selecting approved MIRs), Camera Photo, GPS Location.
- **Material Reconciliation UI:** When selecting an MIR for a WIR, show the "Available Balance". If the user enters a quantity > balance, show a **Yellow Warning Modal** ("Quantity exceeds approved balance. Proceeding will flag this for Consultant review."). Do not block, but make the consequence visually clear.

## 6. Financial (IPC) & Laboratory UI
- **IPC Generator:** A dedicated screen for Contractors. A single button "Generate Draft IPC" fetches all unbilled approved WIRs and renders a beautiful invoice preview table.
- **Blind Lab Portal:** A minimalist screen where a Lab Tech enters ONLY a barcode. The UI returns the required test fields. No project or contractor names are rendered.

## 7. Frontend Execution Roadmap (Cursor Sprints)
- **Sprint 6 (UI Foundation):** Next.js setup, Tailwind RTL/LTR config, Shadcn UI init, Auth screens (JWT integration), and Routing shell.
- **Sprint 7 (Offline & Camera):** Dexie.js local DB, Sync Queue state, Smart Camera module (Compression + Canvas Watermark).
- **Sprint 8 (Dynamic Forms):** The JSON to React renderer. WIR/MIR interfaces, Offline saving, Material red-flag UI.
- **Sprint 9 (Consultant/Client Dashboards):** Data tables, Maps integration for photos, Approval workflows, IPC view, PDF download buttons.