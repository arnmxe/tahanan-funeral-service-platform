"use client";

import React from "react";
import {
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Database,
  CreditCard,
  UserCheck,
  MessageSquareHeart,
  FileCheck2,
} from "lucide-react";
import { FUNERAL_HOME_INFO, ROLE_DIRECTORY } from "@/lib/constants";
import type { PortalUser } from "@/types/portal";

interface ReadmeRoleViewProps {
  user: PortalUser | null;
  onSwitchRole: (email: string) => Promise<void>;
  onNavigate: (view: string) => void;
}

export function ReadmeRoleView({
  user,
  onSwitchRole,
  onNavigate,
}: ReadmeRoleViewProps) {
  const roles = Object.values(ROLE_DIRECTORY);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-10">
      {/* Editorial Sanctuary Header */}
      <div className="forest-weave text-[#F6F1E8] p-7 sm:p-10 border border-[#D9C7A5]">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#122D28] border border-[#D9C7A5]/50 text-[#D9C7A5] text-[11px] font-semibold uppercase tracking-[0.2em]">
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.6} />
              System README &amp; Read-Only Auditor Role
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-medium">
              {FUNERAL_HOME_INFO.shortName} — Architecture &amp; 5-Role Stewardship
            </h1>
            <p className="text-[#F6F1E8]/80 text-sm sm:text-base leading-relaxed">
              Crafted in an editorial luxury-hospitality identity communicating dignity,
              compassion, 100% itemized PHP financial clarity, zero phone pressure, RA
              10173 privacy protection, and server-verified PayMongo TEST MODE checkout.
            </p>
          </div>
          {user?.role === "readme" && (
            <div className="p-5 bg-[#122D28] border border-[#D9C7A5] text-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-[#D9C7A5] uppercase tracking-wider font-semibold">
                <Lock className="w-3.5 h-3.5" />
                Active Session: README Role (Read-Only)
              </div>
              <p className="text-[#F6F1E8]/80 max-w-xs">
                Inspect live Case Dashboards, Schedules, and Financial Reports safely
                without modifying any database records.
              </p>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate("dashboard")}
                  className="px-3.5 py-2 bg-[#D9C7A5] text-[#242522] font-semibold uppercase tracking-wider text-[11px]"
                >
                  Inspect Cases
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("admin")}
                  className="px-3.5 py-2 bg-transparent border border-[#D9C7A5] text-[#F6F1E8] font-semibold uppercase tracking-wider text-[11px]"
                >
                  Inspect Reports
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editorial Compliance & Architecture Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FBF9F5] p-7 border border-[#D9C7A5] space-y-4">
          <div className="flex items-center gap-2 text-[#183B35]">
            <MessageSquareHeart className="w-4 h-4" strokeWidth={1.6} />
            <h2 className="text-xl font-display font-medium text-[#242522]">
              1. Design Philosophy &amp; Zero-Phone Policy
            </h2>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-[#5A5751]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">Zero Phone Features:</strong> All
                phone inputs, SMS/OTP prompts, and <code>tel:</code> dialer buttons are
                omitted. Every screen includes a written{" "}
                <strong>&ldquo;Message Coordinator&rdquo;</strong> concierge drawer and
                email support ({FUNERAL_HOME_INFO.supportEmail}).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">Editorial Visual Identity:</strong>{" "}
                Deep Forest Green (<code>#183B35</code>), Warm Ivory (
                <code>#F6F1E8</code>), Champagne Gold (<code>#D9C7A5</code>), Muted Taupe
                (<code>#B7A99A</code>), and Charcoal (<code>#242522</code>), paired with{" "}
                <em>Playfair Display</em>, <em>DM Sans</em>, and <em>Manrope</em>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">Full-Stack Runtime:</strong> Next.js
                App Router + TypeScript + Tailwind CSS + PostgreSQL via Drizzle ORM with
                HTTP-only HMAC session cookies and row-level authorization guards.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">5th Role Added (`readme`):</strong>{" "}
                Dedicated Read-Only Auditor &amp; Documentation role enforced server-side
                across all API endpoints.
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-[#FBF9F5] p-7 border border-[#D9C7A5] space-y-4">
          <div className="flex items-center gap-2 text-[#183B35]">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.6} />
            <h2 className="text-xl font-display font-medium text-[#242522]">
              2. RA 10173 Privacy &amp; PayMongo TEST MODE Verification
            </h2>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-[#5A5751]">
            <li className="flex items-start gap-2.5">
              <FileCheck2 className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">
                  Data Privacy Act of 2012 (RA 10173):
                </strong>{" "}
                Explicit consent is captured before registration and booking. Civil
                documents are stored privately and served only via RBAC-checked{" "}
                <code>/api/documents/[id]</code>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">
                  PayMongo TEST MODE Server Verification:
                </strong>{" "}
                Checkout sessions (GCash Test, Maya Test, Card Test) are HMAC-signed and
                verified server-side in <code>/api/payments</code>. Zero card numbers or
                secret keys touch the frontend or database.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">Acknowledgment Receipts:</strong>{" "}
                Both online test payments and manually recorded cash payments issue
                downloadable PDF <strong>Acknowledgment Receipts</strong> (
                <code>AR-2026-xxxx</code>).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Database className="w-4 h-4 text-[#183B35] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#242522]">17 PostgreSQL Tables Active:</strong>{" "}
                <code>
                  users, packages, add_ons, inventory, resources, document_requirements,
                  bookings, deceased_records, documents, schedules, quotations, invoices,
                  payments, notifications, memorials, audit_logs, coordinator_messages
                </code>
                .
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Complete 5-Role Directory & Instant Switcher */}
      <div className="bg-[#FBF9F5] p-7 sm:p-9 border border-[#D9C7A5] space-y-6">
        <div>
          <h2 className="text-2xl font-display font-medium text-[#242522]">
            3. Role-Based Access Control Matrix &amp; Demo Credentials (5 Roles)
          </h2>
          <p className="text-xs sm:text-sm text-[#5A5751] mt-1">
            Click <strong>Switch to Role</strong> on any card below to test the workflow
            from that role&apos;s perspective.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {roles.map((r) => {
            const isCurrent = user?.role === r.role;
            return (
              <div
                key={r.role}
                className={`p-6 border flex flex-col justify-between gap-5 ${
                  isCurrent
                    ? "bg-[#F6F1E8] border-[#183B35] ring-1 ring-[#183B35]"
                    : "bg-[#F6F1E8]/60 border-[#D9C7A5]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 font-semibold ${r.badgeColor}`}
                    >
                      {r.role}
                    </span>
                    <span className="text-[11px] font-code text-[#5A5751]">
                      {r.demoEmail} / {r.demoPassword}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-medium text-[#242522]">
                    {r.titleEn}{" "}
                    <span className="text-xs font-sans font-normal text-[#5A5751]">
                      ({r.titleFil})
                    </span>
                  </h3>
                  <p className="text-xs text-[#5A5751] leading-relaxed">{r.summary}</p>
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#183B35]">
                      Permitted Actions:
                    </p>
                    <ul className="text-xs text-[#242522] space-y-1 list-disc pl-4">
                      {r.capabilities.map((cap) => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#D9C7A5]/70 flex items-center justify-between">
                  <span className="text-[11px] text-[#5A5751]">
                    {isCurrent ? "Currently active session" : "1-click demo switch"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSwitchRole(r.demoEmail)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-wider font-medium ${
                      isCurrent
                        ? "bg-[#183B35] text-[#D9C7A5]"
                        : "bg-[#183B35] text-[#F6F1E8] hover:bg-[#122D28]"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#D9C7A5]" />
                    {isCurrent ? "Active Role" : `Switch to ${r.titleEn}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
