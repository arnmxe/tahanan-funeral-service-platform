"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  Printer,
  Package,
  Boxes,
  FileCheck,
  Users,
  ShieldAlert,
  BarChart3,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import type {
  AdminUserItem,
  DocumentRequirementItem,
  InventoryItem,
  PackageItem,
  PortalUser,
  ResourceItem,
} from "@/types/portal";
import { formatPhp } from "@/lib/constants";
import { exportCsvRows, printFinancialSummaryPdf } from "@/lib/pdfPrint";
import type { UserRole } from "@/db/schema";

interface AdminConsoleProps {
  user: PortalUser;
  packages: PackageItem[];
  inventory: InventoryItem[];
  resources: ResourceItem[];
  documentRequirements: DocumentRequirementItem[];
  adminUsers: AdminUserItem[];
  onRefreshCatalog: () => Promise<void>;
}

interface ReportsPayload {
  metrics: {
    totalBookingsCount: number;
    activeCasesCount: number;
    completedCasesCount: number;
    totalContractedPhp: number;
    totalCollectedPhp: number;
    totalOutstandingPhp: number;
    onlinePaymongoTotalPhp: number;
    manualCashTotalPhp: number;
    lowStockCount: number;
  };
  packageBreakdown: Array<{
    packageId: number;
    packageName: string;
    category: string;
    bookingsCount: number;
    contractedPhp: number;
  }>;
  csvRows: Array<Record<string, unknown>>;
  auditLogs: Array<{
    id: number;
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    createdAt: string;
  }>;
}

export function AdminConsole({
  user,
  packages,
  inventory,
  resources,
  documentRequirements,
  adminUsers,
  onRefreshCatalog,
}: AdminConsoleProps) {
  const [tab, setTab] = useState<
    "reports" | "packages" | "inventory" | "documents" | "users" | "audit"
  >("reports");
  const [reports, setReports] = useState<ReportsPayload | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [auditFilter, setAuditFilter] = useState("");
  const [invFilter, setInvFilter] = useState("");

  // New Package form
  const [pkgName, setPkgName] = useState("");
  const [pkgCategory, setPkgCategory] = useState("traditional");
  const [pkgPrice, setPkgPrice] = useState("95000");
  const [pkgDays, setPkgDays] = useState("4");
  const [pkgDesc, setPkgDesc] = useState("");

  // New Inventory form
  const [invName, setInvName] = useState("");
  const [invCat, setInvCat] = useState("casket");
  const [invMaterial, setInvMaterial] = useState("Philippine Hardwood");
  const [invPrice, setInvPrice] = useState("42000");
  const [invStock] = useState("4");

  // New Document Requirement form ("Admin can edit the required list")
  const [docReqName, setDocReqName] = useState("");
  const [docReqDesc, setDocReqDesc] = useState("");
  const [docReqApplies, setDocReqApplies] = useState("all");
  const [docReqRequired, setDocReqRequired] = useState(true);

  // New User form
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("coordinator");
  const [newUserTitle, setNewUserTitle] = useState("");

  const isReadOnly = user.role === "readme";

  async function loadReports() {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function mutateCatalog(
    method: "POST" | "PATCH",
    payload: Record<string, unknown>,
    successMsg: string
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/catalog", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: data.error || "Update failed." });
      } else {
        setNotice({ type: "ok", text: successMsg });
        await onRefreshCatalog();
        await loadReports();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#D9C7A5]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#183B35]">
            {isReadOnly
              ? "README Role — Read-Only Executive & Compliance Inspector"
              : "Sanctuary Executive & Stewardship Suite"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#242522] mt-1">
            Operations, Catalog, Reports &amp; RA 10173 Audit
          </h1>
        </div>

        {reports && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() =>
                exportCsvRows(
                  "tahanan_kapayapaan_bookings_report.csv",
                  reports.csvRows
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FBF9F5] border border-[#183B35] text-xs uppercase tracking-wider font-medium text-[#183B35] hover:bg-[#EFE8DC]"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                printFinancialSummaryPdf(reports.metrics, reports.csvRows)
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
            >
              <Printer className="w-3.5 h-3.5 text-[#D9C7A5]" />
              Export PDF Report
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div
          className={`p-4 border text-xs sm:text-sm flex items-start gap-2.5 ${
            notice.type === "ok"
              ? "bg-[#183B35]/10 border-[#183B35]/35 text-[#183B35]"
              : "bg-amber-50 border-amber-400 text-amber-950"
          }`}
        >
          {notice.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#183B35]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-800" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Editorial Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#D9C7A5] pb-3">
        {[
          { key: "reports", label: "Revenue & Bookings", icon: BarChart3 },
          { key: "packages", label: "Packages & Facilities", icon: Package },
          { key: "inventory", label: "Inventory", icon: Boxes },
          { key: "documents", label: "Required Documents", icon: FileCheck },
          { key: "users", label: "Users & 5 Roles", icon: Users },
          { key: "audit", label: "RA 10173 Audit Log", icon: ShieldAlert },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setTab(
                  item.key as
                    | "reports"
                    | "packages"
                    | "inventory"
                    | "documents"
                    | "users"
                    | "audit"
                )
              }
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-wider font-medium border transition ${
                active
                  ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                  : "bg-[#FBF9F5] text-[#242522] border-[#D9C7A5] hover:border-[#183B35]"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  active ? "text-[#D9C7A5]" : "text-[#183B35]"
                }`}
                strokeWidth={1.6}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPORTS */}
      {tab === "reports" && (
        <div className="space-y-8">
          {loadingReports || !reports ? (
            <div className="p-10 bg-[#FBF9F5] border border-[#D9C7A5] text-xs sm:text-sm text-[#5A5751]">
              Loading financial and operational metrics...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[#FBF9F5] p-6 border border-[#D9C7A5]">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5A5751]">
                    Contracted Service Value
                  </span>
                  <p className="text-2xl font-price font-bold text-[#242522] mt-1">
                    {formatPhp(reports.metrics.totalContractedPhp)}
                  </p>
                  <span className="text-xs text-[#5A5751]">
                    {reports.metrics.activeCasesCount} active/completed cases
                  </span>
                </div>
                <div className="bg-[#FBF9F5] p-6 border border-[#D9C7A5]">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5A5751]">
                    Total Verified Collected
                  </span>
                  <p className="text-2xl font-price font-bold text-[#183B35] mt-1">
                    {formatPhp(reports.metrics.totalCollectedPhp)}
                  </p>
                  <span className="text-xs font-price text-[#5A5751]">
                    PayMongo Test: {formatPhp(reports.metrics.onlinePaymongoTotalPhp)}
                  </span>
                </div>
                <div className="bg-[#FBF9F5] p-6 border border-[#D9C7A5]">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#5A5751]">
                    Desk Cash / Bank Recorded
                  </span>
                  <p className="text-2xl font-price font-bold text-[#242522] mt-1">
                    {formatPhp(reports.metrics.manualCashTotalPhp)}
                  </p>
                  <span className="text-xs text-[#5A5751]">
                    Issued Acknowledgment Receipts
                  </span>
                </div>
                <div className="bg-[#183B35] text-[#F6F1E8] p-6 border border-[#183B35]">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-[#D9C7A5]">
                    Open Family Balances
                  </span>
                  <p className="text-2xl font-price font-extrabold mt-1">
                    {formatPhp(reports.metrics.totalOutstandingPhp)}
                  </p>
                  <span className="text-xs text-[#F6F1E8]/80">
                    {reports.metrics.completedCasesCount} cases completed
                  </span>
                </div>
              </div>

              <div className="bg-[#FBF9F5] border border-[#D9C7A5] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#D9C7A5]">
                  <h2 className="text-xl font-display font-medium text-[#242522]">
                    Bookings &amp; Revenue by Service Package
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-[#EFE8DC] border-b border-[#D9C7A5] text-[#183B35] uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="text-left py-3.5 px-4">Package Name</th>
                        <th className="text-left py-3.5 px-4">Category</th>
                        <th className="text-right py-3.5 px-4">Bookings</th>
                        <th className="text-right py-3.5 px-4">Contracted Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9C7A5]/60">
                      {reports.packageBreakdown.map((row) => (
                        <tr key={row.packageId} className="hover:bg-[#F6F1E8]">
                          <td className="py-3.5 px-4 font-semibold text-[#242522]">
                            {row.packageName}
                          </td>
                          <td className="py-3.5 px-4 uppercase text-xs text-[#5A5751]">
                            {row.category}
                          </td>
                          <td className="py-3.5 px-4 text-right font-price">
                            {row.bookingsCount}
                          </td>
                          <td className="py-3.5 px-4 text-right font-price font-bold text-[#183B35]">
                            {formatPhp(row.contractedPhp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PACKAGES & RESOURCES */}
      {tab === "packages" && (
        <div className="space-y-6">
          {!isReadOnly && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutateCatalog(
                  "POST",
                  {
                    entity: "package",
                    name: pkgName,
                    category: pkgCategory,
                    pricePhp: Number(pkgPrice),
                    durationDays: Number(pkgDays),
                    description: pkgDesc,
                  },
                  "New service package created."
                );
                setPkgName("");
                setPkgDesc("");
              }}
              className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4"
            >
              <h2 className="text-xl font-display font-medium text-[#242522]">
                Create Service Package
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="Package Name"
                  className="sm:col-span-2 px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <select
                  value={pkgCategory}
                  onChange={(e) => setPkgCategory(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                >
                  <option value="traditional">Traditional</option>
                  <option value="cremation">Cremation</option>
                  <option value="direct">Direct Care</option>
                </select>
                <input
                  type="number"
                  required
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(e.target.value)}
                  placeholder="Price PHP"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm font-price"
                />
                <input
                  type="number"
                  required
                  value={pkgDays}
                  onChange={(e) => setPkgDays(e.target.value)}
                  placeholder="Days"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm font-price"
                />
                <input
                  type="text"
                  required
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  placeholder="Compassionate plain-language package description"
                  className="sm:col-span-3 px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9C7A5]" />
                Add Package
              </button>
            </form>
          )}

          <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-3">
            <h2 className="text-xl font-display font-medium text-[#242522]">
              Active &amp; Archived Packages
            </h2>
            {packages.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <strong className="text-sm text-[#242522]">{p.name}</strong>
                  <span className="block text-xs font-price text-[#5A5751]">
                    {formatPhp(p.pricePhp)} • {p.durationDays} days •{" "}
                    {p.active ? "Published" : "Hidden"}
                  </span>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      mutateCatalog(
                        "PATCH",
                        { entity: "package", id: p.id, active: !p.active },
                        `Package "${p.name}" visibility updated.`
                      )
                    }
                    className="px-3.5 py-1.5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs uppercase tracking-wider font-medium text-[#242522] hover:border-[#183B35]"
                  >
                    {p.active ? "Hide from Public" : "Publish"}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-3">
            <h2 className="text-xl font-display font-medium text-[#242522]">
              Chapels, Hearse Vehicles &amp; Crematory Suites
            </h2>
            {resources.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <strong className="text-sm text-[#242522]">{r.name}</strong>
                  <span className="block text-xs text-[#5A5751]">
                    {r.type.toUpperCase()} • {r.capacity} • Status: {r.status}
                  </span>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      mutateCatalog(
                        "PATCH",
                        {
                          entity: "resource",
                          id: r.id,
                          status:
                            r.status === "available" ? "maintenance" : "available",
                        },
                        `Resource "${r.name}" status toggled.`
                      )
                    }
                    className="px-3.5 py-1.5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs uppercase tracking-wider font-medium text-[#242522] hover:border-[#183B35]"
                  >
                    {r.status === "available" ? "Set Maintenance" : "Mark Available"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY */}
      {tab === "inventory" && (
        <div className="space-y-6">
          {!isReadOnly && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutateCatalog(
                  "POST",
                  {
                    entity: "inventory",
                    name: invName,
                    category: invCat,
                    material: invMaterial,
                    pricePhp: Number(invPrice),
                    stockCount: Number(invStock),
                  },
                  "Inventory showroom item added."
                );
                setInvName("");
              }}
              className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4"
            >
              <h2 className="text-xl font-display font-medium text-[#242522]">
                Add Casket or Cremation Urn
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Item Name"
                  className="sm:col-span-2 px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <select
                  value={invCat}
                  onChange={(e) => setInvCat(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                >
                  <option value="casket">Casket</option>
                  <option value="urn">Urn</option>
                </select>
                <input
                  type="text"
                  value={invMaterial}
                  onChange={(e) => setInvMaterial(e.target.value)}
                  placeholder="Material"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <input
                  type="number"
                  value={invPrice}
                  onChange={(e) => setInvPrice(e.target.value)}
                  placeholder="Price PHP"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm font-price"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28]"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9C7A5]" />
                Add Showroom Item
              </button>
            </form>
          )}

          <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl font-display font-medium text-[#242522]">
                Inventory Stock Ledger
              </h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5A5751] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={invFilter}
                  onChange={(e) => setInvFilter(e.target.value)}
                  placeholder="Filter SKU or item..."
                  className="pl-8 pr-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs"
                />
              </div>
            </div>
            {inventory
              .filter(
                (i) =>
                  !invFilter.trim() ||
                  `${i.name} ${i.sku} ${i.material}`
                    .toLowerCase()
                    .includes(invFilter.toLowerCase())
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <strong className="text-sm text-[#242522]">{item.name}</strong>
                    <span className="block text-xs text-[#5A5751] font-price">
                      {item.sku} • {formatPhp(item.pricePhp)} • Stock:{" "}
                      <strong className="text-[#183B35]">{item.stockCount}</strong>
                    </span>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy || item.stockCount <= 0}
                        onClick={() =>
                          mutateCatalog(
                            "PATCH",
                            {
                              entity: "inventory",
                              id: item.id,
                              stockCount: item.stockCount - 1,
                            },
                            "Stock decremented."
                          )
                        }
                        className="px-3.5 py-1.5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs font-semibold text-[#242522]"
                      >
                        -1 Stock
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          mutateCatalog(
                            "PATCH",
                            {
                              entity: "inventory",
                              id: item.id,
                              stockCount: item.stockCount + 1,
                            },
                            "Stock incremented."
                          )
                        }
                        className="px-3.5 py-1.5 bg-[#183B35] text-[#F6F1E8] text-xs font-semibold"
                      >
                        +1 Stock
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: EDITABLE REQUIRED DOCUMENTS LIST */}
      {tab === "documents" && (
        <div className="space-y-6">
          {!isReadOnly && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutateCatalog(
                  "POST",
                  {
                    entity: "document_requirement",
                    name: docReqName,
                    description: docReqDesc,
                    appliesTo: docReqApplies,
                    isRequired: docReqRequired,
                  },
                  "Added document requirement to client booking & case checklists."
                );
                setDocReqName("");
                setDocReqDesc("");
              }}
              className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4"
            >
              <h2 className="text-xl font-display font-medium text-[#242522]">
                Edit Required Civil Document List
              </h2>
              <p className="text-xs text-[#5A5751]">
                Changes immediately sync to the Booking Wizard and Client Case Upload
                Checklist.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={docReqName}
                  onChange={(e) => setDocReqName(e.target.value)}
                  placeholder="Document Name (e.g. Affidavit of Next-of-Kin)"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <input
                  type="text"
                  required
                  value={docReqDesc}
                  onChange={(e) => setDocReqDesc(e.target.value)}
                  placeholder="Instructions for families"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <select
                  value={docReqApplies}
                  onChange={(e) => setDocReqApplies(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                >
                  <option value="all">Applies to All Services</option>
                  <option value="interment">Interment Only</option>
                  <option value="cremation">Cremation Only</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs sm:text-sm text-[#242522]">
                  <input
                    type="checkbox"
                    checked={docReqRequired}
                    onChange={(e) => setDocReqRequired(e.target.checked)}
                    className="w-4 h-4 accent-[#183B35]"
                  />
                  <span>Mark as Mandatory Requirement</span>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                >
                  Add to Required List
                </button>
              </div>
            </form>
          )}

          <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-3">
            <h3 className="text-xl font-display font-medium text-[#242522]">
              Configured Document Checklist Rules
            </h3>
            {documentRequirements.map((req) => (
              <div
                key={req.id}
                className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <strong className="text-sm text-[#242522]">{req.name}</strong>
                  <span className="block text-xs text-[#5A5751]">
                    {req.description} • {req.appliesTo.toUpperCase()} •{" "}
                    {req.isRequired ? "Mandatory" : "Optional"} •{" "}
                    {req.active ? "Active" : "Disabled"}
                  </span>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        mutateCatalog(
                          "PATCH",
                          {
                            entity: "document_requirement",
                            id: req.id,
                            isRequired: !req.isRequired,
                          },
                          "Toggled mandatory/optional status."
                        )
                      }
                      className="px-3.5 py-1.5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs font-medium text-[#242522]"
                    >
                      {req.isRequired ? "Make Optional" : "Make Required"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        mutateCatalog(
                          "PATCH",
                          {
                            entity: "document_requirement",
                            id: req.id,
                            active: !req.active,
                          },
                          "Updated document rule visibility."
                        )
                      }
                      className="px-3.5 py-1.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
                    >
                      {req.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USERS & ROLES */}
      {tab === "users" && (
        <div className="space-y-6">
          {!isReadOnly && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutateCatalog(
                  "POST",
                  {
                    entity: "user",
                    fullName: newUserName,
                    email: newUserEmail,
                    role: newUserRole,
                    staffTitle: newUserTitle,
                  },
                  "Created portal user account."
                );
                setNewUserName("");
                setNewUserEmail("");
                setNewUserTitle("");
              }}
              className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4"
            >
              <h2 className="text-xl font-display font-medium text-[#242522]">
                Create Portal Account (Supports All 5 Roles)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email Address"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                >
                  <option value="coordinator">Coordinator</option>
                  <option value="staff">Driver / Staff</option>
                  <option value="client">Family / Client</option>
                  <option value="admin">Admin / Owner</option>
                  <option value="readme">README (Read-Only Auditor)</option>
                </select>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  placeholder="Staff Title / Role Note"
                  className="px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium"
              >
                Create User Account
              </button>
            </form>
          )}

          <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-3">
            <h3 className="text-xl font-display font-medium text-[#242522]">
              Registered Accounts ({adminUsers.length})
            </h3>
            {adminUsers.map((u) => (
              <div
                key={u.id}
                className="p-4 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <strong className="text-sm text-[#242522]">{u.fullName}</strong>
                  <span className="block text-xs text-[#5A5751]">
                    {u.email} • Role:{" "}
                    <strong className="text-[#183B35]">{u.role.toUpperCase()}</strong>{" "}
                    • {u.staffTitle}
                  </span>
                </div>
                {!isReadOnly && (
                  <select
                    value={u.role}
                    disabled={busy || u.id === user.id}
                    onChange={(e) =>
                      mutateCatalog(
                        "PATCH",
                        { entity: "user", id: u.id, role: e.target.value },
                        `Updated ${u.fullName} role.`
                      )
                    }
                    className="px-3 py-1.5 text-xs border border-[#D9C7A5] bg-[#FBF9F5] font-medium"
                  >
                    <option value="client">client</option>
                    <option value="coordinator">coordinator</option>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                    <option value="readme">readme</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG */}
      {tab === "audit" && (
        <div className="bg-[#FBF9F5] p-6 sm:p-7 border border-[#D9C7A5] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-display font-medium text-[#242522]">
                Immutable RA 10173 Security &amp; Transaction Audit Log
              </h2>
              <p className="text-xs text-[#5A5751]">
                Records logins, document verifications, quotation approvals, and
                server-verified PayMongo test payments.
              </p>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5A5751] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="Search action, actor, or ref..."
                className="pl-8 pr-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs w-64"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto">
            {(reports?.auditLogs || [])
              .filter(
                (l) =>
                  !auditFilter.trim() ||
                  `${l.action} ${l.summary} ${l.actorName} ${l.entityId}`
                    .toLowerCase()
                    .includes(auditFilter.toLowerCase())
              )
              .map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-code font-semibold px-2 py-0.5 bg-[#183B35] text-[#D9C7A5] text-[10px] uppercase tracking-wider">
                        {log.action}
                      </span>
                      <span className="font-semibold text-[#242522]">
                        {log.actorName} ({log.actorRole})
                      </span>
                    </div>
                    <p className="text-[#5A5751]">{log.summary}</p>
                  </div>
                  <span className="font-price text-[#5A5751] shrink-0 text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
