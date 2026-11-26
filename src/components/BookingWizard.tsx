"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  Save,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Receipt,
} from "lucide-react";
import type {
  AddOnItem,
  DocumentRequirementItem,
  EnrichedBooking,
  InventoryItem,
  Language,
  PackageItem,
  PortalUser,
  ResourceItem,
  ScheduleItem,
} from "@/types/portal";
import { PRIVACY_NOTICE_EN, PRIVACY_NOTICE_FIL, formatPhp } from "@/lib/constants";

interface BookingWizardProps {
  lang: Language;
  user: PortalUser | null;
  packages: PackageItem[];
  addOns: AddOnItem[];
  inventory: InventoryItem[];
  resources: ResourceItem[];
  schedules: ScheduleItem[];
  documentRequirements: DocumentRequirementItem[];
  existingDrafts: EnrichedBooking[];
  initialSelection: {
    packageId?: number;
    casketInventoryId?: number;
    chapelResourceId?: number;
  };
  onOpenAuthModal: () => void;
  onQuickClientDemoLogin: () => Promise<void>;
  onBookingSaved: (bookingId: number, wasDraft: boolean) => Promise<void>;
}

const WIZARD_STEPS = [
  { step: 1, en: "Service Type", fil: "Uri ng Serbisyo" },
  { step: 2, en: "Package & Add-Ons", fil: "Package at Add-Ons" },
  { step: 3, en: "Deceased & Family", fil: "Detalye ng Yumao" },
  { step: 4, en: "Chapel & Dates", fil: "Kapilya at Iskedyul" },
  { step: 5, en: "Documents & Privacy", fil: "Dokumento at Privacy" },
  { step: 6, en: "Review & Submit", fil: "Suriin at Ipasa" },
];

export function BookingWizard({
  lang,
  user,
  packages,
  addOns,
  inventory,
  resources,
  schedules,
  documentRequirements,
  existingDrafts,
  initialSelection,
  onOpenAuthModal,
  onQuickClientDemoLogin,
  onBookingSaved,
}: BookingWizardProps) {
  const defaultWakeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 8);
    return d.toISOString().slice(0, 10);
  }, []);
  const defaultWakeEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 11);
    return d.toISOString().slice(0, 10);
  }, []);
  const defaultInterment = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 12);
    return d.toISOString().slice(0, 10);
  }, []);

  const [step, setStep] = useState<number>(1);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<"interment" | "cremation">("interment");
  const [packageId, setPackageId] = useState<number | null>(
    initialSelection.packageId || packages[0]?.id || null
  );
  const [casketInventoryId, setCasketInventoryId] = useState<number | null>(
    initialSelection.casketInventoryId || null
  );
  const [includeSeparateInventoryPrice, setIncludeSeparateInventoryPrice] =
    useState<boolean>(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<number[]>([]);
  const [chapelResourceId, setChapelResourceId] = useState<number | null>(
    initialSelection.chapelResourceId ||
      resources.find((r) => r.type === "chapel")?.id ||
      null
  );

  // Deceased & Family details (No Phone Fields!)
  const [deceasedName, setDeceasedName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dateOfPassing, setDateOfPassing] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [ageAtPassing, setAgeAtPassing] = useState("");
  const [gender, setGender] = useState("Male");
  const [religion, setReligion] = useState("Roman Catholic");
  const [placeOfPassing, setPlaceOfPassing] = useState("");
  const [biographySummary, setBiographySummary] = useState("");

  const [contactPersonName, setContactPersonName] = useState(user?.fullName || "");
  const [contactPersonEmail, setContactPersonEmail] = useState(user?.email || "");
  const [contactRelationship, setContactRelationship] = useState("Next of Kin");
  const [contactAddress, setContactAddress] = useState("Quezon City, Metro Manila");
  const [preferredChannel, setPreferredChannel] = useState("in_app_portal");

  // Schedule
  const [wakeStartDate, setWakeStartDate] = useState(defaultWakeStart);
  const [wakeEndDate, setWakeEndDate] = useState(defaultWakeEnd);
  const [intermentDate, setIntermentDate] = useState(defaultInterment);
  const [intermentLocation, setIntermentLocation] = useState(
    "Loyola Memorial Park, Marikina City"
  );
  const [specialRequests, setSpecialRequests] = useState("");
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const chapels = resources.filter((r) => r.type === "chapel" && r.status === "available");
  const selectedPkg = packages.find((p) => p.id === packageId) || null;
  const selectedInv = inventory.find((i) => i.id === casketInventoryId) || null;
  const selectedAddOns = addOns.filter((a) => selectedAddOnIds.includes(a.id));

  const applicableRequirements = documentRequirements.filter(
    (req) => req.active && (req.appliesTo === "all" || req.appliesTo === serviceType)
  );

  // Live Chapel Overlap Check
  const chapelConflict = useMemo(() => {
    if (!chapelResourceId || !wakeStartDate || !wakeEndDate) return null;
    const reqStart = new Date(`${wakeStartDate}T10:00:00`);
    const reqEnd = new Date(`${wakeEndDate}T21:00:00`);
    if (reqEnd <= reqStart) {
      return "Wake end date should be after the wake start date.";
    }
    const match = schedules.find(
      (s) =>
        s.resourceId === chapelResourceId &&
        (!draftId || s.bookingId !== draftId) &&
        reqStart < new Date(s.endTime) &&
        reqEnd > new Date(s.startTime)
    );
    return match
      ? `Reserved from ${new Date(match.startTime).toLocaleDateString()} to ${new Date(
          match.endTime
        ).toLocaleDateString()} (${match.title}). Please pick open dates or another chapel suite.`
      : null;
  }, [chapelResourceId, wakeStartDate, wakeEndDate, schedules, draftId]);

  const estimatedTotalPhp = useMemo(() => {
    let sum = selectedPkg?.pricePhp || 0;
    if (selectedInv && includeSeparateInventoryPrice) {
      sum += selectedInv.pricePhp;
    }
    for (const a of selectedAddOns) {
      sum += a.pricePhp;
    }
    return sum;
  }, [selectedPkg, selectedInv, includeSeparateInventoryPrice, selectedAddOns]);

  function loadDraftIntoForm(draft: EnrichedBooking) {
    setDraftId(draft.id);
    setStep(draft.wizardStep || 2);
    setServiceType(draft.serviceType === "cremation" ? "cremation" : "interment");
    setPackageId(draft.packageId);
    setCasketInventoryId(draft.casketInventoryId);
    setChapelResourceId(draft.chapelResourceId);
    setSelectedAddOnIds(draft.selectedAddOnIds || []);
    setContactPersonName(draft.contactPersonName);
    setContactPersonEmail(draft.contactPersonEmail);
    setContactRelationship(draft.contactRelationship);
    setContactAddress(draft.contactAddress);
    setPreferredChannel(draft.preferredCommunicationChannel);
    if (draft.wakeStartDate) setWakeStartDate(draft.wakeStartDate);
    if (draft.wakeEndDate) setWakeEndDate(draft.wakeEndDate);
    if (draft.intermentDate) setIntermentDate(draft.intermentDate);
    if (draft.intermentLocation) setIntermentLocation(draft.intermentLocation);
    if (draft.specialRequests) setSpecialRequests(draft.specialRequests);
    if (draft.deceased) {
      setDeceasedName(draft.deceased.fullName);
      setDateOfBirth(draft.deceased.dateOfBirth || "");
      setDateOfPassing(draft.deceased.dateOfPassing || "");
      setAgeAtPassing(
        draft.deceased.ageAtPassing ? String(draft.deceased.ageAtPassing) : ""
      );
      setPlaceOfPassing(draft.deceased.placeOfPassing || "");
      setBiographySummary(draft.deceased.biographySummary || "");
    }
    setFeedback({
      type: "ok",
      text: `Loaded saved draft ${draft.referenceCode}. Continue calmly from Step ${
        draft.wizardStep || 2
      }.`,
    });
  }

  function toggleAddOn(id: number) {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submitOrSave(saveAsDraft: boolean) {
    if (!user) {
      setFeedback({
        type: "err",
        text: "Please sign in first (or click 'Use Demo Client' below) so your arrangement is privately linked to your account.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveAsDraft,
          draftId,
          wizardStep: step,
          serviceType,
          packageId,
          casketInventoryId,
          includeSeparateInventoryPrice,
          chapelResourceId,
          selectedAddOnIds,
          deceasedName,
          dateOfBirth,
          dateOfPassing,
          ageAtPassing: ageAtPassing ? Number(ageAtPassing) : null,
          gender,
          religion,
          placeOfPassing,
          biographySummary,
          contactPersonName: contactPersonName || user.fullName,
          contactPersonEmail: contactPersonEmail || user.email,
          contactRelationship,
          contactAddress,
          preferredCommunicationChannel: preferredChannel,
          wakeStartDate,
          wakeEndDate,
          intermentDate,
          intermentLocation,
          specialRequests,
          privacyConsentAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Could not save arrangement." });
      } else {
        if (saveAsDraft) {
          setDraftId(data.booking.id);
          setFeedback({
            type: "ok",
            text: `Draft ${data.booking.referenceCode} saved safely. You can continue now or return anytime.`,
          });
        }
        await onBookingSaved(data.booking.id, saveAsDraft);
      }
    } catch {
      setFeedback({ type: "err", text: "Network error while saving arrangement." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-12 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#D9C7A5]">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            Unhurried Step-by-Step Service Arrangement
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#242522]">
            {lang === "fil"
              ? "Online na Pag-aayos ng Serbisyo"
              : "Memorial Service Arrangement Folio"}
          </h1>
          <p className="text-sm text-[#5A5751]">
            Move freely between steps and save your progress as a private draft at any
            point.
          </p>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => submitOrSave(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FBF9F5] border border-[#183B35] text-[#183B35] text-xs font-medium uppercase tracking-wider hover:bg-[#EFE8DC] transition"
        >
          <Save className="w-3.5 h-3.5" strokeWidth={1.6} />
          {lang === "fil" ? "I-save bilang Draft" : "Save as Draft"}
        </button>
      </div>

      {/* Sign-in helper banner if guest */}
      {!user && (
        <div className="p-5 bg-[#FBF9F5] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-[#5A5751]">
            Sign in to link private drafts, upload civil documents, and approve itemized
            quotations.
          </p>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onQuickClientDemoLogin}
              className="px-4 py-2 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-wider hover:bg-[#122D28]"
            >
              Use Demo Client (Maria Santos)
            </button>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2 bg-[#F6F1E8] border border-[#D9C7A5] text-xs font-medium uppercase tracking-wider text-[#242522]"
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
      )}

      {/* Existing Drafts Banner */}
      {existingDrafts.length > 0 && (
        <div className="p-4 bg-[#EFE8DC] border border-[#D9C7A5] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-[#242522]">
            <strong>Saved Drafts Available:</strong> Resume an earlier arrangement:
          </div>
          <div className="flex flex-wrap gap-2">
            {existingDrafts.map((dr) => (
              <button
                key={dr.id}
                type="button"
                onClick={() => loadDraftIntoForm(dr)}
                className="px-3.5 py-1.5 bg-[#FBF9F5] border border-[#183B35] text-xs font-medium text-[#183B35] hover:bg-[#183B35] hover:text-[#F6F1E8] transition"
              >
                Resume {dr.referenceCode} ({dr.deceased?.fullName || "Draft"})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editorial 6-Step Progress Bar */}
      <div className="bg-[#FBF9F5] p-5 sm:p-6 border border-[#D9C7A5] space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-[0.16em] font-semibold text-[#183B35]">
            Stage 0{step} of 06 — {WIZARD_STEPS[step - 1]?.en}
          </span>
          <span className="font-price font-bold text-[#242522]">
            {Math.round((step / 6) * 100)}% Complete
          </span>
        </div>
        <div className="w-full h-[3px] bg-[#EFE8DC]">
          <div
            className="h-full bg-[#183B35] transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1">
          {WIZARD_STEPS.map((st) => {
            const active = step === st.step;
            const done = step > st.step;
            return (
              <button
                key={st.step}
                type="button"
                onClick={() => setStep(st.step)}
                className={`p-3 text-left border transition ${
                  active
                    ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                    : done
                    ? "bg-[#F6F1E8] text-[#242522] border-[#183B35]/50"
                    : "bg-[#FBF9F5] text-[#5A5751] border-[#D9C7A5] hover:border-[#183B35]/50"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-price">
                  <span>0{st.step}</span>
                  {done && <Check className="w-3.5 h-3.5 text-[#183B35]" />}
                </div>
                <p className="text-xs font-display font-medium mt-1 truncate">
                  {lang === "fil" ? st.fil : st.en}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 border text-xs sm:text-sm flex items-start gap-2.5 ${
            feedback.type === "ok"
              ? "bg-[#183B35]/10 border-[#183B35]/40 text-[#183B35]"
              : "bg-amber-50 border-amber-400 text-amber-950"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#183B35]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 2-Column Editorial Workspace: Main Step Folio + Sticky Itemized PHP Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-[#FBF9F5] p-6 sm:p-9 border border-[#D9C7A5] space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                1. Choose Service Modality
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  {
                    key: "interment",
                    title: "Traditional Wake & Cemetery Interment",
                    desc: "Multi-day chapel viewing, restorative care, handcrafted casket, and ceremonial hearse procession.",
                  },
                  {
                    key: "cremation",
                    title: "Dignified Cremation (With or Without Viewing)",
                    desc: "Chapel vigil or private farewell followed by individual on-site cremation and marble or wood urn.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      setServiceType(opt.key as "interment" | "cremation")
                    }
                    className={`p-6 border text-left space-y-2.5 transition ${
                      serviceType === opt.key
                        ? "bg-[#F6F1E8] border-[#183B35] ring-1 ring-[#183B35]"
                        : "bg-[#FBF9F5] border-[#D9C7A5] hover:border-[#183B35]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-display font-semibold text-[#242522]">
                        {opt.title}
                      </span>
                      {serviceType === opt.key && (
                        <CheckCircle2 className="w-4 h-4 text-[#183B35] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#5A5751] leading-relaxed">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-display font-medium text-[#242522]">
                  2. Select Service Package &amp; Optional Tributes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages
                    .filter((p) => p.active)
                    .map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setPackageId(pkg.id)}
                        className={`p-5 border text-left space-y-2 transition ${
                          packageId === pkg.id
                            ? "bg-[#F6F1E8] border-[#183B35] ring-1 ring-[#183B35]"
                            : "bg-[#FBF9F5] border-[#D9C7A5] hover:border-[#183B35]/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <strong className="text-lg font-display font-semibold text-[#242522]">
                            {lang === "fil" ? pkg.nameFil : pkg.name}
                          </strong>
                          <span className="font-price font-bold text-base text-[#183B35] shrink-0">
                            {formatPhp(pkg.pricePhp)}
                          </span>
                        </div>
                        <p className="text-[11px] uppercase tracking-wider text-[#183B35] font-semibold">
                          {pkg.durationDays} Days • {pkg.casketIncluded}
                        </p>
                        <p className="text-xs text-[#5A5751] leading-relaxed">
                          {pkg.description}
                        </p>
                      </button>
                    ))}
                </div>
              </div>

              {/* Optional Casket / Urn preference */}
              <div className="space-y-3 pt-5 border-t border-[#D9C7A5]/70">
                <h3 className="text-lg font-display font-medium text-[#242522]">
                  Showroom Casket / Urn Selection (Optional)
                </h3>
                <select
                  value={casketInventoryId || ""}
                  onChange={(e) =>
                    setCasketInventoryId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-4 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                >
                  <option value="">Use Standard Casket / Urn Included in Package</option>
                  {inventory
                    .filter((i) => i.active && i.stockCount > 0)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.category.toUpperCase()} — {formatPhp(i.pricePhp)})
                      </option>
                    ))}
                </select>
                {casketInventoryId && (
                  <label className="flex items-center gap-2.5 text-xs text-[#242522]">
                    <input
                      type="checkbox"
                      checked={includeSeparateInventoryPrice}
                      onChange={(e) =>
                        setIncludeSeparateInventoryPrice(e.target.checked)
                      }
                      className="w-4 h-4 accent-[#183B35]"
                    />
                    <span>
                      Bill as separate itemized showroom piece (+
                      {formatPhp(selectedInv?.pricePhp || 0)})
                    </span>
                  </label>
                )}
              </div>

              {/* Optional Add-Ons */}
              <div className="space-y-3 pt-5 border-t border-[#D9C7A5]/70">
                <h3 className="text-lg font-display font-medium text-[#242522]">
                  Optional Add-Ons (Select Only If Desired)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {addOns
                    .filter((a) => a.active)
                    .map((addon) => {
                      const checked = selectedAddOnIds.includes(addon.id);
                      return (
                        <label
                          key={addon.id}
                          className={`p-4 border flex items-start gap-3 cursor-pointer transition ${
                            checked
                              ? "bg-[#F6F1E8] border-[#183B35]"
                              : "bg-[#FBF9F5] border-[#D9C7A5]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddOn(addon.id)}
                            className="mt-0.5 w-4 h-4 accent-[#183B35]"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex justify-between gap-2 font-semibold text-[#242522]">
                              <span>{addon.name}</span>
                              <span className="font-price text-[#183B35]">
                                {formatPhp(addon.pricePhp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5A5751] mt-1">
                              {addon.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                3. Details of the Deceased &amp; Family Representative
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Full Name of the Deceased *
                  </label>
                  <input
                    type="text"
                    required
                    value={deceasedName}
                    onChange={(e) => setDeceasedName(e.target.value)}
                    placeholder="e.g., Don Tomas Salazar"
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Date of Passing
                  </label>
                  <input
                    type="date"
                    value={dateOfPassing}
                    onChange={(e) => setDateOfPassing(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Age at Passing
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={130}
                    value={ageAtPassing}
                    onChange={(e) => setAgeAtPassing(e.target.value)}
                    placeholder="e.g., 78"
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm font-price"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Faith / Liturgical Tradition
                  </label>
                  <input
                    type="text"
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to state">Prefer not to state</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Hospital or Residence of Passing (For Transfer)
                  </label>
                  <input
                    type="text"
                    value={placeOfPassing}
                    onChange={(e) => setPlaceOfPassing(e.target.value)}
                    placeholder="e.g., Philippine Heart Center, Quezon City"
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Short Remembrance Tribute (For Private Memorial Page)
                  </label>
                  <textarea
                    rows={2}
                    value={biographySummary}
                    onChange={(e) => setBiographySummary(e.target.value)}
                    placeholder="A brief loving tribute..."
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
              </div>

              <div className="pt-5 border-t border-[#D9C7A5]/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <h3 className="sm:col-span-2 text-lg font-display font-medium text-[#242522]">
                  Family Representative (Written Web &amp; Email Coordination Only)
                </h3>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Contact Person Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactPersonEmail}
                    onChange={(e) => setContactPersonEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Relationship to the Deceased
                  </label>
                  <input
                    type="text"
                    value={contactRelationship}
                    onChange={(e) => setContactRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Preferred Non-Phone Channel
                  </label>
                  <select
                    value={preferredChannel}
                    onChange={(e) => setPreferredChannel(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  >
                    <option value="in_app_portal">In-Portal Coordinator Messaging</option>
                    <option value="email">Written Email Updates</option>
                    <option value="in_person_chapel">In-Person at Sanctuary Desk</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Residential Address (For Civil Registry Informant Record)
                  </label>
                  <input
                    type="text"
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                4. Wake Dates, Chapel Suite &amp; Interment/Cremation
              </h2>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-2">
                  Select Viewing Chapel Suite
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {chapels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChapelResourceId(ch.id)}
                      className={`p-4 border text-left space-y-1 transition ${
                        chapelResourceId === ch.id
                          ? "bg-[#F6F1E8] border-[#183B35] ring-1 ring-[#183B35]"
                          : "bg-[#FBF9F5] border-[#D9C7A5]"
                      }`}
                    >
                      <strong className="block text-[#242522] text-base font-display">
                        {ch.name}
                      </strong>
                      <span className="text-xs text-[#5A5751] block">{ch.capacity}</span>
                      <span className="text-[11px] text-[#183B35] font-medium block">
                        {ch.floorLocation}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Wake Start Date *
                  </label>
                  <input
                    type="date"
                    value={wakeStartDate}
                    onChange={(e) => setWakeStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    Wake End Date *
                  </label>
                  <input
                    type="date"
                    value={wakeEndDate}
                    onChange={(e) => setWakeEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    {serviceType === "cremation" ? "Cremation Date" : "Interment Date"}
                  </label>
                  <input
                    type="date"
                    value={intermentDate}
                    onChange={(e) => setIntermentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
              </div>

              {/* Live Anti-Double-Booking Indicator */}
              <div
                className={`p-4 border text-xs sm:text-sm flex items-start gap-2.5 ${
                  chapelConflict
                    ? "bg-amber-50 border-amber-400 text-amber-950"
                    : "bg-[#183B35]/10 border-[#183B35]/35 text-[#183B35]"
                }`}
              >
                {chapelConflict ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#183B35]" />
                )}
                <span>
                  {chapelConflict
                    ? chapelConflict
                    : "Sanctuary Availability Verified: Selected suite is open for your chosen wake dates with zero schedule overlap."}
                </span>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                  {serviceType === "cremation"
                    ? "Crematory & Columbarium Destination"
                    : "Cemetery / Memorial Park Location"}
                </label>
                <input
                  type="text"
                  value={intermentLocation}
                  onChange={(e) => setIntermentLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                  Gentle Family Notes / Liturgical Requests
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any floral notes, priest/pastor schedule, or room setup preferences..."
                  className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                5. Required Civil Documents &amp; RA 10173 Privacy Consent
              </h2>
              <p className="text-xs sm:text-sm text-[#5A5751]">
                After submitting this arrangement (or saving as a draft), upload scans or
                photos inside your private Case Dashboard at your convenience.
              </p>

              <div className="space-y-3">
                {applicableRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#242522] text-xs sm:text-sm">
                          {lang === "fil" ? req.nameFil : req.name}
                        </p>
                        <p className="text-xs text-[#5A5751] mt-0.5">{req.description}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 font-semibold shrink-0 ${
                        req.isRequired
                          ? "bg-[#183B35] text-[#F6F1E8]"
                          : "bg-[#EFE8DC] text-[#5A5751]"
                      }`}
                    >
                      {req.isRequired ? "Required" : "Optional"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-[#EFE8DC]/70 border border-[#D9C7A5] space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#183B35]">
                  <ShieldCheck className="w-4 h-4 text-[#183B35]" />
                  Data Privacy Act of 2012 (RA 10173) Consent
                </div>
                <p className="text-xs text-[#5A5751] leading-relaxed">
                  {lang === "fil" ? PRIVACY_NOTICE_FIL : PRIVACY_NOTICE_EN}
                </p>
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer text-xs sm:text-sm font-medium text-[#242522]">
                  <input
                    type="checkbox"
                    checked={privacyConsentAccepted}
                    onChange={(e) => setPrivacyConsentAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#183B35]"
                  />
                  <span>
                    I consent to the processing of our family&apos;s arrangement records
                    and civil documents in accordance with RA 10173.
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                6. Final Review &amp; Official Quotation Generation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-[#F6F1E8] border border-[#D9C7A5] text-xs sm:text-sm">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Departed Loved One
                  </span>
                  <strong className="text-[#242522]">
                    {deceasedName || "Not yet entered (complete Step 03)"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Family Representative
                  </span>
                  <strong className="text-[#242522]">
                    {contactPersonName || user?.fullName} (
                    {contactPersonEmail || user?.email})
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Wake Dates &amp; Chapel
                  </span>
                  <strong className="text-[#242522]">
                    {wakeStartDate} to {wakeEndDate} •{" "}
                    {chapels.find((c) => c.id === chapelResourceId)?.name ||
                      "Chapel Suite"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                    Modality &amp; Destination
                  </span>
                  <strong className="text-[#242522]">
                    {serviceType.toUpperCase()} • {intermentLocation}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-[#5A5751] leading-relaxed">
                Submitting prepares your formal itemized Quotation &amp; Statement inside
                your Case Dashboard. No payment is requested until your family reviews
                and clicks <strong>Approve Quotation</strong>.
              </p>
            </div>
          )}

          {/* Step Navigation Footer */}
          <div className="pt-6 border-t border-[#D9C7A5]/70 flex flex-wrap items-center justify-between gap-4">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#D9C7A5] text-xs uppercase tracking-wider font-medium text-[#242522] hover:border-[#183B35]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 6 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(6, s + 1))}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-[0.14em] font-medium hover:bg-[#122D28]"
                >
                  <span>Continue to Step 0{step + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9C7A5]" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || Boolean(chapelConflict)}
                  onClick={() => submitOrSave(false)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#122D28] disabled:opacity-50 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9C7A5]" />
                  {submitting
                    ? "Generating Official Quotation..."
                    : "Submit & Generate Itemized Quotation"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Right Sidebar: Live 100% Itemized PHP Summary Folio */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#D9C7A5]">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#183B35]" strokeWidth={1.6} />
              <h3 className="text-base font-display font-semibold text-[#242522]">
                Itemized PHP Summary
              </h3>
            </div>
            <span className="text-[10px] uppercase tracking-widest bg-[#183B35] text-[#D9C7A5] px-2 py-0.5 font-semibold">
              Live
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {selectedPkg ? (
              <div className="flex justify-between gap-2 text-[#242522]">
                <span>
                  <strong>{selectedPkg.name}</strong> ({selectedPkg.durationDays}d)
                </span>
                <span className="font-price font-bold shrink-0">
                  {formatPhp(selectedPkg.pricePhp)}
                </span>
              </div>
            ) : (
              <p className="text-[#5A5751]">Select a base package in Step 02.</p>
            )}

            {selectedInv && includeSeparateInventoryPrice && (
              <div className="flex justify-between gap-2 text-[#5A5751]">
                <span>Showroom: {selectedInv.name}</span>
                <span className="font-price font-semibold text-[#242522] shrink-0">
                  {formatPhp(selectedInv.pricePhp)}
                </span>
              </div>
            )}

            {selectedAddOns.map((a) => (
              <div key={a.id} className="flex justify-between gap-2 text-[#5A5751]">
                <span>+ {a.name}</span>
                <span className="font-price font-semibold text-[#242522] shrink-0">
                  {formatPhp(a.pricePhp)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#D9C7A5] space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-[#5A5751] font-semibold">
                Estimated Total
              </span>
              <span className="text-2xl font-price font-extrabold text-[#183B35]">
                {formatPhp(estimatedTotalPhp)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-[#5A5751]">
              <span>30% Down Payment (After Approval)</span>
              <span className="font-price font-bold text-[#242522]">
                {formatPhp(Math.round(estimatedTotalPhp * 0.3))}
              </span>
            </div>
            <div className="flex justify-between text-xs text-[#5A5751]">
              <span>Remaining 70% Balance</span>
              <span className="font-price font-bold text-[#242522]">
                {formatPhp(
                  estimatedTotalPhp - Math.round(estimatedTotalPhp * 0.3)
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => submitOrSave(true)}
            className="w-full py-2.5 px-4 bg-[#F6F1E8] border border-[#D9C7A5] text-xs uppercase tracking-wider font-medium text-[#183B35] hover:border-[#183B35] flex items-center justify-center gap-2 transition"
          >
            <Save className="w-3.5 h-3.5" />
            Save Progress as Draft
          </button>
        </aside>
      </div>
    </div>
  );
}
