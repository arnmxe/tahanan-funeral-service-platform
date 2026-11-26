"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  CreditCard,
  Printer,
  ShieldCheck,
  Plus,
  Lock,
  Unlock,
  Calendar,
  Truck,
  AlertCircle,
  X,
  Search,
  Compass,
} from "lucide-react";
import type {
  DocumentRequirementItem,
  EnrichedBooking,
  Language,
  PortalUser,
  ResourceItem,
  ScheduleItem,
  StaffMemberInfo,
} from "@/types/portal";
import { WORKFLOW_STAGES, formatPhp } from "@/lib/constants";
import {
  printAcknowledgmentReceiptPdf,
  printQuotationAndInvoicePdf,
} from "@/lib/pdfPrint";

interface CaseDashboardProps {
  lang: Language;
  user: PortalUser;
  bookings: EnrichedBooking[];
  schedules: ScheduleItem[];
  resources: ResourceItem[];
  staffDirectory: StaffMemberInfo[];
  documentRequirements: DocumentRequirementItem[];
  selectedBookingId: number | null;
  onSelectBookingId: (id: number) => void;
  onNavigateToWizard: () => void;
  onRefreshAll: () => Promise<void>;
}

export function CaseDashboard({
  lang,
  user,
  bookings,
  schedules,
  resources,
  staffDirectory,
  documentRequirements,
  selectedBookingId,
  onSelectBookingId,
  onNavigateToWizard,
  onRefreshAll,
}: CaseDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "documents" | "payments" | "memorial"
  >("overview");
  const [caseSearch, setCaseSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState<"mine" | "all">("mine");
  const [staffSearch, setStaffSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Notes & Checklist state
  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(false);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");

  // Coordinator Schedule creation state
  const [schedTitle, setSchedTitle] = useState("");
  const [schedType, setSchedType] = useState("transfer");
  const [schedResourceId, setSchedResourceId] = useState<string>("");
  const [schedStaffId, setSchedStaffId] = useState<string>("");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [schedLocation, setSchedLocation] = useState("");

  // Document preview & review state
  const [previewDoc, setPreviewDoc] = useState<{
    fileName: string;
    label: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [reviewNotesById, setReviewNotesById] = useState<Record<number, string>>({});

  // Quotation adjustment state (Coordinator/Admin)
  const [customLineDesc, setCustomLineDesc] = useState("");
  const [customLinePrice, setCustomLinePrice] = useState("");
  const [discountPhpInput, setDiscountPhpInput] = useState("");
  const [discountLabelInput, setDiscountLabelInput] = useState("");

  // PayMongo TEST MODE modal state
  const [pmModalOpen, setPmModalOpen] = useState(false);
  const [pmStage, setPmStage] = useState<"downpayment" | "installment" | "full_balance">(
    "downpayment"
  );
  const [pmMethod, setPmMethod] = useState<string>("paymongo_gcash_test");
  const [pmAmountInput, setPmAmountInput] = useState<string>("");
  const [pmSession, setPmSession] = useState<{
    sessionId: string;
    signatureHash: string;
    amountPhp: number;
    method: string;
    paymentStage: string;
    bookingRef: string;
  } | null>(null);

  // Manual Cash state (Coordinator/Admin)
  const [manualAmount, setManualAmount] = useState("");
  const [manualMethod, setManualMethod] = useState("manual_cash");
  const [manualNotes, setManualNotes] = useState("");

  // Memorial privacy edit state
  const [obituaryDraft, setObituaryDraft] = useState<string | null>(null);
  const [shareCodeDraft, setShareCodeDraft] = useState<string | null>(null);

  // Staff operational task notes
  const [staffTaskNotes, setStaffTaskNotes] = useState<Record<number, string>>({});

  const filteredBookings = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      `${b.referenceCode} ${b.deceased?.fullName || ""} ${b.contactPersonName} ${
        b.status
      }`
        .toLowerCase()
        .includes(q)
    );
  }, [bookings, caseSearch]);

  const activeBooking = useMemo(() => {
    const pool = filteredBookings.length ? filteredBookings : bookings;
    if (!pool.length) return null;
    return (
      pool.find((b) => b.id === selectedBookingId) ||
      pool.find((b) => b.status !== "draft") ||
      pool[0]
    );
  }, [bookings, filteredBookings, selectedBookingId]);

  const isReadOnly = user.role === "readme";
  const isCoordOrAdmin = user.role === "coordinator" || user.role === "admin";

  // =========================================================================
  // DRIVER / STAFF DEDICATED OPERATIONAL SCHEDULE VIEW
  // =========================================================================
  if (user.role === "staff") {
    const q = staffSearch.trim().toLowerCase();
    const visibleTasks = schedules.filter((s) => {
      const ownerOk = staffFilter === "mine" ? s.assignedStaffId === user.id : true;
      const searchOk =
        !q ||
        `${s.title} ${s.location} ${s.resourceName} ${s.eventType}`
          .toLowerCase()
          .includes(q);
      return ownerOk && searchOk;
    });

    async function handleTaskUpdate(scheduleId: number, nextStatus: string) {
      setBusy(true);
      setBanner(null);
      try {
        const res = await fetch("/api/schedules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: scheduleId,
            taskStatus: nextStatus,
            notes: staffTaskNotes[scheduleId],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setBanner({ type: "err", text: data.error || "Failed to update task." });
        } else {
          setBanner({
            type: "ok",
            text: `Task marked as "${nextStatus.replace("_", " ")}".`,
          });
          await onRefreshAll();
        }
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#D9C7A5]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
              Sanctuary Operations &amp; Ceremonial Dispatch
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#242522] mt-1">
              {lang === "fil"
                ? "Iskedyul ng Sasakyan at mga Nakatalagang Gawain"
                : "Assigned Transfers, Chapel Setup & Processions"}
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5751] mt-1">
              Signed in as <strong>{user.fullName}</strong> ({user.staffTitle})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5A5751] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search task or location..."
                className="pl-8 pr-3 py-2 border border-[#D9C7A5] bg-[#FBF9F5] text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setStaffFilter("mine")}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border ${
                staffFilter === "mine"
                  ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                  : "bg-[#FBF9F5] border-[#D9C7A5] text-[#242522]"
              }`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setStaffFilter("all")}
              className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border ${
                staffFilter === "all"
                  ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                  : "bg-[#FBF9F5] border-[#D9C7A5] text-[#242522]"
              }`}
            >
              All Sanctuary Schedules
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`p-4 border text-xs sm:text-sm ${
              banner.type === "ok"
                ? "bg-[#183B35]/10 border-[#183B35]/35 text-[#183B35]"
                : "bg-amber-50 border-amber-400 text-amber-950"
            }`}
          >
            {banner.text}
          </div>
        )}

        {visibleTasks.length === 0 ? (
          <div className="bg-[#FBF9F5] p-12 border border-[#D9C7A5] text-center text-xs sm:text-sm text-[#5A5751]">
            No tasks match this filter. Switch to &ldquo;All Sanctuary Schedules&rdquo;
            to inspect chapel &amp; vehicle reservations.
          </div>
        ) : (
          <div className="space-y-5">
            {visibleTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#FBF9F5] p-6 border border-[#D9C7A5] space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 bg-[#183B35] text-[#F6F1E8]">
                        <Truck className="w-3 h-3 text-[#D9C7A5]" />
                        {task.eventType}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 bg-[#EFE8DC] text-[#242522] border border-[#D9C7A5]">
                        {task.resourceName}
                      </span>
                      {task.bookingRef && (
                        <span className="text-xs font-code text-[#5A5751]">
                          {task.bookingRef}
                        </span>
                      )}
                      <span
                        className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 ${
                          task.taskStatus === "completed"
                            ? "bg-[#183B35]/10 text-[#183B35]"
                            : task.taskStatus === "in_progress"
                            ? "bg-[#D9C7A5]/45 text-[#242522]"
                            : "bg-[#EFE8DC] text-[#5A5751]"
                        }`}
                      >
                        {task.taskStatus.replace("_", " ")}
                      </span>
                    </div>
                    <h2 className="text-xl font-display font-medium text-[#242522]">
                      {task.title}
                    </h2>
                    <p className="text-xs text-[#5A5751]">
                      <strong>Location:</strong> {task.location} •{" "}
                      <strong>Assigned:</strong> {task.assignedStaffName}
                    </p>
                  </div>
                  <div className="text-xs font-price text-[#5A5751] md:text-right">
                    <div>Begins: {new Date(task.startTime).toLocaleString()}</div>
                    <div>Concludes: {new Date(task.endTime).toLocaleString()}</div>
                  </div>
                </div>

                {task.notes && (
                  <p className="text-xs bg-[#F6F1E8] p-3.5 border border-[#D9C7A5] text-[#242522]">
                    <strong>Dispatch Note:</strong> {task.notes}
                  </p>
                )}

                <div className="pt-3 border-t border-[#D9C7A5]/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <input
                    type="text"
                    value={staffTaskNotes[task.id] ?? task.notes ?? ""}
                    onChange={(e) =>
                      setStaffTaskNotes((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                    placeholder="Add readiness or dispatch note..."
                    className="flex-1 px-3.5 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleTaskUpdate(task.id, "in_progress")}
                      className="px-3.5 py-2 bg-[#EFE8DC] border border-[#D9C7A5] text-[#242522] text-xs uppercase tracking-wider font-medium hover:border-[#183B35]"
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleTaskUpdate(task.id, "completed")}
                      className="px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
                    >
                      Mark Completed
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // EMPTY STATE IF NO BOOKINGS YET
  // =========================================================================
  if (!activeBooking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-[#FBF9F5] p-12 border border-[#D9C7A5] space-y-5">
          <Compass className="w-9 h-9 text-[#183B35] mx-auto" strokeWidth={1.4} />
          <h1 className="text-3xl font-display font-medium text-[#242522]">
            No Service Arrangements Yet
          </h1>
          <p className="text-sm sm:text-base text-[#5A5751] max-w-md mx-auto">
            Begin a step-by-step memorial service arrangement with 100% itemized PHP
            pricing. You may save a private draft at any time.
          </p>
          <button
            type="button"
            onClick={onNavigateToWizard}
            className="px-6 py-3.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-[0.16em] font-medium hover:bg-[#122D28]"
          >
            Start Step-by-Step Booking
          </button>
        </div>
      </div>
    );
  }

  const currentBooking = activeBooking;
  const latestQuote = currentBooking.quotations[0] || null;
  const applicableDocReqs = documentRequirements.filter(
    (r) =>
      r.active &&
      (r.appliesTo === "all" || r.appliesTo === currentBooking.serviceType)
  );

  // =========================================================================
  // ACTION HANDLERS FOR CASE DASHBOARD
  // =========================================================================
  async function handleCaseAction(payload: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/bookings/${currentBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Action could not be saved." });
      } else {
        setBanner({ type: "ok", text: okMsg });
        await onRefreshAll();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFileUpload(
    reqCode: string,
    reqLabel: string,
    file: File | null,
    useSampleGenerated = false
  ) {
    setBusy(true);
    setBanner(null);
    try {
      let fileName = "sample_civil_scan.svg";
      let mimeType = "image/svg+xml";
      let fileSizeBytes = 1850;
      let dataUrl = "";

      if (useSampleGenerated) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="460"><rect width="700" height="460" fill="#F6F1E8" stroke="#183B35" stroke-width="4"/><rect x="20" y="20" width="660" height="420" fill="none" stroke="#D9C7A5" stroke-width="2"/><text x="350" y="90" font-family="Georgia, serif" font-weight="bold" font-size="20" fill="#183B35" text-anchor="middle">QUEZON CITY CIVIL REGISTRY — CERTIFIED SCAN</text><text x="350" y="140" font-family="Georgia, serif" font-size="18" fill="#242522" text-anchor="middle">${reqLabel}</text><text x="100" y="215" font-family="Arial, sans-serif" font-size="14" fill="#242522">Case Reference: ${currentBooking.referenceCode}</text><text x="100" y="255" font-family="Arial, sans-serif" font-size="14" fill="#242522">Uploaded By: ${user.fullName}</text><text x="100" y="295" font-family="Arial, sans-serif" font-size="13" fill="#5A5751">Timestamp: ${new Date().toISOString()}</text></svg>`;
        dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
        fileName = `${reqCode}_${currentBooking.referenceCode.toLowerCase()}.svg`;
      } else if (file) {
        fileName = file.name;
        mimeType = file.type;
        fileSizeBytes = file.size;
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("File read failed"));
          reader.readAsDataURL(file);
        });
      } else {
        setBusy(false);
        return;
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: currentBooking.id,
          requirementCode: reqCode,
          documentLabel: reqLabel,
          fileName,
          mimeType,
          fileSizeBytes,
          dataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Document upload failed." });
      } else {
        setBanner({
          type: "ok",
          text: `"${reqLabel}" uploaded to private storage (Status: Pending Coordinator Verification).`,
        });
        await onRefreshAll();
      }
    } catch {
      setBanner({ type: "err", text: "Could not read or upload file." });
    } finally {
      setBusy(false);
    }
  }

  async function handlePreviewDocument(docId: number) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/documents/${docId}`);
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Cannot open private document." });
      } else {
        setPreviewDoc({
          fileName: data.fileName,
          label: data.documentLabel,
          mimeType: data.mimeType,
          dataUrl: data.dataUrl,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDocumentReview(docId: number, status: string) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewerNote: reviewNotesById[docId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Failed to update document." });
      } else {
        setBanner({
          type: "ok",
          text: `Document status updated to "${status.replace("_", " ")}".`,
        });
        await onRefreshAll();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: currentBooking.id,
          resourceId: schedResourceId ? Number(schedResourceId) : null,
          assignedStaffId: schedStaffId ? Number(schedStaffId) : null,
          title: schedTitle,
          eventType: schedType,
          startTime: schedStart,
          endTime: schedEnd,
          location: schedLocation || "Tahanan ng Kapayapaan Sanctuary",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Schedule conflict detected." });
      } else {
        setBanner({
          type: "ok",
          text: "Schedule slot verified and added with zero double-booking.",
        });
        setSchedTitle("");
        setSchedStart("");
        setSchedEnd("");
        await onRefreshAll();
      }
    } finally {
      setBusy(false);
    }
  }

  function openPaymongoModal() {
    const suggested =
      currentBooking.amountPaidPhp === 0 && currentBooking.downpaymentRequiredPhp > 0
        ? Math.min(currentBooking.downpaymentRequiredPhp, currentBooking.balancePhp)
        : currentBooking.balancePhp;
    setPmStage(currentBooking.amountPaidPhp === 0 ? "downpayment" : "full_balance");
    setPmAmountInput(String(suggested));
    setPmSession(null);
    setPmModalOpen(true);
  }

  async function handleCreatePaymongoSession() {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_paymongo_session",
          bookingId: currentBooking.id,
          amountPhp: Number(pmAmountInput),
          method: pmMethod,
          paymentStage: pmStage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Cannot initiate checkout." });
        setPmModalOpen(false);
      } else {
        setPmSession(data.testSession);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmPaymongoSession(simulateFailure: boolean) {
    if (!pmSession) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_paymongo_session",
          bookingId: currentBooking.id,
          sessionId: pmSession.sessionId,
          signatureHash: pmSession.signatureHash,
          amountPhp: pmSession.amountPhp,
          method: pmSession.method,
          paymentStage: pmSession.paymentStage,
          simulateFailure,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Payment not confirmed." });
        setPmModalOpen(false);
        setPmSession(null);
      } else {
        setBanner({
          type: "ok",
          text: `PayMongo TEST MODE payment verified server-side! Official Acknowledgment Receipt ${data.payment.receiptNumber} issued and balance updated.`,
        });
        setPmModalOpen(false);
        setPmSession(null);
        await onRefreshAll();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleManualCashRecord(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_manual_payment",
          bookingId: currentBooking.id,
          amountPhp: Number(manualAmount),
          method: manualMethod,
          notes: manualNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Could not record payment." });
      } else {
        setBanner({
          type: "ok",
          text: `Recorded manual payment. Acknowledgment Receipt ${data.payment.receiptNumber} issued.`,
        });
        setManualAmount("");
        setManualNotes("");
        await onRefreshAll();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleMemorialPrivacyUpdate(nextIsPublic?: boolean) {
    if (!currentBooking.memorial) return;
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/memorials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentBooking.memorial.id,
          action: "update_privacy_or_obituary",
          isPublic:
            typeof nextIsPublic === "boolean"
              ? nextIsPublic
              : currentBooking.memorial.isPublic,
          obituaryText:
            obituaryDraft !== null
              ? obituaryDraft
              : currentBooking.memorial.obituaryText,
          familyShareCode:
            shareCodeDraft !== null
              ? shareCodeDraft
              : currentBooking.memorial.familyShareCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "err", text: data.error || "Memorial update failed." });
      } else {
        setBanner({
          type: "ok",
          text: `Memorial settings saved (${
            data.memorial.isPublic ? "Shared Publicly" : "Private — Family Only"
          }).`,
        });
        setObituaryDraft(null);
        setShareCodeDraft(null);
        await onRefreshAll();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-12 space-y-8">
      {/* Top Case Switcher & Search Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#D9C7A5]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            {isReadOnly
              ? "Read-Only Auditor Case Dossier"
              : isCoordOrAdmin
              ? "Service Coordination & Family Case Desk"
              : "Family Arrangement & Financial Folio"}
          </span>
          <div className="flex items-center gap-3 flex-wrap mt-1">
            <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#242522]">
              {currentBooking.deceased?.fullName || "Draft Arrangement"}
            </h1>
            <span className="text-xs font-code px-3 py-1 bg-[#EFE8DC] border border-[#D9C7A5] text-[#183B35] font-semibold">
              {currentBooking.referenceCode}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {bookings.length > 1 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5A5751] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Filter cases..."
                className="pl-8 pr-3 py-2.5 border border-[#D9C7A5] bg-[#FBF9F5] text-xs w-40 sm:w-48"
              />
            </div>
          )}

          <select
            value={currentBooking.id}
            onChange={(e) => {
              onSelectBookingId(Number(e.target.value));
              setObituaryDraft(null);
              setShareCodeDraft(null);
            }}
            aria-label="Select Case"
            className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#FBF9F5] text-xs font-medium text-[#242522]"
          >
            {(filteredBookings.length ? filteredBookings : bookings).map((b) => (
              <option key={b.id} value={b.id}>
                {b.referenceCode} • {b.deceased?.fullName || "Draft"} (
                {b.status.replace(/_/g, " ")})
              </option>
            ))}
          </select>

          {!isReadOnly && (
            <button
              type="button"
              onClick={onNavigateToWizard}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
            >
              <Plus className="w-3.5 h-3.5 text-[#D9C7A5]" />
              New Arrangement
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 border text-xs sm:text-sm flex items-start gap-2.5 ${
            banner.type === "ok"
              ? "bg-[#183B35]/10 border-[#183B35]/35 text-[#183B35]"
              : "bg-amber-50 border-amber-400 text-amber-950"
          }`}
        >
          {banner.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#183B35]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Editorial 11-Step Coordination Timeline */}
      <div className="bg-[#FBF9F5] p-6 border border-[#D9C7A5] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.18em] text-[#5A5751]">
              11-Step Coordination Journey
            </span>
            <span className="px-2.5 py-0.5 bg-[#183B35] text-[#D9C7A5] font-semibold uppercase tracking-wider text-[11px]">
              Stage {String(currentBooking.workflowStage).padStart(2, "0")}/11 •{" "}
              {currentBooking.status.replace(/_/g, " ")}
            </span>
          </div>

          {isCoordOrAdmin && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleCaseAction(
                    {
                      action: "update_stage",
                      status: "in_coordination",
                      workflowStage: 9,
                    },
                    "Case moved to Active Service Coordination."
                  )
                }
                className="px-3.5 py-1.5 bg-[#F6F1E8] border border-[#D9C7A5] text-xs font-medium text-[#242522] hover:border-[#183B35]"
              >
                Set In Coordination
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleCaseAction(
                    { action: "update_stage", status: "completed", workflowStage: 11 },
                    "Service marked Completed."
                  )
                }
                className="px-3.5 py-1.5 bg-[#183B35] text-xs font-medium uppercase tracking-wider text-[#F6F1E8] hover:bg-[#122D28]"
              >
                Mark Completed
              </button>
            </div>
          )}
        </div>

        <div className="w-full h-[3px] bg-[#EFE8DC]">
          <div
            className="h-full bg-[#183B35] transition-all duration-300"
            style={{ width: `${(currentBooking.workflowStage / 11) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2">
          {WORKFLOW_STAGES.map((st) => {
            const reached = currentBooking.workflowStage >= st.stage;
            const current = currentBooking.workflowStage === st.stage;
            return (
              <div
                key={st.stage}
                className={`p-2.5 border text-xs ${
                  current
                    ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35] font-semibold"
                    : reached
                    ? "bg-[#F6F1E8] text-[#242522] border-[#183B35]/40"
                    : "bg-[#FBF9F5] text-[#B7A99A] border-[#D9C7A5]/70"
                }`}
              >
                <div className="font-price text-[10px] opacity-85">
                  {String(st.stage).padStart(2, "0")}
                </div>
                <div className="leading-snug mt-0.5 text-[11px] font-display">
                  {lang === "fil" ? st.fil : st.en}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editorial Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#D9C7A5] pb-3">
        {[
          { key: "overview", label: "Overview & Schedule" },
          {
            key: "documents",
            label: `Civil Documents (${currentBooking.documents.length})`,
          },
          {
            key: "payments",
            label: `Quotation & Payments (Balance: ${formatPhp(
              currentBooking.balancePhp
            )})`,
          },
          { key: "memorial", label: "Memorial & Privacy" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              setActiveSubTab(
                tab.key as "overview" | "documents" | "payments" | "memorial"
              )
            }
            className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium border transition ${
              activeSubTab === tab.key
                ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                : "bg-[#FBF9F5] text-[#242522] border-[#D9C7A5] hover:border-[#183B35]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: OVERVIEW, CHECKLIST, SCHEDULES & NOTES                   */}
      {/* =================================================================== */}
      {activeSubTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {/* Case Summary Card */}
            <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                Arrangement &amp; Sanctuary Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm p-5 bg-[#F6F1E8] border border-[#D9C7A5]/80">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Selected Package
                  </span>
                  <strong className="text-[#242522]">
                    {currentBooking.package?.name || "Draft Selection"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Assigned Coordinator
                  </span>
                  <strong className="text-[#242522]">
                    {currentBooking.coordinator?.fullName || "Care Team"}
                  </strong>
                  <span className="block text-xs text-[#5A5751]">
                    {currentBooking.coordinator?.email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Wake Sanctuary &amp; Dates
                  </span>
                  <strong className="text-[#242522]">
                    {currentBooking.chapel?.name || "To Be Scheduled"}
                  </strong>
                  <span className="block text-xs font-price text-[#5A5751]">
                    {currentBooking.wakeStartDate || "TBD"} →{" "}
                    {currentBooking.wakeEndDate || "TBD"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    {currentBooking.serviceType === "cremation"
                      ? "Cremation & Columbarium"
                      : "Interment Schedule"}
                  </span>
                  <strong className="text-[#242522] font-price">
                    {currentBooking.intermentDate || "TBD"}
                  </strong>
                  <span className="block text-xs text-[#5A5751]">
                    {currentBooking.intermentLocation || "Location pending"}
                  </span>
                </div>
              </div>
              {currentBooking.specialRequests && (
                <p className="text-xs bg-[#F6F1E8] p-4 border border-[#D9C7A5] text-[#242522]">
                  <strong>Family Requests:</strong> {currentBooking.specialRequests}
                </p>
              )}
            </div>

            {/* Service Checklist */}
            <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                Coordination Checklist
              </h2>
              <div className="space-y-2.5">
                {(currentBooking.checklist || []).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#F6F1E8] border border-[#D9C7A5]/80 flex items-start justify-between gap-3"
                  >
                    <label className="flex items-start gap-3 text-xs sm:text-sm text-[#242522] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={!isCoordOrAdmin || busy}
                        onChange={() =>
                          handleCaseAction(
                            { action: "toggle_checklist", itemId: item.id },
                            "Checklist updated."
                          )
                        }
                        className="mt-0.5 w-4 h-4 accent-[#183B35]"
                      />
                      <div>
                        <span
                          className={
                            item.completed ? "line-through text-[#5A5751]" : "font-medium"
                          }
                        >
                          {item.label}
                        </span>
                        {item.completedBy && (
                          <span className="block text-[11px] text-[#5A5751]">
                            Verified by {item.completedBy}
                          </span>
                        )}
                      </div>
                    </label>
                    <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 bg-[#FBF9F5] border border-[#D9C7A5] text-[#5A5751] font-semibold">
                      {item.stage}
                    </span>
                  </div>
                ))}
              </div>

              {isCoordOrAdmin && (
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newChecklistLabel}
                    onChange={(e) => setNewChecklistLabel(e.target.value)}
                    placeholder="Add coordination checklist task..."
                    className="flex-1 px-3.5 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                  />
                  <button
                    type="button"
                    disabled={busy || !newChecklistLabel.trim()}
                    onClick={() => {
                      handleCaseAction(
                        {
                          action: "toggle_checklist",
                          newItemLabel: newChecklistLabel,
                          stage: "Coordination",
                        },
                        "Added checklist task."
                      );
                      setNewChecklistLabel("");
                    }}
                    className="px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                  >
                    Add Task
                  </button>
                </div>
              )}
            </div>

            {/* Case Schedules + Coordinator Anti-Double-Booking Scheduler */}
            <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#183B35]" strokeWidth={1.6} />
                <h2 className="text-2xl font-display font-medium text-[#242522]">
                  Assigned Chapel, Hearse &amp; Staff Slots
                </h2>
              </div>
              {currentBooking.schedules.length === 0 ? (
                <p className="text-xs text-[#5A5751]">
                  No operational schedule blocks attached yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {currentBooking.schedules.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-4 bg-[#F6F1E8] border border-[#D9C7A5]/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <strong className="text-[#242522] text-sm block">
                          {sc.title}
                        </strong>
                        <span className="text-[#5A5751]">{sc.location}</span>
                      </div>
                      <div className="font-price text-[#5A5751] sm:text-right">
                        <div>{new Date(sc.startTime).toLocaleString()}</div>
                        <span className="inline-block px-2 py-0.5 bg-[#183B35]/10 text-[#183B35] font-sans font-semibold mt-0.5 uppercase tracking-wider text-[10px]">
                          {sc.taskStatus.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isCoordOrAdmin && (
                <form
                  onSubmit={handleCreateSchedule}
                  className="pt-4 border-t border-[#D9C7A5]/70 space-y-3"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#183B35]">
                    Schedule Facility / Hearse / Staff (Overlap Protected)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={schedTitle}
                      onChange={(e) => setSchedTitle(e.target.value)}
                      placeholder="Task title (e.g. Church Blessing Hearse)"
                      className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                    />
                    <select
                      value={schedType}
                      onChange={(e) => setSchedType(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                    >
                      <option value="transfer">First-Call Transfer</option>
                      <option value="wake">Chapel Wake</option>
                      <option value="interment">Interment Procession</option>
                      <option value="cremation">On-Site Cremation</option>
                    </select>
                    <select
                      value={schedResourceId}
                      onChange={(e) => setSchedResourceId(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                    >
                      <option value="">Select Chapel / Hearse / Crematory</option>
                      {resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.type})
                        </option>
                      ))}
                    </select>
                    <select
                      value={schedStaffId}
                      onChange={(e) => setSchedStaffId(e.target.value)}
                      className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                    >
                      <option value="">Assign Driver / Chapel Specialist</option>
                      {staffDirectory.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.fullName} ({st.role})
                        </option>
                      ))}
                    </select>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#5A5751] mb-1">
                        Start Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={schedStart}
                        onChange={(e) => setSchedStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#5A5751] mb-1">
                        End Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={schedEnd}
                        onChange={(e) => setSchedEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                      />
                    </div>
                    <input
                      type="text"
                      value={schedLocation}
                      onChange={(e) => setSchedLocation(e.target.value)}
                      placeholder="Location / Route"
                      className="sm:col-span-2 px-3 py-2 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
                  >
                    Verify Availability &amp; Add Schedule
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Notes & Updates */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                Case Updates &amp; Notes
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(currentBooking.caseNotes || []).map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 border text-xs sm:text-sm space-y-1 ${
                      n.isInternal
                        ? "bg-[#EFE8DC] border-[#B7A99A]"
                        : "bg-[#F6F1E8] border-[#D9C7A5]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#5A5751]">
                      <strong className="text-[#242522]">
                        {n.authorName} ({n.authorRole})
                      </strong>
                      <span>
                        {n.isInternal
                          ? "Internal Staff Note"
                          : new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[#242522]">{n.text}</p>
                  </div>
                ))}
              </div>

              {!isReadOnly && (
                <div className="pt-4 border-t border-[#D9C7A5]/70 space-y-3">
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a calm update or request on this case..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9C7A5] bg-[#F6F1E8]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {isCoordOrAdmin ? (
                      <label className="flex items-center gap-2 text-xs text-[#5A5751]">
                        <input
                          type="checkbox"
                          checked={noteInternal}
                          onChange={(e) => setNoteInternal(e.target.checked)}
                          className="w-4 h-4 accent-[#183B35]"
                        />
                        <span>Internal staff-only note</span>
                      </label>
                    ) : (
                      <span className="text-[11px] text-[#5A5751]">
                        Shared with your assigned coordinator
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={busy || !noteText.trim()}
                      onClick={() => {
                        handleCaseAction(
                          {
                            action: "add_note",
                            text: noteText,
                            isInternal: noteInternal,
                          },
                          "Case note saved."
                        );
                        setNoteText("");
                      }}
                      className="px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28] disabled:opacity-50"
                    >
                      Post Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: DOCUMENTS (UPLOAD, PRIVATE VIEW & COORDINATOR REVIEW)     */}
      {/* =================================================================== */}
      {activeSubTab === "documents" && (
        <div className="space-y-6">
          <div className="bg-[#FBF9F5] p-6 sm:p-8 border border-[#D9C7A5] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9C7A5]/70">
              <div>
                <h2 className="text-2xl font-display font-medium text-[#242522]">
                  Required Civil &amp; Permit Documents
                </h2>
                <p className="text-xs sm:text-sm text-[#5A5751]">
                  Private RA 10173 storage. Accepted formats: PDF, JPG, PNG, WebP, SVG
                  (max 5 MB).
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold px-3 py-1 bg-[#183B35] text-[#D9C7A5]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Private Encrypted Vault
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {applicableDocReqs.map((req) => {
                const matchingUploaded = currentBooking.documents.filter(
                  (d) => d.requirementCode === req.code
                );
                const latestDoc = matchingUploaded[0] || null;

                return (
                  <div
                    key={req.id}
                    className="p-5 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-[#242522] text-sm sm:text-base font-display">
                          {lang === "fil" ? req.nameFil : req.name}
                        </strong>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 font-semibold shrink-0 ${
                            latestDoc?.status === "verified"
                              ? "bg-[#183B35] text-[#F6F1E8]"
                              : latestDoc?.status === "needs_revision"
                              ? "bg-amber-200 text-amber-950"
                              : latestDoc
                              ? "bg-[#D9C7A5] text-[#242522]"
                              : "bg-[#EFE8DC] text-[#5A5751]"
                          }`}
                        >
                          {latestDoc
                            ? latestDoc.status.replace("_", " ")
                            : req.isRequired
                            ? "Required"
                            : "Optional"}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A5751]">{req.description}</p>
                      {latestDoc && (
                        <p className="text-xs text-[#242522] pt-1">
                          <strong>Latest:</strong> {latestDoc.fileName} •{" "}
                          {latestDoc.reviewerNote}
                        </p>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#D9C7A5]/70">
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium cursor-pointer hover:bg-[#122D28]">
                          <Upload className="w-3.5 h-3.5 text-[#D9C7A5]" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              if (f) handleFileUpload(req.code, req.name, f, false);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleFileUpload(req.code, req.name, null, true)
                          }
                          className="px-3.5 py-2 bg-[#FBF9F5] border border-[#183B35] text-[#183B35] text-xs uppercase tracking-wider font-medium hover:bg-[#EFE8DC]"
                        >
                          Upload Sample Scan
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uploaded Documents Ledger & Coordinator Verification */}
          <div className="bg-[#FBF9F5] p-6 sm:p-8 border border-[#D9C7A5] space-y-4">
            <h3 className="text-xl font-display font-medium text-[#242522]">
              Uploaded Document Files &amp; Verification Status
            </h3>
            {currentBooking.documents.length === 0 ? (
              <p className="text-xs text-[#5A5751]">
                No documents uploaded for this case yet. Use any upload button above.
              </p>
            ) : (
              <div className="space-y-3">
                {currentBooking.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-xs sm:text-sm text-[#242522] block">
                            {doc.documentLabel}
                          </strong>
                          <span className="text-xs font-price text-[#5A5751]">
                            {doc.fileName} • {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                          </span>
                          {doc.reviewerNote && (
                            <p className="text-xs text-[#5A5751] mt-0.5">
                              Note: {doc.reviewerNote}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 font-semibold ${
                            doc.status === "verified"
                              ? "bg-[#183B35] text-[#F6F1E8]"
                              : doc.status === "needs_revision"
                              ? "bg-amber-200 text-amber-950"
                              : "bg-[#EFE8DC] text-[#242522]"
                          }`}
                        >
                          {doc.status.replace("_", " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePreviewDocument(doc.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs font-medium text-[#242522] hover:border-[#183B35]"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#183B35]" />
                          View Copy
                        </button>
                      </div>
                    </div>

                    {isCoordOrAdmin && (
                      <div className="pt-3 border-t border-[#D9C7A5]/70 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={reviewNotesById[doc.id] || ""}
                          onChange={(e) =>
                            setReviewNotesById((p) => ({
                              ...p,
                              [doc.id]: e.target.value,
                            }))
                          }
                          placeholder="Reviewer note for family (optional)..."
                          className="flex-1 px-3 py-1.5 text-xs border border-[#D9C7A5] bg-[#FBF9F5]"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDocumentReview(doc.id, "verified")}
                          className="px-3.5 py-1.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                        >
                          Mark Verified
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDocumentReview(doc.id, "needs_revision")}
                          className="px-3.5 py-1.5 bg-amber-200 text-amber-950 text-xs uppercase tracking-wider font-medium"
                        >
                          Needs Revision
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: QUOTATION, PAYMONGO TEST MODE & ACKNOWLEDGMENT RECEIPTS   */}
      {/* =================================================================== */}
      {activeSubTab === "payments" && (
        <div className="space-y-8">
          {/* Editorial Financial Balance Cards (Manrope Tabular Prices) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#FBF9F5] p-5 border border-[#D9C7A5]">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5A5751]">
                Total Contracted
              </span>
              <p className="text-2xl font-price font-bold text-[#242522] mt-1">
                {formatPhp(currentBooking.totalAmountPhp)}
              </p>
            </div>
            <div className="bg-[#FBF9F5] p-5 border border-[#D9C7A5]">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5A5751]">
                30% Down Payment
              </span>
              <p className="text-2xl font-price font-bold text-[#242522] mt-1">
                {formatPhp(currentBooking.downpaymentRequiredPhp)}
              </p>
            </div>
            <div className="bg-[#FBF9F5] p-5 border border-[#D9C7A5]">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5A5751]">
                Verified Paid
              </span>
              <p className="text-2xl font-price font-bold text-[#183B35] mt-1">
                {formatPhp(currentBooking.amountPaidPhp)}
              </p>
            </div>
            <div className="bg-[#183B35] text-[#F6F1E8] p-5 border border-[#183B35]">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-[#D9C7A5]">
                Remaining Balance
              </span>
              <p className="text-2xl font-price font-extrabold mt-1">
                {formatPhp(currentBooking.balancePhp)}
              </p>
            </div>
          </div>

          {/* Itemized Quotation Card */}
          {latestQuote ? (
            <div className="bg-[#FBF9F5] p-6 sm:p-8 border border-[#D9C7A5] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-code uppercase px-2.5 py-0.5 bg-[#EFE8DC] border border-[#D9C7A5] text-[#183B35] font-semibold">
                    {latestQuote.quotationNumber} •{" "}
                    {latestQuote.status.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <h2 className="text-2xl font-display font-medium text-[#242522] mt-2">
                    Itemized Quotation &amp; Statement of Account
                  </h2>
                  {latestQuote.approvedByName && (
                    <p className="text-xs text-[#183B35] font-medium mt-0.5">
                      Approved by {latestQuote.approvedByName}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      printQuotationAndInvoicePdf(currentBooking, latestQuote)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F6F1E8] border border-[#D9C7A5] text-xs uppercase tracking-wider font-medium text-[#242522] hover:border-[#183B35]"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#183B35]" />
                    Download PDF
                  </button>

                  {!isReadOnly && latestQuote.status !== "approved" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleCaseAction(
                          { action: "approve_quotation" },
                          `Quotation ${latestQuote.quotationNumber} approved! You may now proceed with your down payment.`
                        )
                      }
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-semibold hover:bg-[#122D28]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D9C7A5]" />
                      Approve Quotation
                    </button>
                  )}

                  {!isReadOnly &&
                    latestQuote.status === "approved" &&
                    currentBooking.balancePhp > 0 && (
                      <button
                        type="button"
                        onClick={openPaymongoModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-semibold hover:bg-[#122D28] shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#D9C7A5]" />
                        Pay via PayMongo (TEST MODE)
                      </button>
                    )}
                </div>
              </div>

              <div className="border border-[#D9C7A5] overflow-hidden bg-[#F6F1E8]/50">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-[#EFE8DC] border-b border-[#D9C7A5] text-[#183B35] uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="text-left py-3.5 px-4">
                        Item / Service Description
                      </th>
                      <th className="text-left py-3.5 px-4 hidden sm:table-cell">
                        Category
                      </th>
                      <th className="text-right py-3.5 px-4">Amount (PHP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9C7A5]/60">
                    {(latestQuote.lineItems || []).map((li) => (
                      <tr key={li.id}>
                        <td className="py-3.5 px-4 text-[#242522] font-medium">
                          {li.description}
                        </td>
                        <td className="py-3.5 px-4 text-xs uppercase text-[#5A5751] hidden sm:table-cell">
                          {li.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-price font-bold text-[#242522]">
                          {formatPhp(li.totalPhp)}
                        </td>
                      </tr>
                    ))}
                    {latestQuote.discountPhp > 0 && (
                      <tr className="bg-[#183B35]/10 text-[#183B35]">
                        <td className="py-3.5 px-4" colSpan={2}>
                          Senior Citizen / Compassionate Discount (
                          {latestQuote.discountLabel || "Applied"})
                        </td>
                        <td className="py-3.5 px-4 text-right font-price font-bold">
                          -{formatPhp(latestQuote.discountPhp)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-[#EFE8DC] font-bold text-[#242522] border-t border-[#D9C7A5]">
                      <td className="py-4 px-4" colSpan={2}>
                        Net Contracted Service Total
                      </td>
                      <td className="py-4 px-4 text-right font-price text-lg text-[#183B35]">
                        {formatPhp(latestQuote.totalPhp)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Coordinator / Admin Quotation Editor & Manual Cash Desk */}
              {isCoordOrAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5 border-t border-[#D9C7A5]/70">
                  <div className="p-5 bg-[#F6F1E8] border border-[#D9C7A5] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#183B35]">
                      Coordinator Quotation Revision
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={customLineDesc}
                        onChange={(e) => setCustomLineDesc(e.target.value)}
                        placeholder="Add item description"
                        className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5]"
                      />
                      <input
                        type="number"
                        value={customLinePrice}
                        onChange={(e) => setCustomLinePrice(e.target.value)}
                        placeholder="Item price (PHP)"
                        className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5] font-price"
                      />
                      <input
                        type="number"
                        value={discountPhpInput}
                        onChange={(e) => setDiscountPhpInput(e.target.value)}
                        placeholder="Total Discount (PHP)"
                        className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5] font-price"
                      />
                      <input
                        type="text"
                        value={discountLabelInput}
                        onChange={(e) => setDiscountLabelInput(e.target.value)}
                        placeholder="Reason (e.g. OSCA 20%)"
                        className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        handleCaseAction(
                          {
                            action: "update_quotation",
                            extraDescription: customLineDesc,
                            extraPricePhp: customLinePrice
                              ? Number(customLinePrice)
                              : 0,
                            discountPhp: discountPhpInput
                              ? Number(discountPhpInput)
                              : latestQuote.discountPhp,
                            discountLabel:
                              discountLabelInput || latestQuote.discountLabel,
                          },
                          "Quotation & Invoice updated."
                        );
                        setCustomLineDesc("");
                        setCustomLinePrice("");
                      }}
                      className="px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                    >
                      Save Quotation Update
                    </button>
                  </div>

                  {currentBooking.balancePhp > 0 && (
                    <form
                      onSubmit={handleManualCashRecord}
                      className="p-5 bg-[#F6F1E8] border border-[#D9C7A5] space-y-3"
                    >
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#183B35]">
                        Record Desk Cash / Bank Payment (Issues AR)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="number"
                          required
                          min={1}
                          max={currentBooking.balancePhp}
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          placeholder={`Amount PHP (max ${currentBooking.balancePhp})`}
                          className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5] font-price"
                        />
                        <select
                          value={manualMethod}
                          onChange={(e) => setManualMethod(e.target.value)}
                          className="px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5]"
                        >
                          <option value="manual_cash">Arrangement Desk Cash</option>
                          <option value="bank_transfer">Verified Bank Transfer</option>
                        </select>
                        <input
                          type="text"
                          value={manualNotes}
                          onChange={(e) => setManualNotes(e.target.value)}
                          placeholder="Reference note"
                          className="sm:col-span-2 px-3 py-2 text-xs border border-[#D9C7A5] bg-[#FBF9F5]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                      >
                        Record Payment &amp; Issue Receipt
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#FBF9F5] p-8 border border-[#D9C7A5] text-xs sm:text-sm text-[#5A5751]">
              This booking is currently a saved draft. Submit the arrangement in the
              Booking Wizard to generate an itemized quotation.
            </div>
          )}

          {/* Official Acknowledgment Receipts History */}
          <div className="bg-[#FBF9F5] p-6 sm:p-8 border border-[#D9C7A5] space-y-4">
            <h3 className="text-xl font-display font-medium text-[#242522]">
              Verified Payment Ledger &amp; Official Acknowledgment Receipts
            </h3>
            {currentBooking.payments.length === 0 ? (
              <p className="text-xs text-[#5A5751]">
                No payments recorded yet. Approve the quotation above and click
                &ldquo;Pay via PayMongo (TEST MODE)&rdquo; to test server-verified
                checkout.
              </p>
            ) : (
              <div className="space-y-3">
                {currentBooking.payments.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-4 sm:p-5 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-code uppercase tracking-wider px-2.5 py-0.5 bg-[#183B35] text-[#D9C7A5] font-semibold">
                          ACKNOWLEDGMENT RECEIPT • {pm.receiptNumber}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-[#183B35]/10 text-[#183B35]">
                          {pm.verificationStatus}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#242522]">
                        <strong className="font-price text-base text-[#183B35]">
                          {formatPhp(pm.amountPhp)}
                        </strong>{" "}
                        • {pm.paymentStage.replace(/_/g, " ")} via{" "}
                        <span className="uppercase font-medium">
                          {pm.method.replace(/_/g, " ")}
                        </span>
                      </p>
                      <p className="text-[11px] font-code text-[#5A5751]">
                        {new Date(pm.verifiedAt || pm.createdAt).toLocaleString()}
                        {pm.paymongoSessionId ? ` • ${pm.paymongoSessionId}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => printAcknowledgmentReceiptPdf(currentBooking, pm)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FBF9F5] border border-[#183B35] text-xs uppercase tracking-wider font-medium text-[#183B35] hover:bg-[#183B35] hover:text-[#F6F1E8] transition shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Receipt PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: FAMILY MEMORIAL PRIVACY & SHARING                        */}
      {/* =================================================================== */}
      {activeSubTab === "memorial" && (
        <div className="bg-[#FBF9F5] p-6 sm:p-8 border border-[#D9C7A5] space-y-6">
          {!currentBooking.memorial ? (
            <p className="text-xs sm:text-sm text-[#5A5751]">
              A private memorial page will be created automatically once your draft
              booking is submitted.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D9C7A5]">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[#183B35]">
                    {currentBooking.memorial.isPublic ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Shared on Public Memorials Page</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Private by Default — Family Controls Sharing</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-2xl font-display font-medium text-[#242522] mt-1">
                    Memorial Sanctuary Settings for{" "}
                    {currentBooking.memorial.deceasedName}
                  </h2>
                </div>

                {!isReadOnly && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      handleMemorialPrivacyUpdate(!currentBooking.memorial?.isPublic)
                    }
                    className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider font-medium ${
                      currentBooking.memorial.isPublic
                        ? "bg-[#242522] text-[#F6F1E8]"
                        : "bg-[#183B35] text-[#F6F1E8]"
                    }`}
                  >
                    {currentBooking.memorial.isPublic
                      ? "Set Private Only"
                      : "Enable Public Sharing"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3.5">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522]">
                    Family Share Code (Private Access Key)
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={
                      shareCodeDraft !== null
                        ? shareCodeDraft
                        : currentBooking.memorial.familyShareCode
                    }
                    onChange={(e) => setShareCodeDraft(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] font-code text-sm"
                  />
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] pt-1">
                    Remembrance Obituary Message
                  </label>
                  <textarea
                    rows={4}
                    disabled={isReadOnly}
                    value={
                      obituaryDraft !== null
                        ? obituaryDraft
                        : currentBooking.memorial.obituaryText
                    }
                    onChange={(e) => setObituaryDraft(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                  />
                  {!isReadOnly && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleMemorialPrivacyUpdate()}
                      className="px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                    >
                      Save Memorial Details
                    </button>
                  )}
                </div>

                <div className="p-6 bg-[#F6F1E8] border border-[#D9C7A5] space-y-3">
                  <h3 className="text-lg font-display font-medium text-[#242522]">
                    Candles Lit ({currentBooking.memorial.candlesCount}) &amp; Tributes
                  </h3>
                  {(currentBooking.memorial.tributes || []).length === 0 ? (
                    <p className="text-xs text-[#5A5751]">No tributes posted yet.</p>
                  ) : (
                    (currentBooking.memorial.tributes || []).map((tr) => (
                      <div
                        key={tr.id}
                        className="p-3.5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs"
                      >
                        <p className="text-[#242522]">{tr.message}</p>
                        <span className="text-[11px] text-[#5A5751] block mt-1">
                          — {tr.authorName} ({tr.relationship})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* PAYMONGO TEST MODE CHECKOUT MODAL                                   */}
      {/* =================================================================== */}
      {pmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242522]/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#FBF9F5] border border-[#D9C7A5] shadow-2xl overflow-hidden">
            <div className="p-5 bg-[#183B35] text-[#F6F1E8] border-b border-[#D9C7A5] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-code uppercase px-2 py-0.5 bg-[#D9C7A5] text-[#242522] font-bold">
                  PAYMONGO SANDBOX • TEST MODE ONLY
                </span>
                <h3 className="text-lg font-display font-medium mt-1.5">
                  Online Payment ({currentBooking.referenceCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPmModalOpen(false);
                  setPmSession(null);
                }}
                className="p-1.5 text-[#D9C7A5] hover:bg-[#122D28]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {!pmSession ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        key: "downpayment",
                        label: "30% Down",
                        amt: Math.min(
                          currentBooking.downpaymentRequiredPhp,
                          currentBooking.balancePhp
                        ),
                      },
                      {
                        key: "installment",
                        label: "Installment",
                        amt: Math.min(20000, currentBooking.balancePhp),
                      },
                      {
                        key: "full_balance",
                        label: "Full Balance",
                        amt: currentBooking.balancePhp,
                      },
                    ].map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          setPmStage(
                            preset.key as
                              | "downpayment"
                              | "installment"
                              | "full_balance"
                          );
                          setPmAmountInput(String(preset.amt));
                        }}
                        className={`p-3 border text-left text-xs transition ${
                          pmStage === preset.key
                            ? "bg-[#183B35] border-[#183B35] text-[#F6F1E8]"
                            : "bg-[#F6F1E8] text-[#242522] border-[#D9C7A5]"
                        }`}
                      >
                        <span className="block text-[11px] opacity-85">
                          {preset.label}
                        </span>
                        <span className="font-price font-bold">
                          {formatPhp(preset.amt)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                      Amount to Pay (PHP)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentBooking.balancePhp}
                      value={pmAmountInput}
                      onChange={(e) => setPmAmountInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] font-price font-bold text-lg text-[#183B35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                      PayMongo Test Channel (Zero Card Data Stored)
                    </label>
                    <select
                      value={pmMethod}
                      onChange={(e) => setPmMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs font-medium"
                    >
                      <option value="paymongo_gcash_test">
                        GCash e-Wallet (PayMongo Test Mode)
                      </option>
                      <option value="paymongo_maya_test">
                        Maya e-Wallet (PayMongo Test Mode)
                      </option>
                      <option value="paymongo_card_test">
                        Hosted Test Card Token 4343 (No Card Stored)
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCreatePaymongoSession}
                    className="w-full py-3 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#122D28]"
                  >
                    {busy
                      ? "Creating Signed Server Checkout..."
                      : "Continue to Test Authorization"}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#5A5751]">Session ID:</span>
                      <code className="font-code text-[#242522]">
                        {pmSession.sessionId}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A5751]">Amount:</span>
                      <strong className="font-price text-base text-[#183B35]">
                        {formatPhp(pmSession.amountPhp)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A5751]">Channel:</span>
                      <span className="uppercase font-semibold text-[#183B35]">
                        {pmSession.method.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    Clicking <strong>Authorize Test Payment</strong> verifies the HMAC
                    signature server-side in <code>/api/payments</code>, updates your
                    balance, and issues an official Acknowledgment Receipt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleConfirmPaymongoSession(false)}
                      className="py-3 px-4 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-semibold hover:bg-[#122D28]"
                    >
                      Authorize Test Payment
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleConfirmPaymongoSession(true)}
                      className="py-3 px-4 bg-[#EFE8DC] border border-[#D9C7A5] text-[#242522] text-xs uppercase tracking-wider font-medium"
                    >
                      Simulate Declined
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRIVATE DOCUMENT VIEWER MODAL                                       */}
      {/* =================================================================== */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242522]/65 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-[#FBF9F5] overflow-hidden shadow-2xl border border-[#D9C7A5]">
            <div className="p-5 bg-[#183B35] text-[#F6F1E8] border-b border-[#D9C7A5] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#D9C7A5]">
                  RA 10173 Private Document Preview
                </p>
                <h3 className="text-base font-display font-medium mt-0.5">
                  {previewDoc.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-[#D9C7A5] hover:bg-[#122D28]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-[#F6F1E8] flex flex-col items-center gap-4">
              {previewDoc.mimeType.startsWith("image/") ? (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.label}
                  className="max-h-96 border border-[#D9C7A5] bg-[#FBF9F5]"
                />
              ) : (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.label}
                  className="w-full h-96 border border-[#D9C7A5] bg-[#FBF9F5]"
                />
              )}
              <a
                href={previewDoc.dataUrl}
                download={previewDoc.fileName}
                className="px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
              >
                Download Private Copy ({previewDoc.fileName})
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
