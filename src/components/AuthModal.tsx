"use client";

import React, { useState } from "react";
import { X, ShieldCheck, KeyRound, UserCheck } from "lucide-react";
import type { DemoAccountInfo, Language, PortalUser } from "@/types/portal";
import { PRIVACY_NOTICE_EN, PRIVACY_NOTICE_FIL, ROLE_DIRECTORY } from "@/lib/constants";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  demoAccounts: DemoAccountInfo[];
  onAuthenticated: (user: PortalUser) => Promise<void>;
}

export function AuthModal({
  open,
  onClose,
  lang,
  demoAccounts,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<"demo" | "login" | "register">("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleDemoSwitch(demoEmail: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo_switch", email: demoEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to switch demo account.");
      } else {
        await onAuthenticated(data.user);
        onClose();
      }
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload =
        mode === "login"
          ? { action: "login", email, password }
          : {
              action: "register",
              fullName,
              email,
              password,
              privacyConsent,
              preferredLanguage: lang,
            };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed.");
      } else {
        await onAuthenticated(data.user);
        onClose();
      }
    } catch {
      setError("Network error during authentication.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242522]/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-[#FBF9F5] border border-[#D9C7A5] shadow-2xl overflow-hidden my-8">
        <div className="p-6 bg-[#183B35] text-[#F6F1E8] border-b border-[#D9C7A5] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#D9C7A5] font-semibold">
              {lang === "fil"
                ? "Ligtas na Portal ng Pamilya at Kawani"
                : "Sanctuary Role-Based Access"}
            </p>
            <h2 className="text-2xl font-display font-medium mt-1">
              {lang === "fil"
                ? "Mag-sign In o Pumili ng Demo Role"
                : "Sign In or Switch Demo Role"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#D9C7A5] hover:bg-[#122D28]"
            aria-label="Close sign in dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 flex gap-4 border-b border-[#D9C7A5] bg-[#F6F1E8]">
          {[
            { key: "demo", label: "5 Demo Roles" },
            { key: "login", label: lang === "fil" ? "Mag-sign In" : "Email Sign In" },
            {
              key: "register",
              label: lang === "fil" ? "Gumawa ng Account" : "Create Family Account",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setMode(tab.key as "demo" | "login" | "register");
                setError(null);
              }}
              className={`py-2.5 text-xs uppercase tracking-wider font-semibold border-b-2 transition ${
                mode === tab.key
                  ? "text-[#183B35] border-[#183B35]"
                  : "text-[#5A5751] border-transparent hover:text-[#242522]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-7 space-y-4 max-h-[75vh] overflow-y-auto bg-[#FBF9F5]">
          {error && (
            <div className="p-3.5 bg-amber-50 border border-amber-400 text-amber-950 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {mode === "demo" && (
            <div className="space-y-3.5">
              <p className="text-xs sm:text-sm text-[#5A5751]">
                Select any of the 5 role accounts below (including the{" "}
                <strong className="text-[#242522]">
                  README / Read-Only Auditor Role
                </strong>
                ) to inspect its live sanctuary workspace:
              </p>
              <div className="grid grid-cols-1 gap-3">
                {demoAccounts.map((acct) => {
                  const meta = ROLE_DIRECTORY[acct.role];
                  return (
                    <div
                      key={acct.role}
                      className="p-4 sm:p-5 bg-[#F6F1E8] border border-[#D9C7A5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#183B35] transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 font-semibold ${
                              meta?.badgeColor || "bg-[#183B35] text-[#F6F1E8]"
                            }`}
                          >
                            {acct.role}
                          </span>
                          <span className="font-display font-semibold text-base text-[#242522]">
                            {lang === "fil" ? acct.titleFil : acct.titleEn}
                          </span>
                        </div>
                        <p className="text-[11px] font-code text-[#5A5751]">
                          {acct.email} • {meta?.demoPassword}
                        </p>
                        <p className="text-xs text-[#5A5751] leading-relaxed">
                          {acct.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleDemoSwitch(acct.email)}
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28] disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#D9C7A5]" />
                        Enter Role
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mode !== "demo" && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                    {lang === "fil" ? "Buong Pangalan" : "Full Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Juan Dela Cruz"
                    className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria.santos@example.ph"
                  className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 border border-[#D9C7A5] bg-[#F6F1E8] text-sm"
                />
              </div>

              {mode === "register" && (
                <div className="p-4 bg-[#EFE8DC]/70 border border-[#D9C7A5] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#183B35]">
                    <ShieldCheck className="w-4 h-4 text-[#183B35]" />
                    Data Privacy Act of 2012 (RA 10173) Notice &amp; Consent
                  </div>
                  <p className="text-xs text-[#5A5751] leading-relaxed">
                    {lang === "fil" ? PRIVACY_NOTICE_FIL : PRIVACY_NOTICE_EN}
                  </p>
                  <label className="flex items-start gap-2.5 pt-1 text-xs sm:text-sm text-[#242522] cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#183B35]"
                    />
                    <span>
                      {lang === "fil"
                        ? "Nabasa at sinasang-ayunan ko ang patakaran sa RA 10173 Data Privacy."
                        : "I have read and consent to the RA 10173 Data Privacy Notice."}
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#122D28] disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4 text-[#D9C7A5]" />
                {loading
                  ? "Signing in..."
                  : mode === "login"
                  ? "Sign In to Sanctuary Portal"
                  : "Create Family Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
