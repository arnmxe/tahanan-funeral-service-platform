import type { UserRole } from "@/db/schema";

export const FUNERAL_HOME_INFO = {
  name: "Tahanan ng Kapayapaan Memorial Chapels & Crematory",
  shortName: "Tahanan ng Kapayapaan",
  city: "Quezon City, Metro Manila, Philippines",
  address: "148 Scout Reyes Avenue, Brgy. Paligsahan, Quezon City, 1103 Metro Manila",
  supportEmail: "care@kapayapaanmemorial.ph",
  dpoEmail: "privacy.dpo@kapayapaanmemorial.ph",
  visitingHours: "Chapels open 24 hours daily • Arrangement Desk 7:00 AM – 9:00 PM",
  dpaRegistration: "NPC Compliance Reference: PIC-2026-TKP-010173 (RA 10173)",
};

export const WORKFLOW_STAGES = [
  { stage: 1, key: "inquiry", en: "Inquiry", fil: "Pagtatanong" },
  { stage: 2, key: "package", en: "Package & Add-Ons", fil: "Pagpili ng Serbisyo" },
  { stage: 3, key: "deceased", en: "Deceased & Family Details", fil: "Detalye ng Yumao at Pamilya" },
  { stage: 4, key: "schedule", en: "Wake, Chapel & Schedule", fil: "Iskedyul ng Burol at Libing" },
  { stage: 5, key: "documents", en: "Upload Documents", fil: "Pagpasa ng Dokumento" },
  { stage: 6, key: "quotation", en: "Quotation Issued", fil: "Opisyal na Quotation" },
  { stage: 7, key: "approval", en: "Client Approval", fil: "Pag-sang-ayon ng Pamilya" },
  { stage: 8, key: "downpayment", en: "Down Payment", fil: "Paunang Bayad" },
  { stage: 9, key: "coordination", en: "Service Coordination", fil: "Koordinasyon ng Serbisyo" },
  { stage: 10, key: "full_payment", en: "Full Payment", fil: "Buong Kabayaran" },
  { stage: 11, key: "completed", en: "Completed", fil: "Tapos na Serbisyo" },
] as const;

export interface RoleMetadata {
  role: UserRole;
  titleEn: string;
  titleFil: string;
  badgeColor: string;
  summary: string;
  capabilities: string[];
  restrictions: string[];
  demoEmail: string;
  demoPassword: string;
}

export const ROLE_DIRECTORY: Record<UserRole, RoleMetadata> = {
  client: {
    role: "client",
    titleEn: "Family / Client",
    titleFil: "Pamilya / Kliyente",
    badgeColor: "bg-[#183B35]/10 text-[#183B35] border border-[#183B35]/25",
    summary:
      "Arranges memorial services calmly at their own pace, saves drafts, uploads civil documents, approves itemized quotations, pays online in PayMongo test mode, and controls memorial privacy.",
    capabilities: [
      "Create step-by-step bookings and save drafts anytime",
      "Upload required civil & medical documents to private storage",
      "Review and approve itemized quotations & download PDF copies",
      "Pay down payments, installments, or full balance via PayMongo Test Mode",
      "Download official Acknowledgment Receipts and control private Memorial sharing",
      "Send web messages to an assigned Coordinator (zero phone pressure)",
    ],
    restrictions: [
      "Can only view and modify their own family bookings and documents",
      "Cannot view internal staff notes, inventory stock levels, or other families",
    ],
    demoEmail: "maria.santos@example.ph",
    demoPassword: "DemoClient2026!",
  },
  coordinator: {
    role: "coordinator",
    titleEn: "Service Coordinator",
    titleFil: "Tagapag-ugnay ng Serbisyo",
    badgeColor: "bg-[#D9C7A5]/35 text-[#242522] border border-[#B7A99A]/60",
    summary:
      "Guides assigned families through arrangements, verifies uploaded documents, prepares itemized quotations, coordinates chapels/vehicles/staff without double-booking, and records walk-in cash payments.",
    capabilities: [
      "Manage assigned cases, timelines, checklists, and internal coordination notes",
      "Review uploaded documents (Pending / Verified / Needs Revision)",
      "Prepare and update itemized quotations and issue invoices",
      "Schedule chapels, vehicles, and drivers/staff with overlap protection",
      "Manually record walk-in cash or bank payments with Acknowledgment Receipts",
      "Respond to online Family Coordinator Messages",
    ],
    restrictions: [
      "Cannot delete system users, alter required global policies, or modify audit logs",
    ],
    demoEmail: "elena.reyes@kapayapaan.ph",
    demoPassword: "DemoCoord2026!",
  },
  staff: {
    role: "staff",
    titleEn: "Driver / Chapel Staff",
    titleFil: "Driver / Kawani sa Kapilya",
    badgeColor: "bg-[#EFE8DC] text-[#183B35] border border-[#B7A99A]/60",
    summary:
      "Views assigned ceremonial transfers, chapel preparations, crematory slots, and interment schedules, updating task readiness in real time.",
    capabilities: [
      "View personal and unit operational calendar (transfers, wake setup, interments)",
      "Update assigned task statuses (Scheduled → In Progress → Completed)",
      "Add operational field readiness notes for coordinators",
      "Inspect chapel and ceremonial vehicle availability without double-booking",
    ],
    restrictions: [
      "Cannot view private family financial balances, civil ID uploads, or admin revenue",
    ],
    demoEmail: "ramon.cruz@kapayapaan.ph",
    demoPassword: "DemoStaff2026!",
  },
  admin: {
    role: "admin",
    titleEn: "Admin / Funeral Home Owner",
    titleFil: "Tagapamahala / May-ari",
    badgeColor: "bg-[#183B35] text-[#F6F1E8] border border-[#183B35]",
    summary:
      "Oversees packages, casket/urn inventory, chapel & vehicle resources, editable document requirements, user accounts, financial/booking reports, CSV/PDF exports, and RA 10173 audit logs.",
    capabilities: [
      "Full management of packages, add-ons, caskets/urns inventory, and chapels/vehicles",
      "Edit the required document list (add, toggle required/optional, update applicability)",
      "Manage user roles, coordinator assignments, and all case workflows",
      "View revenue, outstanding balances, and package breakdown reports",
      "Export financial & booking reports to CSV and printable PDF",
      "Inspect immutable RA 10173 security and transaction audit logs",
    ],
    restrictions: [
      "Audit logs are append-only and never store raw payment card numbers",
    ],
    demoEmail: "antonio.magsaysay@kapayapaan.ph",
    demoPassword: "DemoAdmin2026!",
  },
  readme: {
    role: "readme",
    titleEn: "README / System Auditor (Read-Only)",
    titleFil: "README / Tagasuri (Read-Only)",
    badgeColor: "bg-[#242522] text-[#D9C7A5] border border-[#242522]",
    summary:
      "Dedicated read-only documentation & compliance observer role. Explores architecture, role matrix, live database workflows, schedules, and reports safely without altering any family records.",
    capabilities: [
      "Access interactive System README, Architecture Guide, and Role Permission Matrix",
      "Inspect sample case dashboards, availability calendars, and financial reports in read-only mode",
      "Verify RA 10173 privacy safeguards, PayMongo Test Mode flow, and no-phone policy compliance",
    ],
    restrictions: [
      "Strictly enforced server-side Read-Only mode: cannot create, edit, or delete any database records",
      "Sensitive private civil document downloads remain masked for data privacy",
    ],
    demoEmail: "readme@kapayapaan.ph",
    demoPassword: "DemoReadme2026!",
  },
};

export function formatPhp(amount: number | null | undefined): string {
  const safe = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export const PRIVACY_NOTICE_EN =
  "In compliance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), Tahanan ng Kapayapaan Memorial Chapels & Crematory collects personal data of the deceased and next-of-kin solely for civil registration, burial/cremation permits, chapel coordination, and official billing. Uploaded civil documents are stored in private access-controlled storage, payment card details are never stored on our servers, and no unsolicited marketing or phone calls are ever made.";

export const PRIVACY_NOTICE_FIL =
  "Alinsunod sa Data Privacy Act of 2012 (RA 10173), ang Tahanan ng Kapayapaan ay nangongolekta lamang ng impormasyon ng yumao at pamilya para sa rehistrasyon sibil, permit sa libing o kremasyon, iskedyul ng kapilya, at malinaw na resibo. Ligtas at pribado ang mga dokumento, walang itinatagong detalye ng card, at walang anumang pamimilit.";
