"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  ShieldCheck,
  Calendar,
  Heart,
  Flame,
  Lock,
  Unlock,
  MapPin,
  Mail,
  Clock,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  MessageSquareHeart,
  Search,
  SlidersHorizontal,
  Receipt,
  CheckCircle2,
  Building2,
  FileText,
  Sparkles,
  Scale,
  Compass,
  Landmark,
  Users,
  FileCheck2,
  Award,
} from "lucide-react";
import type {
  AddOnItem,
  InventoryItem,
  Language,
  MemorialRecord,
  PackageItem,
  PortalUser,
  ResourceItem,
  ScheduleItem,
} from "@/types/portal";
import {
  FUNERAL_HOME_INFO,
  PRIVACY_NOTICE_EN,
  PRIVACY_NOTICE_FIL,
  WORKFLOW_STAGES,
  formatPhp,
} from "@/lib/constants";

interface PublicShowcaseProps {
  section: string;
  lang: Language;
  user: PortalUser | null;
  packages: PackageItem[];
  addOns: AddOnItem[];
  inventory: InventoryItem[];
  resources: ResourceItem[];
  schedules: ScheduleItem[];
  memorials: MemorialRecord[];
  onNavigate: (view: string) => void;
  onStartBookingWithSelection: (opts: {
    packageId?: number;
    casketInventoryId?: number;
    chapelResourceId?: number;
  }) => void;
  onOpenCoordinatorDrawer: () => void;
  onRefreshMemorials: (code?: string) => Promise<void>;
}

const STEP_DETAILS: Array<{
  stage: number;
  phase: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  {
    stage: 1,
    phase: "Phase I • Guidance",
    desc: "Begin calmly online with zero unsolicited calls. Save your arrangement as a private draft at any moment.",
    icon: Compass,
  },
  {
    stage: 2,
    phase: "Phase I • Selection",
    desc: "Choose Payapa, Gunita, Liwanag, or Tahimik and any optional tributes—every peso is itemized upfront.",
    icon: Sparkles,
  },
  {
    stage: 3,
    phase: "Phase I • Registry",
    desc: "Record essential details of your departed loved one and next-of-kin informant under RA 10173 protection.",
    icon: Users,
  },
  {
    stage: 4,
    phase: "Phase II • Sanctuary",
    desc: "Select viewing chapel dates and interment or cremation times verified against our anti-overlap schedule.",
    icon: Calendar,
  },
  {
    stage: 5,
    phase: "Phase II • Civil Care",
    desc: "Upload the Certificate of Death, burial or cremation permits, and informant ID to encrypted private storage.",
    icon: FileText,
  },
  {
    stage: 6,
    phase: "Phase III • Clarity",
    desc: "Receive a formal, itemized PHP Quotation & Statement ready to review or print with relatives.",
    icon: Receipt,
  },
  {
    stage: 7,
    phase: "Phase III • Consent",
    desc: "Approve your itemized quotation at your family’s own pace—free from countdowns or sales pressure.",
    icon: Scale,
  },
  {
    stage: 8,
    phase: "Phase III • Confirmation",
    desc: "Settle the 30% initial down payment online in PayMongo Test Mode (verified server-side) or at our desk.",
    icon: Landmark,
  },
  {
    stage: 9,
    phase: "Phase IV • Stewardship",
    desc: "Follow chapel preparation, floral tributes, and ceremonial transfers live on your family Case Checklist.",
    icon: Building2,
  },
  {
    stage: 10,
    phase: "Phase IV • Settlement",
    desc: "Complete remaining installments or full balance transparently with downloadable Acknowledgment Receipts.",
    icon: FileCheck2,
  },
  {
    stage: 11,
    phase: "Phase IV • Remembrance",
    desc: "All civil registry permits, receipts, and your private-by-default family memorial page are lovingly finalized.",
    icon: Award,
  },
];

function shortPackageLabel(pkg: PackageItem): string {
  const firstWord = pkg.name.split(" ")[0];
  return `${firstWord} (${pkg.durationDays} ${pkg.durationDays === 1 ? "Day" : "Days"})`;
}

export function PublicShowcase({
  section,
  lang,
  user,
  packages,
  addOns,
  inventory,
  resources,
  schedules,
  memorials,
  onNavigate,
  onStartBookingWithSelection,
  onOpenCoordinatorDrawer,
  onRefreshMemorials,
}: PublicShowcaseProps) {
  // Interactive estimator & timeline state
  const [estimatorIdx, setEstimatorIdx] = useState<number>(0);
  const [activeTimelineStage, setActiveTimelineStage] = useState<number>(1);
  const [archTab, setArchTab] = useState<"ledger" | "calendar" | "vault">("ledger");

  // Packages search, filter & sort
  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgCategory, setPkgCategory] = useState<string>("all");
  const [pkgSort, setPkgSort] = useState<"recommended" | "price_asc" | "price_desc">(
    "recommended"
  );

  // Inventory search, filter & sort
  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState<string>("all");
  const [invSort, setInvSort] = useState<"default" | "price_asc" | "price_desc">(
    "default"
  );

  // Chapel & Schedule search/filter
  const [schedSearch, setSchedSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  // FAQ search
  const [faqSearch, setFaqSearch] = useState("");

  // Memorials state
  const [shareCodeInput, setShareCodeInput] = useState("");
  const [tributeNameByMem, setTributeNameByMem] = useState<Record<number, string>>({});
  const [tributeRelByMem, setTributeRelByMem] = useState<Record<number, string>>({});
  const [tributeMsgByMem, setTributeMsgByMem] = useState<Record<number, string>>({});
  const [tributeBusy, setTributeBusy] = useState<number | null>(null);

  // Contact page state
  const [contactName, setContactName] = useState(user?.fullName || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactStatus, setContactStatus] = useState<string | null>(null);
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const publishedPackages = useMemo(
    () => packages.filter((p) => p.active),
    [packages]
  );

  const filteredPackages = useMemo(() => {
    const q = pkgSearch.trim().toLowerCase();
    const list = publishedPackages.filter((p) => {
      const catOk = pkgCategory === "all" || p.category === pkgCategory;
      const searchOk =
        !q ||
        `${p.name} ${p.nameFil} ${p.description} ${p.casketIncluded} ${p.chapelIncluded}`
          .toLowerCase()
          .includes(q);
      return catOk && searchOk;
    });
    if (pkgSort === "price_asc") return [...list].sort((a, b) => a.pricePhp - b.pricePhp);
    if (pkgSort === "price_desc")
      return [...list].sort((a, b) => b.pricePhp - a.pricePhp);
    return list;
  }, [publishedPackages, pkgCategory, pkgSearch, pkgSort]);

  const filteredInventory = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    const list = inventory.filter((i) => {
      if (!i.active) return false;
      const catOk = invCategory === "all" || i.category === invCategory;
      const searchOk =
        !q ||
        `${i.name} ${i.sku} ${i.material} ${i.finish} ${i.description}`
          .toLowerCase()
          .includes(q);
      return catOk && searchOk;
    });
    if (invSort === "price_asc") return [...list].sort((a, b) => a.pricePhp - b.pricePhp);
    if (invSort === "price_desc")
      return [...list].sort((a, b) => b.pricePhp - a.pricePhp);
    return list;
  }, [inventory, invCategory, invSearch, invSort]);

  const chapels = resources.filter((r) => r.type === "chapel");

  async function handleLightCandleOrTribute(memId: number, includeMessage: boolean) {
    setTributeBusy(memId);
    try {
      const res = await fetch("/api/memorials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memId,
          action: "light_candle_or_tribute",
          authorName: tributeNameByMem[memId] || user?.fullName || "Loved One",
          relationship: tributeRelByMem[memId] || "Family & Friend",
          message: includeMessage ? tributeMsgByMem[memId] || "" : "",
          litCandle: true,
        }),
      });
      if (res.ok) {
        setTributeMsgByMem((prev) => ({ ...prev, [memId]: "" }));
        await onRefreshMemorials(shareCodeInput || undefined);
      }
    } finally {
      setTributeBusy(null);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactSubmitting(true);
    setContactStatus(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: contactName,
          senderEmail: contactEmail,
          subject: contactSubject || "Sanctuary Concierge Inquiry",
          message: contactMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactStatus(data.error || "Unable to submit message.");
      } else {
        setContactStatus(
          lang === "fil"
            ? "Salamat. Natanggap na ng aming Coordinator ang inyong mensahe at tutugon sa email."
            : "Thank you. Our Senior Coordinator has received your message and will respond calmly via email."
        );
        setContactSubject("");
        setContactMessage("");
      }
    } finally {
      setContactSubmitting(false);
    }
  }

  // =========================================================================
  // HOMEPAGE (7 LUXURY EDITORIAL SECTIONS)
  // =========================================================================
  if (section === "home") {
    const estimatorPackages = publishedPackages.slice(0, 4);
    const selectedEstPkg =
      estimatorPackages[estimatorIdx] || estimatorPackages[0] || null;
    const estDownpayment = selectedEstPkg
      ? Math.round(selectedEstPkg.pricePhp * 0.3)
      : 0;
    const estRemaining = selectedEstPkg
      ? selectedEstPkg.pricePhp - estDownpayment
      : 0;

    const serviceCategories = [
      {
        num: "I",
        title: lang === "fil" ? "Mga Ataul at Urna" : "Caskets and Urns",
        subtitle: "Philippine Narra, Mahogany & Romblon Marble",
        description:
          "Handcrafted hardwood caskets and hand-turned marble or brass reliquary urns with transparent showroom pricing.",
        image: "/images/casket-heritage.jpg",
        actionLabel: "View Showroom Collection",
        targetView: "caskets",
      },
      {
        num: "II",
        title: lang === "fil" ? "Pagpapareserba ng Kapilya" : "Chapel Reservations",
        subtitle: "Sunlit Travertine Suites & Garden Pavilions",
        description:
          "Private family viewing suites for 30 to 80 guests, backed by real-time availability that prevents double-booking.",
        image: "/images/chapel-garden.jpg",
        actionLabel: "Inspect Chapels & Calendar",
        targetView: "chapels",
      },
      {
        num: "III",
        title: lang === "fil" ? "Pahina ng Pag-alaala" : "Memorial Services",
        subtitle: "Private-by-Default Digital Tributes",
        description:
          "Dignified online remembrance sanctuaries where families govern privacy, share codes, candle lighting, and prayers.",
        image: "/images/service-memorial.jpg",
        actionLabel: "Explore Memorial Sanctuary",
        targetView: "memorials",
      },
      {
        num: "IV",
        title: lang === "fil" ? "Mga Dokumentong Sibil" : "Civil Documents",
        subtitle: "Municipal Form 103 & Permit Concierge",
        description:
          "Guided preparation and encrypted RA 10173 upload for death certificates, transfer clearances, and valid IDs.",
        image: "/images/service-documents.jpg",
        actionLabel: "Begin Guided Arrangement",
        targetView: "booking",
      },
      {
        num: "V",
        title: lang === "fil" ? "Malinaw na Kabayaran" : "Payment Coordination",
        subtitle: "Itemized Quotations & Verified Receipts",
        description:
          "Clear 30% down payments, calm installments, server-verified PayMongo Test Mode, and official Acknowledgment Receipts.",
        image: "/images/urn-marble.jpg",
        actionLabel: "Review Pricing & Terms",
        targetView: "packages",
      },
    ];

    return (
      <div className="bg-[#F6F1E8] text-[#242522]">
        {/* =============================================================== */}
        {/* 2. SPLIT-SCREEN EDITORIAL HERO SECTION                          */}
        {/* =============================================================== */}
        <section className="relative editorial-grain border-b border-[#D9C7A5]/80 overflow-hidden">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Editorial Column */}
            <div className="lg:col-span-6 space-y-8">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-[#FBF9F5] border border-[#D9C7A5] text-[#183B35] text-xs uppercase tracking-[0.18em] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#183B35]" />
                <span>100% Itemized PHP Pricing</span>
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-[58px] font-display font-medium text-[#242522] leading-[1.1] tracking-tight">
                {lang === "fil" ? (
                  <>
                    Maingat na Pag-aasikaso.{" "}
                    <span className="italic text-[#183B35]">Malinaw na Halaga.</span>{" "}
                    Kapayapaan ng Kalooban.
                  </>
                ) : (
                  <>
                    Thoughtful Arrangements.{" "}
                    <span className="italic text-[#183B35]">Transparent Pricing.</span>{" "}
                    Peace of Mind.
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-[#5A5751] leading-relaxed max-w-xl">
                {lang === "fil"
                  ? "Isang tahimik at marangal na gabay para sa burol, kapilya, kremasyon, at mga dokumentong sibil—walang pagmamadali, walang nakatagong bayarin, at lubos na iginagalang ang bawat desisyon ng pamilya."
                  : "A serene, unhurried sanctuary for arranging chapel viewings, interment or cremation care, civil permits, and family payments—guided with complete financial clarity and quiet compassion."}
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate("booking")}
                  className="inline-flex items-center gap-3 px-7 py-4 bg-[#183B35] text-[#F6F1E8] border border-[#183B35] text-xs sm:text-sm font-medium uppercase tracking-[0.14em] hover:bg-[#122D28] transition-all duration-300 shadow-md"
                >
                  <span>
                    {lang === "fil"
                      ? "Simulan ang Hakbang-Hakbang na Booking"
                      : "Start Step-by-Step Booking"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#D9C7A5]" strokeWidth={1.7} />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("packages")}
                  className="inline-flex items-center gap-2.5 px-7 py-4 bg-[#FBF9F5] text-[#183B35] border border-[#B7A99A] text-xs sm:text-sm font-medium uppercase tracking-[0.14em] hover:border-[#183B35] hover:bg-[#EFE8DC]/60 transition-all duration-300"
                >
                  <span>
                    {lang === "fil" ? "Tingnan ang mga Serbisyo" : "Explore Packages"}
                  </span>
                </button>
              </div>

              {/* Three Refined Trust Indicators */}
              <div className="pt-6 border-t border-[#D9C7A5] grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#183B35] font-semibold">
                    No Hidden Fees
                  </p>
                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    Every service, casket, chapel day, and receipt itemized in PHP.
                  </p>
                </div>
                <div className="space-y-1 sm:border-l sm:border-[#D9C7A5]/70 sm:pl-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#183B35] font-semibold">
                    Zero Pressure
                  </p>
                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    Save private drafts anytime; no phone calls or countdown timers.
                  </p>
                </div>
                <div className="space-y-1 sm:border-l sm:border-[#D9C7A5]/70 sm:pl-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#183B35] font-semibold">
                    RA 10173 Protected
                  </p>
                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    Encrypted civil document storage &amp; verified payment receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Split-Screen Photograph + Floating Package Estimator Card */}
            <div className="lg:col-span-6 relative pb-12 sm:pb-16 lg:pb-10">
              <div className="relative border border-[#D9C7A5] p-2.5 bg-[#FBF9F5] shadow-[0_24px_60px_rgba(24,59,53,0.12)]">
                <div className="relative overflow-hidden aspect-[4/4.6] sm:aspect-[4/4.2]">
                  <img
                    src="/images/editorial-hero-sanctuary.jpg"
                    alt="Peaceful Tahanan ng Kapayapaan memorial chapel with white orchids"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#183B35]/60 via-transparent to-transparent" />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-[#183B35]/85 backdrop-blur-xs border border-[#D9C7A5]/60 text-[10px] uppercase tracking-[0.2em] text-[#F6F1E8]">
                    Sanctuary Suite • Quezon City
                  </div>
                </div>
              </div>

              {/* Floating Package Estimator Overlay Card */}
              {selectedEstPkg && (
                <div className="relative sm:absolute sm:-bottom-4 sm:left-6 sm:right-6 lg:-left-8 lg:right-8 mt-4 sm:mt-0 bg-[#FBF9F5]/98 backdrop-blur-md border border-[#D9C7A5] p-5 sm:p-6 shadow-[0_20px_50px_rgba(36,37,34,0.18)] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D9C7A5]/70">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#183B35] font-semibold block">
                        Instant Pricing Preview
                      </span>
                      <p className="text-base font-display font-semibold text-[#242522]">
                        {lang === "fil" ? selectedEstPkg.nameFil : selectedEstPkg.name}
                      </p>
                    </div>
                    <span className="text-2xl font-price font-bold text-[#183B35]">
                      {formatPhp(selectedEstPkg.pricePhp)}
                    </span>
                  </div>

                  {/* Quick 4-Package Selector Pills */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {estimatorPackages.map((pkg, idx) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setEstimatorIdx(idx)}
                        className={`py-1.5 px-2 text-[11px] font-medium border transition ${
                          estimatorIdx === idx
                            ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                            : "bg-[#F6F1E8] text-[#242522] border-[#D9C7A5] hover:border-[#183B35]"
                        }`}
                      >
                        {pkg.name.split(" ")[0]} ({pkg.durationDays}d)
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                    <div className="p-2.5 bg-[#F6F1E8] border border-[#D9C7A5]/60">
                      <span className="text-[10px] uppercase tracking-wider text-[#5A5751] block">
                        30% Down Payment
                      </span>
                      <strong className="text-sm font-price font-bold text-[#183B35]">
                        {formatPhp(estDownpayment)}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-[#F6F1E8] border border-[#D9C7A5]/60">
                      <span className="text-[10px] uppercase tracking-wider text-[#5A5751] block">
                        Remaining Balance
                      </span>
                      <strong className="text-sm font-price font-bold text-[#242522]">
                        {formatPhp(estRemaining)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-[#5A5751]">
                      Includes {selectedEstPkg.casketIncluded}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onStartBookingWithSelection({ packageId: selectedEstPkg.id })
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#183B35] hover:underline underline-offset-4 shrink-0"
                    >
                      <span>Select Plan</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* 3. DEDICATED INTERACTIVE PACKAGE ESTIMATOR SECTION              */}
        {/* =============================================================== */}
        <section className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-24 space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#D9C7A5]">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[#183B35] font-semibold">
                Transparent Financial Stewardship
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-medium text-[#242522]">
                {lang === "fil"
                  ? "Interactive na Talaan ng Serbisyo at Kabayaran"
                  : "Interactive Service & Payment Estimator"}
              </h2>
              <p className="text-sm sm:text-base text-[#5A5751]">
                Select any of our four memorial care packages below to inspect complete
                included services, exact down payment requirements, and your family’s
                transparent payment schedule.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("packages")}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] font-semibold text-[#183B35] border-b border-[#183B35] pb-1 w-fit hover:opacity-80 transition"
            >
              <span>View Full Package &amp; Add-On Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Package Selector Tabs: Payapa (4 Days), Gunita (5 Days), Liwanag (3 Days), Tahimik (1 Day) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {estimatorPackages.map((pkg, idx) => {
              const active = estimatorIdx === idx;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setEstimatorIdx(idx)}
                  className={`p-5 text-left border transition-all duration-300 ${
                    active
                      ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35] shadow-lg"
                      : "bg-[#FBF9F5] text-[#242522] border-[#D9C7A5] hover:border-[#183B35]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-[0.2em] ${
                        active ? "text-[#D9C7A5]" : "text-[#5A5751]"
                      }`}
                    >
                      Option 0{idx + 1} • {pkg.category}
                    </span>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-[#D9C7A5]" />
                    )}
                  </div>
                  <p className="text-xl font-display font-medium mt-2">
                    {shortPackageLabel(pkg)}
                  </p>
                  <p
                    className={`text-2xl font-price font-bold mt-2 ${
                      active ? "text-[#D9C7A5]" : "text-[#183B35]"
                    }`}
                  >
                    {formatPhp(pkg.pricePhp)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detailed Estimator Breakdown Panel */}
          {selectedEstPkg && (
            <div className="bg-[#FBF9F5] border border-[#D9C7A5] grid grid-cols-1 lg:grid-cols-12 shadow-[0_16px_40px_rgba(36,37,34,0.05)]">
              {/* Left 7 Cols: Package Name, Description & Included Services */}
              <div className="lg:col-span-7 p-7 sm:p-10 space-y-6 lg:border-r lg:border-[#D9C7A5]">
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#183B35] font-semibold">
                    {selectedEstPkg.durationDays}-Day Memorial Care Package
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-display font-medium text-[#242522]">
                    {lang === "fil" ? selectedEstPkg.nameFil : selectedEstPkg.name}
                  </h3>
                  <p className="text-sm sm:text-base text-[#5A5751] leading-relaxed">
                    {lang === "fil"
                      ? selectedEstPkg.descriptionFil
                      : selectedEstPkg.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F6F1E8] border border-[#D9C7A5]/80">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5751] block">
                      Sanctuary Vessel Included
                    </span>
                    <strong className="text-sm text-[#242522] font-medium mt-1 block">
                      {selectedEstPkg.casketIncluded}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#5A5751] block">
                      Chapel Suite Included
                    </span>
                    <strong className="text-sm text-[#242522] font-medium mt-1 block">
                      {selectedEstPkg.chapelIncluded}
                    </strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-[0.18em] text-[#183B35] font-semibold">
                    Complete Included Services ({selectedEstPkg.inclusions.length})
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {selectedEstPkg.inclusions.map((inc) => (
                      <li
                        key={inc}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#242522]/90"
                      >
                        <Check
                          className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5"
                          strokeWidth={1.8}
                        />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right 5 Cols: Total Price, Down Payment, Remaining Balance & Payment Breakdown */}
              <div className="lg:col-span-5 p-7 sm:p-10 bg-[#F6F1E8]/70 flex flex-col justify-between gap-8">
                <div className="space-y-6">
                  <div className="pb-5 border-b border-[#D9C7A5]">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#5A5751] block">
                      All-Inclusive Package Total
                    </span>
                    <div className="flex items-baseline justify-between gap-4 mt-1">
                      <span className="text-3xl sm:text-4xl font-price font-extrabold text-[#183B35]">
                        {formatPhp(selectedEstPkg.pricePhp)}
                      </span>
                      <span className="text-xs text-[#5A5751]">VAT &amp; Permits Assisted</span>
                    </div>
                  </div>

                  {/* Proportional Payment Breakdown Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-[#242522]">
                      <span>Payment Allocation</span>
                      <span className="font-price">30% Initial • 70% Balance</span>
                    </div>
                    <div className="h-2.5 w-full bg-[#EFE8DC] border border-[#D9C7A5] flex overflow-hidden">
                      <div className="w-[30%] bg-[#183B35]" title="30% Down Payment" />
                      <div className="w-[70%] bg-[#D9C7A5]" title="70% Remaining Balance" />
                    </div>
                  </div>

                  {/* Itemized Payment Milestones */}
                  <div className="space-y-3 text-sm">
                    <div className="p-4 bg-[#FBF9F5] border border-[#D9C7A5] flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#183B35] font-semibold block">
                          1. Initial Down Payment (30%)
                        </span>
                        <span className="text-xs text-[#5A5751]">
                          Payable only after you approve the written quotation
                        </span>
                      </div>
                      <strong className="text-lg font-price font-bold text-[#183B35] shrink-0">
                        {formatPhp(estDownpayment)}
                      </strong>
                    </div>

                    <div className="p-4 bg-[#FBF9F5] border border-[#D9C7A5] flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#242522] font-semibold block">
                          2. Remaining Balance (70%)
                        </span>
                        <span className="text-xs text-[#5A5751]">
                          Flexible installments or full settlement before interment
                        </span>
                      </div>
                      <strong className="text-lg font-price font-bold text-[#242522] shrink-0">
                        {formatPhp(estRemaining)}
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    Every online PayMongo (Test Mode) or desk cash payment immediately
                    updates your family ledger and issues a downloadable{" "}
                    <strong className="text-[#242522]">Acknowledgment Receipt</strong>.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      onStartBookingWithSelection({ packageId: selectedEstPkg.id })
                    }
                    className="w-full py-4 px-6 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-[0.16em] hover:bg-[#122D28] transition flex items-center justify-center gap-2"
                  >
                    <span>Arrange with {shortPackageLabel(selectedEstPkg)}</span>
                    <ArrowRight className="w-4 h-4 text-[#D9C7A5]" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCoordinatorDrawer}
                    className="w-full py-3 px-5 bg-transparent border border-[#B7A99A] text-[#242522] text-xs font-medium uppercase tracking-[0.14em] hover:border-[#183B35] transition"
                  >
                    Ask a Coordinator About This Plan
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =============================================================== */}
        {/* 4. FIVE SERVICE CATEGORIES (PREMIUM PHOTOGRAPHIC CARDS)         */}
        {/* =============================================================== */}
        <section className="bg-[#EFE8DC]/75 border-y border-[#D9C7A5] py-20 lg:py-24">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#183B35] font-semibold">
                Curated Sanctuary Offerings
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-medium text-[#242522]">
                {lang === "fil"
                  ? "Limang Haligi ng Maingat na Paglilingkod"
                  : "Every Aspect of Care, Thoughtfully Coordinated"}
              </h2>
              <p className="text-sm sm:text-base text-[#5A5751]">
                Explore our sanctuary showrooms, viewing suites, civil documentation
                support, and transparent billing—each designed to ease decision-making
                during tender moments.
              </p>
            </div>

            {/* Editorial Asymmetric Photographic Grid (2 Large Top + 3 Refined Bottom) */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              {serviceCategories.map((cat, idx) => {
                const spanClass = idx < 2 ? "md:col-span-3" : "md:col-span-2";
                const heightClass = idx < 2 ? "h-80 sm:h-96" : "h-72 sm:h-80";
                return (
                  <div
                    key={cat.title}
                    onClick={() => onNavigate(cat.targetView)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onNavigate(cat.targetView);
                      }
                    }}
                    className={`${spanClass} group relative bg-[#FBF9F5] border border-[#D9C7A5] overflow-hidden flex flex-col justify-between transition-all duration-500 hover:border-[#183B35] hover:shadow-xl`}
                  >
                    <div className={`relative ${heightClass} overflow-hidden`}>
                      <img
                        src={cat.image}
                        alt={cat.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#242522]/85 via-[#242522]/25 to-transparent" />
                      <span className="absolute top-4 left-4 px-3 py-1 bg-[#183B35]/90 border border-[#D9C7A5]/60 text-[10px] font-display italic tracking-widest text-[#D9C7A5]">
                        {cat.num}
                      </span>
                      <div className="absolute bottom-5 left-5 right-5 text-[#F6F1E8] space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D9C7A5]">
                          {cat.subtitle}
                        </p>
                        <h3 className="text-2xl font-display font-medium">
                          {cat.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-6 bg-[#FBF9F5] flex-1 flex flex-col justify-between gap-4">
                      <p className="text-xs sm:text-sm text-[#5A5751] leading-relaxed">
                        {cat.description}
                      </p>
                      <div className="pt-3 border-t border-[#D9C7A5]/60 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#183B35]">
                        <span>{cat.actionLabel}</span>
                        <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* 5. ELEVEN-STEP BOOKING PROCESS TIMELINE                         */}
        {/* =============================================================== */}
        <section className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-24 space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#D9C7A5]">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[#183B35] font-semibold">
                Unhurried End-to-End Continuity
              </p>
              <h2 className="text-3xl sm:text-4xl font-display font-medium text-[#242522]">
                {lang === "fil"
                  ? "Ang Labing-Isang Hakbang ng Koordinasyon"
                  : "The Eleven-Step Service Coordination Journey"}
              </h2>
              <p className="text-sm sm:text-base text-[#5A5751]">
                From your family’s quiet initial inquiry to the final Acknowledgment
                Receipt, every stage is visible to both your family and your dedicated
                coordinator.
              </p>
            </div>

            <div className="text-xs uppercase tracking-[0.18em] text-[#5A5751]">
              Selected Stage:{" "}
              <strong className="text-[#183B35] font-price">
                {String(activeTimelineStage).padStart(2, "0")} / 11
              </strong>
            </div>
          </div>

          {/* Highlighted Active Stage Editorial Banner */}
          {(() => {
            const activeMeta =
              STEP_DETAILS.find((s) => s.stage === activeTimelineStage) ||
              STEP_DETAILS[0];
            const ActiveIcon = activeMeta.icon;
            const stageTitle = WORKFLOW_STAGES[activeMeta.stage - 1];
            return (
              <div className="p-6 sm:p-8 bg-[#183B35] text-[#F6F1E8] border border-[#D9C7A5] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 border border-[#D9C7A5] bg-[#122D28] flex items-center justify-center shrink-0">
                    <ActiveIcon className="w-5 h-5 text-[#D9C7A5]" strokeWidth={1.4} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#D9C7A5]">
                      Step {String(activeMeta.stage).padStart(2, "0")} •{" "}
                      {activeMeta.phase}
                    </span>
                    <h3 className="text-2xl font-display font-medium">
                      {lang === "fil" ? stageTitle?.fil : stageTitle?.en}
                    </h3>
                    <p className="text-sm text-[#F6F1E8]/80 max-w-2xl leading-relaxed">
                      {activeMeta.desc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate("booking")}
                  className="shrink-0 px-6 py-3 bg-[#D9C7A5] text-[#242522] text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#e4d5b7] transition"
                >
                  Begin Arrangement
                </button>
              </div>
            );
          })()}

          {/* Refined Architectural Timeline Grid with Line Icons & Connecting Rule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-11 gap-3">
            {STEP_DETAILS.map((item) => {
              const Icon = item.icon;
              const wf = WORKFLOW_STAGES[item.stage - 1];
              const isSelected = activeTimelineStage === item.stage;
              const isPassed = item.stage <= activeTimelineStage;
              return (
                <button
                  key={item.stage}
                  type="button"
                  onClick={() => setActiveTimelineStage(item.stage)}
                  className={`p-4 text-left border transition-all duration-300 flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-[#FBF9F5] border-[#183B35] ring-1 ring-[#183B35] shadow-md"
                      : "bg-[#FBF9F5]/80 border-[#D9C7A5] hover:border-[#183B35]/60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-price font-bold ${
                          isSelected ? "text-[#183B35]" : "text-[#5A5751]"
                        }`}
                      >
                        {String(item.stage).padStart(2, "0")}
                      </span>
                      <Icon
                        className={`w-4 h-4 ${
                          isPassed ? "text-[#183B35]" : "text-[#B7A99A]"
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="w-full h-[2px] bg-[#EFE8DC]">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isPassed ? "w-full bg-[#183B35]" : "w-0"
                        }`}
                      />
                    </div>
                    <h4 className="text-sm font-display font-semibold text-[#242522] leading-snug">
                      {lang === "fil" ? wf?.fil : wf?.en}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#5A5751] leading-relaxed line-clamp-3">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* =============================================================== */}
        {/* 6. PLATFORM ARCHITECTURE (VISUAL SHOWCASE SECTION)              */}
        {/* =============================================================== */}
        <section className="forest-weave text-[#F6F1E8] border-y border-[#D9C7A5]/50 py-20 lg:py-24">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Architectural Narrative & Interactive Selector */}
            <div className="lg:col-span-5 space-y-7">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[#D9C7A5]">
                  Digital Concierge Architecture
                </p>
                <h2 className="text-3xl sm:text-4xl font-display font-medium leading-tight">
                  Quiet Precision Behind Every Family Arrangement
                </h2>
                <p className="text-sm sm:text-base text-[#F6F1E8]/80 leading-relaxed">
                  Beneath a calm editorial experience lies a purpose-built coordination
                  system connecting families, coordinators, chapel attendants, and
                  ceremonial drivers in real time.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: "ledger",
                    title: "Itemized Quotation & Receipt Ledger",
                    sub: "Server-verified PayMongo Test Mode & printable Acknowledgment Receipts",
                  },
                  {
                    key: "calendar",
                    title: "Anti-Double-Booking Sanctuary Scheduler",
                    sub: "Real-time conflict protection across chapels, hearses, and staff",
                  },
                  {
                    key: "vault",
                    title: "RA 10173 Document Vault & 5-Role Access",
                    sub: "Private civil registry storage with dedicated Client, Staff, Admin & README roles",
                  },
                ].map((tab) => {
                  const active = archTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        setArchTab(tab.key as "ledger" | "calendar" | "vault")
                      }
                      className={`w-full p-4 text-left border transition-all duration-300 ${
                        active
                          ? "bg-[#F6F1E8] text-[#242522] border-[#D9C7A5]"
                          : "bg-[#122D28]/70 text-[#F6F1E8] border-[#D9C7A5]/30 hover:border-[#D9C7A5]/70"
                      }`}
                    >
                      <p className="text-base font-display font-semibold">{tab.title}</p>
                      <p
                        className={`text-xs mt-0.5 ${
                          active ? "text-[#5A5751]" : "text-[#F6F1E8]/70"
                        }`}
                      >
                        {tab.sub}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate("readme")}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#D9C7A5] border-b border-[#D9C7A5] pb-1 hover:opacity-85"
                >
                  <span>Explore Full Architecture &amp; 5 Demo Roles</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Interactive Visual Sanctuary Dossier Preview */}
            <div className="lg:col-span-7">
              <div className="bg-[#FBF9F5] text-[#242522] border border-[#D9C7A5] p-6 sm:p-9 shadow-2xl space-y-6">
                {archTab === "ledger" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#D9C7A5]">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#183B35] font-semibold">
                          Sample Family Statement • Case TKP-2026-1002
                        </span>
                        <h3 className="text-2xl font-display font-medium mt-0.5">
                          Transparent Balance &amp; Receipt Reconciliation
                        </h3>
                      </div>
                      <span className="px-3 py-1 bg-[#183B35] text-[#D9C7A5] text-[10px] uppercase tracking-widest font-semibold">
                        Verified Ledger
                      </span>
                    </div>

                    <div className="divide-y divide-[#E5DDD0] text-sm border border-[#D9C7A5] bg-[#F6F1E8]/60">
                      <div className="p-3.5 flex justify-between">
                        <span>Liwanag Viewing &amp; Dignified Cremation (3 Days)</span>
                        <strong className="font-price">{formatPhp(76000)}</strong>
                      </div>
                      <div className="p-3.5 flex justify-between">
                        <span>Acoustic String &amp; Liturgical Choir Vigil</span>
                        <strong className="font-price">{formatPhp(8500)}</strong>
                      </div>
                      <div className="p-3.5 flex justify-between bg-[#EFE8DC]/70 text-[#183B35] font-semibold">
                        <span>Verified Down Payment (Receipt AR-2026-5001)</span>
                        <span className="font-price">-{formatPhp(38000)}</span>
                      </div>
                      <div className="p-4 flex justify-between text-base font-bold text-[#242522]">
                        <span>Current Remaining Family Balance</span>
                        <span className="font-price text-xl text-[#183B35]">
                          {formatPhp(46500)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5A5751]">
                      <span>
                        HMAC-verified server-side in PayMongo Test Mode • Zero card data
                        stored
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigate("booking")}
                        className="text-[#183B35] font-semibold uppercase tracking-wider underline underline-offset-4"
                      >
                        Try Live Booking →
                      </button>
                    </div>
                  </>
                )}

                {archTab === "calendar" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#D9C7A5]">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#183B35] font-semibold">
                          Live Facility Matrix
                        </span>
                        <h3 className="text-2xl font-display font-medium mt-0.5">
                          Chapel, Hearse &amp; Crematory Conflict Guard
                        </h3>
                      </div>
                      <span className="px-3 py-1 bg-[#183B35] text-[#D9C7A5] text-[10px] uppercase tracking-widest font-semibold">
                        {resources.filter((r) => r.status === "available").length} Suites Active
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {schedules.slice(0, 4).map((slot) => (
                        <div
                          key={slot.id}
                          className="p-3.5 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <strong className="text-[#183B35] uppercase tracking-wider block">
                              {slot.resourceName}
                            </strong>
                            <span className="text-[#242522]">{slot.title}</span>
                          </div>
                          <span className="font-price text-[#5A5751] shrink-0">
                            {new Date(slot.startTime).toLocaleDateString()} —{" "}
                            {new Date(slot.endTime).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate("chapels")}
                      className="text-xs font-semibold uppercase tracking-wider text-[#183B35] underline underline-offset-4"
                    >
                      Open Full Availability Calendar →
                    </button>
                  </>
                )}

                {archTab === "vault" && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#D9C7A5]">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#183B35] font-semibold">
                          Role-Based Access &amp; Civil Vault
                        </span>
                        <h3 className="text-2xl font-display font-medium mt-0.5">
                          Five Dedicated Roles with Row-Level Privacy
                        </h3>
                      </div>
                      <span className="px-3 py-1 bg-[#183B35] text-[#D9C7A5] text-[10px] uppercase tracking-widest font-semibold">
                        RA 10173
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        {
                          role: "Family / Client",
                          desc: "Arranges services, saves drafts, uploads civil IDs & permits, approves quotes, and controls memorial sharing.",
                        },
                        {
                          role: "Service Coordinator",
                          desc: "Verifies documents (Pending / Verified / Needs Revision), manages schedules, and issues receipts.",
                        },
                        {
                          role: "Driver / Chapel Staff",
                          desc: "Receives transfer & wake preparation schedules without seeing private family financial balances.",
                        },
                        {
                          role: "Admin & README Auditor",
                          desc: "Manages inventory, editable document checklists, CSV/PDF reports, and read-only compliance audits.",
                        },
                      ].map((r) => (
                        <div
                          key={r.role}
                          className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] space-y-1"
                        >
                          <strong className="text-sm font-display text-[#183B35] block">
                            {r.role}
                          </strong>
                          <p className="text-[#5A5751] leading-relaxed">{r.desc}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* 7. TRUST AND TRANSPARENCY CHARTER SECTION                       */}
        {/* =============================================================== */}
        <section className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-24 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#183B35] font-semibold">
              Our Covenant with Every Family
            </p>
            <h2 className="text-3xl sm:text-4xl font-display font-medium text-[#242522]">
              {lang === "fil"
                ? "Katapatan, Paggalang, at Malinaw na Pananagutan"
                : "Uncompromising Trust & Financial Transparency"}
            </h2>
            <p className="text-sm sm:text-base text-[#5A5751]">
              Every policy on our platform is built to protect grieving families from
              uncertainty, surprise charges, or intrusive sales practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 border border-[#D9C7A5] bg-[#FBF9F5] divide-y md:divide-y-0 md:divide-x divide-[#D9C7A5]">
            {[
              {
                title: "100% Itemized PHP Pricing",
                desc: "All packages, caskets, urns, and optional services publish exact Philippine Peso figures upfront.",
              },
              {
                title: "No Hidden Fees",
                desc: "Zero surprise handling charges, mandatory add-ons, pop-up promotions, or artificial countdowns.",
              },
              {
                title: "Verified Acknowledgment Receipts",
                desc: "Every online test payment and desk cash settlement generates an official downloadable PDF receipt.",
              },
              {
                title: "Double-Booking Prevention",
                desc: "Automated overlap checks safeguard every viewing chapel, ceremonial hearse, and crematory slot.",
              },
              {
                title: "RA 10173 Privacy Compliance",
                desc: "Explicit consent, encrypted document storage, private-by-default memorials, and zero card storage.",
              },
            ].map((pillar, i) => (
              <div key={pillar.title} className="p-6 sm:p-7 space-y-3">
                <span className="text-xs font-display italic text-[#183B35] block">
                  0{i + 1}
                </span>
                <h3 className="text-lg font-display font-semibold text-[#242522] leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-xs text-[#5A5751] leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // PACKAGES & PRICING SECTION
  // =========================================================================
  if (section === "packages") {
    return (
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 space-y-12">
        <div className="space-y-3 max-w-3xl pb-6 border-b border-[#D9C7A5]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            100% Itemized PHP Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-medium text-[#242522]">
            {lang === "fil"
              ? "Mga Serbisyo at Talaan ng Halaga"
              : "Memorial Service Packages & Pricing"}
          </h1>
          <p className="text-[#5A5751] text-base">
            Every memorial package displays complete inclusions, 30% initial down
            payment, and total PHP pricing upfront—never hidden behind consultations.
          </p>
        </div>

        {/* Refined Search, Filter & Sort Bar */}
        <div className="p-5 bg-[#FBF9F5] border border-[#D9C7A5] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5A5751] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={pkgSearch}
              onChange={(e) => setPkgSearch(e.target.value)}
              placeholder="Search packages by name, casket, chapel, or inclusion..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm text-[#242522]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All Services" },
              { key: "traditional", label: "Traditional" },
              { key: "cremation", label: "Cremation" },
              { key: "direct", label: "Direct Care" },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setPkgCategory(cat.key)}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border transition ${
                  pkgCategory === cat.key
                    ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                    : "bg-[#F6F1E8] text-[#242522] border-[#D9C7A5] hover:border-[#183B35]"
                }`}
              >
                {cat.label}
              </button>
            ))}

            <div className="flex items-center gap-1.5 pl-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A5751]" />
              <select
                value={pkgSort}
                onChange={(e) =>
                  setPkgSort(
                    e.target.value as "recommended" | "price_asc" | "price_desc"
                  )
                }
                aria-label="Sort packages"
                className="px-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs font-medium text-[#242522]"
              >
                <option value="recommended">Curated Order</option>
                <option value="price_asc">Price: Lowest First</option>
                <option value="price_desc">Price: Highest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Editorial Package Cards */}
        {filteredPackages.length === 0 ? (
          <div className="p-12 bg-[#FBF9F5] border border-[#D9C7A5] text-center text-sm text-[#5A5751]">
            No packages match your current filter. Select &ldquo;All Services&rdquo; to
            reset.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-[#FBF9F5] p-8 border border-[#D9C7A5] hover:border-[#183B35] flex flex-col justify-between gap-8 transition-colors duration-300"
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#D9C7A5]/70">
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#183B35] font-semibold">
                        {pkg.category} • {pkg.durationDays}{" "}
                        {pkg.durationDays === 1 ? "Day" : "Days"}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-display font-medium text-[#242522] mt-1.5">
                        {lang === "fil" ? pkg.nameFil : pkg.name}
                      </h2>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase tracking-widest text-[#5A5751] block">
                        Total PHP
                      </span>
                      <p className="text-2xl sm:text-3xl font-price font-extrabold text-[#183B35]">
                        {formatPhp(pkg.pricePhp)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-[#5A5751] leading-relaxed">
                    {lang === "fil" ? pkg.descriptionFil : pkg.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F6F1E8] border border-[#D9C7A5]/80 text-xs">
                    <div>
                      <span className="text-[#5A5751] uppercase tracking-wider block">
                        Included Casket / Urn
                      </span>
                      <strong className="text-[#242522] text-sm font-medium mt-0.5 block">
                        {pkg.casketIncluded}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#5A5751] uppercase tracking-wider block">
                        Included Chapel Suite
                      </span>
                      <strong className="text-[#242522] text-sm font-medium mt-0.5 block">
                        {pkg.chapelIncluded}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#183B35]">
                      Included Care &amp; Services ({(pkg.inclusions || []).length}):
                    </p>
                    <ul className="grid grid-cols-1 gap-2">
                      {(pkg.inclusions || []).map((inc) => (
                        <li
                          key={inc}
                          className="flex items-start gap-2.5 text-sm text-[#242522]/90"
                        >
                          <Check
                            className="w-4 h-4 text-[#183B35] shrink-0 mt-1"
                            strokeWidth={1.8}
                          />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-5 border-t border-[#D9C7A5]/70 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-[#5A5751]">
                    30% Initial Down Payment:{" "}
                    <strong className="font-price text-sm text-[#183B35]">
                      {formatPhp(Math.round(pkg.pricePhp * 0.3))}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartBookingWithSelection({ packageId: pkg.id })}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#122D28] transition"
                  >
                    <span>Select This Package</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D9C7A5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Optional Respectful Add-Ons */}
        <div className="bg-[#EFE8DC]/70 p-8 border border-[#D9C7A5] space-y-6">
          <div>
            <h2 className="text-2xl font-display font-medium text-[#242522]">
              Optional Family Tributes &amp; Extensions (Entirely Discretionary)
            </h2>
            <p className="text-sm text-[#5A5751] mt-1">
              Every optional service is transparently priced and chosen only if your
              family wishes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {addOns
              .filter((a) => a.active)
              .map((addon) => (
                <div
                  key={addon.id}
                  className="bg-[#FBF9F5] p-5 border border-[#D9C7A5] flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-display font-semibold text-[#242522]">
                      {lang === "fil" ? addon.nameFil : addon.name}
                    </h3>
                    <span className="font-price font-bold text-base text-[#183B35] shrink-0">
                      {formatPhp(addon.pricePhp)}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-[#5A5751]">
                    {addon.unitLabel}
                  </p>
                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    {addon.description}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASKETS & URNS SHOWROOM
  // =========================================================================
  if (section === "caskets") {
    return (
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 space-y-10">
        <div className="space-y-3 max-w-2xl pb-6 border-b border-[#D9C7A5]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            Sanctuary Showroom
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-medium text-[#242522]">
            {lang === "fil"
              ? "Mga Gawang-Kamay na Ataul at Urna"
              : "Handcrafted Caskets & Cremation Urns"}
          </h1>
          <p className="text-base text-[#5A5751]">
            Philippine Narra and Mahogany hardwoods, Romblon alabaster marble, and
            keepsake reliquaries with transparent standalone and upgrade pricing.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-5 bg-[#FBF9F5] border border-[#D9C7A5] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5A5751] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              placeholder="Search by material (Narra, Marble, Acacia), name, or SKU..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All Showroom Pieces" },
              { key: "casket", label: "Caskets" },
              { key: "urn", label: "Cremation Urns" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setInvCategory(tab.key)}
                className={`px-3.5 py-2 text-xs uppercase tracking-wider font-medium border ${
                  invCategory === tab.key
                    ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                    : "bg-[#F6F1E8] text-[#242522] border-[#D9C7A5]"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <select
              value={invSort}
              onChange={(e) =>
                setInvSort(e.target.value as "default" | "price_asc" | "price_desc")
              }
              aria-label="Sort inventory"
              className="px-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs font-medium text-[#242522]"
            >
              <option value="default">Curated Order</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-[#FBF9F5] border border-[#D9C7A5] hover:border-[#183B35] flex flex-col justify-between transition-colors duration-300 group"
            >
              <div>
                <div className="overflow-hidden border-b border-[#D9C7A5] h-56">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-code uppercase px-2.5 py-0.5 bg-[#EFE8DC] text-[#242522] border border-[#D9C7A5]">
                      {item.sku}
                    </span>
                    <span
                      className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 ${
                        item.stockCount > 0
                          ? "bg-[#183B35]/10 text-[#183B35]"
                          : "bg-[#EFE8DC] text-[#5A5751]"
                      }`}
                    >
                      {item.stockCount > 0
                        ? `Available (${item.stockCount})`
                        : "Bespoke Order"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-display font-medium text-[#242522]">
                    {item.name}
                  </h2>
                  <p className="text-2xl font-price font-bold text-[#183B35]">
                    {formatPhp(item.pricePhp)}
                  </p>
                  <p className="text-xs sm:text-sm text-[#5A5751] leading-relaxed">
                    {item.description}
                  </p>
                  <div className="pt-3 text-xs text-[#5A5751] space-y-1.5 border-t border-[#D9C7A5]/60">
                    <div className="flex justify-between">
                      <span>Material:</span>
                      <strong className="text-[#242522]">{item.material}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Finish:</span>
                      <span className="text-[#242522]">{item.finish}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="font-price text-[#242522]">
                        {item.dimensions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  type="button"
                  disabled={item.stockCount <= 0}
                  onClick={() =>
                    onStartBookingWithSelection({ casketInventoryId: item.id })
                  }
                  className="w-full py-3 px-4 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#122D28] disabled:opacity-50 transition"
                >
                  Select for Arrangement
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // CHAPELS & LIVE AVAILABILITY CALENDAR SECTION
  // =========================================================================
  if (section === "chapels") {
    const q = schedSearch.trim().toLowerCase();
    const filteredSchedules = schedules.filter((s) => {
      const typeOk = resourceFilter === "all" || s.resourceType === resourceFilter;
      const searchOk =
        !q ||
        `${s.resourceName} ${s.title} ${s.location} ${s.eventType}`
          .toLowerCase()
          .includes(q);
      return typeOk && searchOk;
    });

    return (
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 space-y-14">
        <div className="space-y-3 max-w-3xl pb-6 border-b border-[#D9C7A5]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            Sanctuary Suites &amp; Live Schedule
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-medium text-[#242522]">
            {lang === "fil"
              ? "Mga Kapilya, Sasakyan, at Kalendaryo ng Availability"
              : "Memorial Chapels & Live Availability"}
          </h1>
          <p className="text-base text-[#5A5751]">
            Inspect our private viewing suites and verify real-time reservations below.
            Overlapping bookings across chapels, ceremonial coaches, and staff are
            automatically prevented.
          </p>
        </div>

        {/* Chapel Spec Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {chapels.map((chapel) => (
            <div
              key={chapel.id}
              className="bg-[#FBF9F5] border border-[#D9C7A5] flex flex-col justify-between group"
            >
              <div>
                <div className="h-52 overflow-hidden border-b border-[#D9C7A5]">
                  <img
                    src={chapel.imageUrl}
                    alt={chapel.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium px-2.5 py-0.5 bg-[#EFE8DC] text-[#242522] border border-[#D9C7A5]">
                      {chapel.capacity}
                    </span>
                    <span
                      className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 ${
                        chapel.status === "available"
                          ? "bg-[#183B35]/10 text-[#183B35]"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {chapel.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-display font-medium text-[#242522]">
                    {chapel.name}
                  </h2>
                  <p className="text-xs text-[#5A5751] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#183B35]" />
                    {chapel.floorLocation}
                  </p>
                  <p className="text-xs sm:text-sm text-[#5A5751] leading-relaxed">
                    {chapel.description}
                  </p>
                  <ul className="space-y-1.5 pt-3 border-t border-[#D9C7A5]/60">
                    {(chapel.features || []).map((f) => (
                      <li
                        key={f}
                        className="text-xs text-[#242522] flex items-center gap-2"
                      >
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-[#183B35] shrink-0"
                          strokeWidth={1.6}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="px-6 pb-6 pt-4 flex items-center justify-between gap-3 border-t border-[#D9C7A5]/60">
                <div>
                  <span className="text-[10px] text-[#5A5751] uppercase tracking-widest block">
                    Standalone Rate
                  </span>
                  <span className="font-price font-bold text-base text-[#183B35]">
                    {formatPhp(chapel.ratePerDayPhp)} / day
                  </span>
                </div>
                <button
                  type="button"
                  disabled={chapel.status !== "available"}
                  onClick={() =>
                    onStartBookingWithSelection({ chapelResourceId: chapel.id })
                  }
                  className="px-4 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-wider hover:bg-[#122D28] disabled:opacity-50"
                >
                  Reserve Suite
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Live Availability Ledger */}
        <div className="bg-[#FBF9F5] p-7 border border-[#D9C7A5] space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-medium text-[#242522]">
                Live Sanctuary, Hearse &amp; Crematory Schedule
              </h2>
              <p className="text-xs text-[#5A5751] mt-0.5">
                Active blocks prevent double-booking automatically. Private client names
                remain masked for public guests under RA 10173.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5A5751] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={schedSearch}
                  onChange={(e) => setSchedSearch(e.target.value)}
                  placeholder="Search suite or location..."
                  className="pl-8 pr-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs"
                />
              </div>
              {[
                { key: "all", label: "All" },
                { key: "chapel", label: "Chapels" },
                { key: "vehicle", label: "Hearses" },
                { key: "crematory", label: "Crematory" },
              ].map((flt) => (
                <button
                  key={flt.key}
                  type="button"
                  onClick={() => setResourceFilter(flt.key)}
                  className={`px-3 py-2 text-xs uppercase tracking-wider font-medium border ${
                    resourceFilter === flt.key
                      ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                      : "bg-[#F6F1E8] text-[#242522] border-[#D9C7A5]"
                  }`}
                >
                  {flt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-[#D9C7A5] overflow-x-auto bg-[#F6F1E8]/50">
            {filteredSchedules.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5A5751]">
                No conflicting reservations match that filter—all suites open.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EFE8DC] border-b border-[#D9C7A5] text-[#183B35] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Sanctuary / Resource</th>
                    <th className="py-3.5 px-4">Service Type</th>
                    <th className="py-3.5 px-4">Reservation Details</th>
                    <th className="py-3.5 px-4">Begins</th>
                    <th className="py-3.5 px-4">Concludes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9C7A5]/60">
                  {filteredSchedules.map((slot) => (
                    <tr key={slot.id} className="hover:bg-[#EFE8DC]/40">
                      <td className="py-3.5 px-4 font-semibold text-[#242522]">
                        {slot.resourceName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-[#183B35]/10 text-[#183B35] font-semibold uppercase tracking-wider text-[10px]">
                          {slot.eventType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#242522]">{slot.title}</td>
                      <td className="py-3.5 px-4 font-price text-[#5A5751]">
                        {new Date(slot.startTime).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-price text-[#5A5751]">
                        {new Date(slot.endTime).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MEMORIALS SECTION
  // =========================================================================
  if (section === "memorials") {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#D9C7A5]">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
              Private-by-Default Remembrance
            </span>
            <h1 className="text-4xl sm:text-5xl font-display font-medium text-[#242522]">
              {lang === "fil"
                ? "Pahina ng Pag-alaala at Panalangin"
                : "Family-Controlled Memorial Sanctuary"}
            </h1>
            <p className="text-sm sm:text-base text-[#5A5751]">
              Every memorial page is <strong>private by default</strong>. Families choose
              whether to open public prayers or share a private Family Share Code.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRefreshMemorials(shareCodeInput);
            }}
            className="flex gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              value={shareCodeInput}
              onChange={(e) => setShareCodeInput(e.target.value)}
              placeholder="Share Code (e.g. SANTOS-PEACE-2026)"
              className="flex-1 md:w-64 px-3.5 py-2.5 text-xs font-code border border-[#D9C7A5] bg-[#FBF9F5]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
            >
              <Search className="w-3.5 h-3.5 text-[#D9C7A5]" />
              Unlock
            </button>
          </form>
        </div>

        {memorials.length === 0 ? (
          <div className="bg-[#FBF9F5] p-12 border border-[#D9C7A5] text-center space-y-2">
            <Heart className="w-7 h-7 text-[#183B35] mx-auto" strokeWidth={1.5} />
            <h2 className="text-xl font-display font-medium text-[#242522]">
              No Memorials Match That Share Code
            </h2>
            <p className="text-xs text-[#5A5751]">
              Try sample family share code{" "}
              <code className="font-code bg-[#EFE8DC] border border-[#D9C7A5] px-2 py-0.5">
                SANTOS-PEACE-2026
              </code>{" "}
              above.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {memorials.map((mem) => (
              <div key={mem.id} className="bg-[#FBF9F5] border border-[#D9C7A5]">
                <div className="p-7 sm:p-9 forest-weave text-[#F6F1E8] border-b border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#D9C7A5]">
                      {mem.isPublic ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Shared by Family for Public Remembrance</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Private Memorial • Code: {mem.familyShareCode}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-3xl font-display font-medium">
                      In Loving Memory of {mem.deceasedName}
                    </h2>
                    <p className="text-xs font-price text-[#D9C7A5]/90">
                      {mem.sunriseDate} — {mem.sunsetDate}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={tributeBusy === mem.id}
                    onClick={() => handleLightCandleOrTribute(mem.id, false)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#D9C7A5] text-[#242522] text-xs font-semibold uppercase tracking-wider hover:bg-[#e5d5b5]"
                  >
                    <Flame className="w-4 h-4 text-[#183B35]" />
                    <span>Light a Candle ({mem.candlesCount})</span>
                  </button>
                </div>

                <div className="p-7 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 space-y-5">
                    <p className="text-lg sm:text-xl font-display italic text-[#242522] leading-relaxed">
                      &ldquo;{mem.obituaryText}&rdquo;
                    </p>
                    <div className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] text-xs space-y-1.5 text-[#5A5751]">
                      <p>
                        <strong className="text-[#242522]">Wake Sanctuary:</strong>{" "}
                        {mem.wakeLocationSummary || "Private Family Schedule"}
                      </p>
                      <p>
                        <strong className="text-[#242522]">
                          Interment / Columbarium:
                        </strong>{" "}
                        {mem.intermentSummary || "Coordinated Privately"}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <h3 className="text-lg font-display font-medium text-[#242522]">
                        Prayers &amp; Condolences ({(mem.tributes || []).length})
                      </h3>
                      {(mem.tributes || []).map((tr) => (
                        <div
                          key={tr.id}
                          className="p-4 bg-[#F6F1E8] border border-[#D9C7A5]/80 space-y-1"
                        >
                          <p className="text-sm text-[#242522]">{tr.message}</p>
                          <p className="text-xs text-[#5A5751]">
                            — <strong>{tr.authorName}</strong> ({tr.relationship})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="p-6 bg-[#F6F1E8] border border-[#D9C7A5] space-y-3.5">
                      <h3 className="text-lg font-display font-medium text-[#242522]">
                        Offer a Prayer or Quiet Memory
                      </h3>
                      <input
                        type="text"
                        value={tributeNameByMem[mem.id] || ""}
                        onChange={(e) =>
                          setTributeNameByMem((p) => ({
                            ...p,
                            [mem.id]: e.target.value,
                          }))
                        }
                        placeholder="Your Name"
                        className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#FBF9F5] text-xs sm:text-sm"
                      />
                      <input
                        type="text"
                        value={tributeRelByMem[mem.id] || ""}
                        onChange={(e) =>
                          setTributeRelByMem((p) => ({
                            ...p,
                            [mem.id]: e.target.value,
                          }))
                        }
                        placeholder="Relationship (e.g., Colleague, Cousin)"
                        className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#FBF9F5] text-xs sm:text-sm"
                      />
                      <textarea
                        rows={3}
                        value={tributeMsgByMem[mem.id] || ""}
                        onChange={(e) =>
                          setTributeMsgByMem((p) => ({
                            ...p,
                            [mem.id]: e.target.value,
                          }))
                        }
                        placeholder="Share a comforting memory..."
                        className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#FBF9F5] text-xs sm:text-sm"
                      />
                      <button
                        type="button"
                        disabled={
                          tributeBusy === mem.id ||
                          !(tributeMsgByMem[mem.id] || "").trim()
                        }
                        onClick={() => handleLightCandleOrTribute(mem.id, true)}
                        className="w-full py-3 px-4 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28] disabled:opacity-50"
                      >
                        Post Condolence &amp; Light Candle
                      </button>
                    </div>
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
  // FAQ & RA 10173 PRIVACY SECTION
  // =========================================================================
  if (section === "faq") {
    const faqs = [
      {
        q: "Which civil documents are needed to arrange a funeral or cremation in the Philippines?",
        a: "Typically, the Municipal Form No. 103 (Certificate of Death signed by the attending physician or health officer), a Valid Government ID of the next-of-kin informant, and either a Burial/Transfer Permit or Cremation Authorization. You can upload scans privately in your Case Dashboard at your own pace.",
      },
      {
        q: "Can we save our arrangement as a draft and consult relatives overseas first?",
        a: "Yes. Every step of our online booking wizard includes a 'Save as Draft' button. There are no countdown timers or expiring quotes—take all the time your family needs.",
      },
      {
        q: "How do down payments, installments, and Acknowledgment Receipts work?",
        a: "Once you review and approve your itemized quotation, a 30% initial down payment confirms chapel and coordination schedules. Remaining balances can be settled in installments or in full prior to interment/cremation via PayMongo (TEST MODE) or desk cash, with downloadable Acknowledgment Receipts issued for every payment.",
      },
      {
        q: "Why does this platform have no phone dialers or unsolicited calls?",
        a: "To protect grieving families from sales pressure or intrusive calls, all communication happens calmly through our written 'Message Coordinator' concierge drawer, email updates, or scheduled in-person visits at our Quezon City sanctuary.",
      },
      {
        q: "How is our family’s data protected under RA 10173 (Data Privacy Act of 2012)?",
        a: PRIVACY_NOTICE_EN,
      },
    ];

    const visibleFaqs = faqs.filter(
      (f) =>
        !faqSearch.trim() ||
        `${f.q} ${f.a}`.toLowerCase().includes(faqSearch.toLowerCase())
    );

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-10">
        <div className="space-y-4 pb-6 border-b border-[#D9C7A5]">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guidance &amp; RA 10173 Data Privacy</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-medium text-[#242522]">
            {lang === "fil"
              ? "Mga Madalas Itanong at Data Privacy"
              : "Frequently Asked Questions & Privacy Charter"}
          </h1>
          <div className="relative pt-2">
            <Search className="w-4 h-4 text-[#5A5751] absolute left-3.5 top-1/2 -translate-y-1/2 mt-1" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search topics (documents, drafts, PayMongo, RA 10173)..."
              className="w-full pl-10 pr-4 py-3 border border-[#D9C7A5] bg-[#FBF9F5] text-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          {visibleFaqs.map((item) => (
            <div
              key={item.q}
              className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-2"
            >
              <h2 className="text-xl font-display font-medium text-[#242522]">
                {item.q}
              </h2>
              <p className="text-[#5A5751] text-sm sm:text-base leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>

        <div className="p-7 sm:p-8 forest-weave text-[#F6F1E8] border border-[#D9C7A5] space-y-3">
          <h2 className="text-xl font-display font-medium text-[#D9C7A5]">
            Filipino Privacy Notice Summary (RA 10173)
          </h2>
          <p className="text-sm text-[#F6F1E8]/85 leading-relaxed">
            {PRIVACY_NOTICE_FIL}
          </p>
          <p className="text-xs text-[#D9C7A5] pt-1">
            Data Protection Officer: {FUNERAL_HOME_INFO.dpoEmail} •{" "}
            {FUNERAL_HOME_INFO.dpaRegistration}
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CONTACT SECTION (STRICTLY NO PHONE FEATURES)
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
              Sanctuary Concierge Desk
            </span>
            <h1 className="text-4xl font-display font-medium text-[#242522]">
              {lang === "fil"
                ? "Makipag-ugnayan sa Amin"
                : "Visit Our Sanctuary or Write to a Coordinator"}
            </h1>
            <p className="text-sm sm:text-base text-[#5A5751]">
              We communicate respectfully in writing and in person—never through
              unsolicited calls.
            </p>
          </div>

          <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-5 text-sm text-[#5A5751]">
            <div className="flex items-start gap-3.5">
              <MapPin className="w-4 h-4 text-[#183B35] shrink-0 mt-1" />
              <div>
                <strong className="block text-[#242522]">Sanctuary Address</strong>
                <span>{FUNERAL_HOME_INFO.address}</span>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <Mail className="w-4 h-4 text-[#183B35] shrink-0 mt-1" />
              <div>
                <strong className="block text-[#242522]">
                  Coordinator &amp; Privacy Email
                </strong>
                <span>{FUNERAL_HOME_INFO.supportEmail}</span>
                <span className="block text-xs text-[#5A5751] mt-0.5">
                  DPO: {FUNERAL_HOME_INFO.dpoEmail}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <Clock className="w-4 h-4 text-[#183B35] shrink-0 mt-1" />
              <div>
                <strong className="block text-[#242522]">Sanctuary Hours</strong>
                <span>{FUNERAL_HOME_INFO.visitingHours}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleContactSubmit}
            className="bg-[#FBF9F5] p-7 sm:p-9 border border-[#D9C7A5] space-y-5"
          >
            <h2 className="text-2xl font-display font-medium text-[#242522]">
              Send a Written Inquiry
            </h2>
            {contactStatus && (
              <div className="p-4 bg-[#183B35]/10 border border-[#183B35]/30 text-[#183B35] text-sm">
                {contactStatus}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                Subject
              </label>
              <input
                type="text"
                required
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="e.g., Chapel suite visit or civil registry permit guidance"
                className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                Message
              </label>
              <textarea
                rows={4}
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Write your question at your own pace..."
                className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={contactSubmitting}
              className="px-7 py-3.5 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-[0.16em] hover:bg-[#122D28] disabled:opacity-50"
            >
              {contactSubmitting ? "Sending..." : "Submit Written Inquiry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
