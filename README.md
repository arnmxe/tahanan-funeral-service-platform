# Tahanan ng Kapayapaan — Funeral Service Coordination, Online Booking, Scheduling & Payment Platform

**Client Identity:** Tahanan ng Kapayapaan Memorial Chapels & Crematory — Quezon City, Metro Manila, Philippines  
**Compliance:** Philippine Data Privacy Act of 2012 (Republic Act No. 10173) • WCAG 2.1 AA Accessible Contrast • Bilingual (English & Filipino)

---

## 1. Explicit Architectural Assumptions

1. **Runtime Stack:** Implemented as a complete, production-built full-stack application on **Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL (Drizzle ORM)** with HMAC-signed HTTP-only session cookies, server-enforced Role-Based Access Control (RBAC), and row-level family isolation.
2. **Strict No-Phone Policy:** Per explicit specification (*"NO PHONE FEATURES"*), all `tel:` links, phone dialers, SMS/OTP flows, and phone number input fields have been omitted across the database, UI, and sample data. Instead, a calm, persistent **"Message a Coordinator"** online web support drawer and written email coordination channel (`care@kapayapaanmemorial.ph`) are available on every screen.
3. **5th Role Added (`readme` — Read-Only System Auditor & Guide):** Alongside the four operational roles (`client`, `coordinator`, `staff`, `admin`), a dedicated **`readme`** role (`readme@kapayapaan.ph`) and interactive **README & Roles** workspace are built in. Server-side guards block any `POST`/`PATCH`/`DELETE` mutations from the `readme` role while allowing safe read-only inspection of workflows, schedules, and financial/audit reports.
4. **PayMongo in TEST MODE Only (Server-Side Verified):** Payment sessions (`GCash Test`, `Maya Test`, `Card Test`) are created and cryptographically verified server-side in `/api/payments` using HMAC signatures (`sk_test_*` compatible; live keys are explicitly rejected). Zero card numbers or secret keys are ever stored in PostgreSQL or exposed to the frontend. Every online or manually recorded desk payment issues a downloadable **Acknowledgment Receipt** (`AR-2026-xxxx`) and reconciles booking/invoice balances immediately.
5. **Anti-Pressure UX:** No countdown timers, pop-up promotions, or pushy upselling exist anywhere in the platform. Memorial pages are **private by default**, with sharing controlled by the family representative.
6. **Luxury Hospitality & Modern Editorial Visual Identity:**
   - **Palette:** Deep Forest Green (`#183B35`), Warm Ivory (`#F6F1E8`), Champagne Gold (`#D9C7A5`), Muted Taupe (`#B7A99A`), and Charcoal (`#242522`), accented with subtle warm linen background textures.
   - **Typography:** `Playfair Display` for large editorial headings, `DM Sans` for body text and navigation, and `Manrope` (`tabular-nums`) for highly readable PHP prices, down payments, and financial statements.
   - **Editorial Architecture:** Split-screen sanctuary hero with floating estimator card, full interactive 4-package financial estimator (*Payapa*, *Gunita*, *Liwanag*, *Tahimik*), 5 photographic Service Category cards, an 11-step service timeline with thin-stroke line icons, interactive Platform Architecture dossier, and a 5-pillar Trust & Transparency charter.

---

## 2. User Roles & Demo Credentials (5 Roles)

You can switch between any of these accounts in **1 click** using **"Switch Demo Role (5 Roles)"** in the top bar, or sign in with email and password:

| Role | Title | Demo Email | Demo Password | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **`client`** | Family / Client | `maria.santos@example.ph` | `DemoClient2026!` | Books services step-by-step (with Save as Draft), uploads private civil documents, approves itemized quotations, pays via PayMongo TEST MODE, downloads PDF Acknowledgment Receipts, and controls Memorial privacy. |
| **`coordinator`** | Service Coordinator | `elena.reyes@kapayapaan.ph` | `DemoCoord2026!` | Manages assigned cases, verifies documents (`Pending` / `Verified` / `Needs Revision`), updates quotations, schedules chapels/vehicles/staff without double-booking, records desk cash payments, and replies to family messages. |
| **`staff`** | Driver / Chapel Staff | `ramon.cruz@kapayapaan.ph` | `DemoStaff2026!` | Views assigned ceremonial transfers, chapel preparations, and interment schedules; updates task status (`Scheduled` → `In Progress` → `Completed`) and field notes. |
| **`admin`** | Admin / Owner | `antonio.magsaysay@kapayapaan.ph` | `DemoAdmin2026!` | Manages packages, casket/urn inventory, chapels/vehicles, **editable required document list**, user roles, revenue/booking reports, CSV/PDF exports, and RA 10173 audit logs. |
| **`readme`** | README / System Auditor | `readme@kapayapaan.ph` | `DemoReadme2026!` | Strictly enforced **Read-Only** observer role with interactive system documentation, permission matrix, and non-destructive inspection of cases, schedules, and executive reports. |

---

## 3. PostgreSQL Schema (`src/db/schema.ts`)

All required tables are implemented and seeded idempotently on first boot (`src/lib/seed.ts`):
- `users`, `packages`, `add_ons`, `inventory`, `resources`, `document_requirements`
- `bookings`, `deceased_records`, `documents`, `schedules`
- `quotations`, `invoices`, `payments`
- `notifications`, `memorials`, `audit_logs`, `coordinator_messages`

---

## 4. End-to-End Verification Flow

1. **Client Flow:** Switch to `maria.santos@example.ph` → Open Case `TKP-2026-1001` (or create a new booking / draft in **Book Service**) → Upload a document or sample scan in **Civil Documents** → Open **Quotation & Payments** → Click **Approve Quotation** → Click **Pay via PayMongo (TEST MODE)** → Authorize test payment → Verify balance updates immediately and download the **Acknowledgment Receipt PDF**.
2. **Staff Schedule Flow:** Switch to `ramon.cruz@kapayapaan.ph` → Inspect assigned transfers and processions → Update a task to **In Progress** or **Completed**.
3. **Coordinator & Admin Flow:** Switch to `elena.reyes@kapayapaan.ph` or `antonio.magsaysay@kapayapaan.ph` → Verify uploaded documents, test anti-double-booking facility scheduling, edit the required civil document list, and export CSV / PDF financial reports.
