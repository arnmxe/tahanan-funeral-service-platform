"use client";

import React, { useState } from "react";
import { X, MessageSquareHeart, Send, CheckCircle2, ShieldCheck } from "lucide-react";
import type { CoordinatorMessageItem, Language, PortalUser } from "@/types/portal";
import { FUNERAL_HOME_INFO } from "@/lib/constants";

interface CoordinatorDrawerProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  user: PortalUser | null;
  messages: CoordinatorMessageItem[];
  onRefreshMessages: () => Promise<void>;
}

export function CoordinatorDrawer({
  open,
  onClose,
  lang,
  user,
  messages,
  onRefreshMessages,
}: CoordinatorDrawerProps) {
  const [senderName, setSenderName] = useState(user?.fullName || "");
  const [senderEmail, setSenderEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyTextById, setReplyTextById] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  if (!open) return null;

  const isCoordinatorOrAdmin =
    user?.role === "coordinator" || user?.role === "admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: senderName || user?.fullName,
          senderEmail: senderEmail || user?.email,
          subject: subject || "Coordinator Guidance Request",
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Unable to send message." });
      } else {
        setFeedback({
          type: "ok",
          text:
            lang === "fil"
              ? "Naipadala na ang inyong mensahe. Sasagot ang aming Coordinator sa portal at email."
              : "Your message has been received. A Senior Coordinator will respond calmly here and via email.",
        });
        setSubject("");
        setMessage("");
        await onRefreshMessages();
      }
    } catch {
      setFeedback({ type: "err", text: "Network error while sending message." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(msgId: number) {
    const text = (replyTextById[msgId] || "").trim();
    if (!text) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msgId, coordinatorReply: text, status: "responded" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Failed to post reply." });
      } else {
        setReplyTextById((prev) => ({ ...prev, [msgId]: "" }));
        setFeedback({ type: "ok", text: "Reply sent to the family." });
        await onRefreshMessages();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#242522]/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Message a Coordinator"
    >
      <div className="w-full max-w-lg bg-[#F6F1E8] h-full shadow-2xl border-l border-[#D9C7A5] flex flex-col">
        <div className="p-6 bg-[#183B35] text-[#F6F1E8] border-b border-[#D9C7A5] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[#D9C7A5] text-[11px] uppercase tracking-[0.18em] font-semibold mb-1">
              <MessageSquareHeart className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>
                {lang === "fil"
                  ? "Mahinahong Gabay Online (Walang Tawag)"
                  : "Written Concierge Desk (Zero Phone Pressure)"}
              </span>
            </div>
            <h2 className="text-2xl font-display font-medium">
              {lang === "fil" ? "Mensahe sa Coordinator" : "Message a Coordinator"}
            </h2>
            <p className="text-xs text-[#F6F1E8]/75 mt-1">
              {FUNERAL_HOME_INFO.visitingHours}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#D9C7A5] hover:bg-[#122D28]"
            aria-label="Close coordinator drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F6F1E8]">
          {feedback && (
            <div
              className={`p-4 border text-xs sm:text-sm flex items-start gap-2.5 ${
                feedback.type === "ok"
                  ? "bg-[#183B35]/10 border-[#183B35]/35 text-[#183B35]"
                  : "bg-amber-50 border-amber-400 text-amber-950"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#183B35]" />
              <span>{feedback.text}</span>
            </div>
          )}

          {user?.role !== "readme" && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#FBF9F5] p-5 sm:p-6 border border-[#D9C7A5] space-y-4"
            >
              <h3 className="text-lg font-display font-medium text-[#242522]">
                {lang === "fil"
                  ? "Magpadala ng Tanong o Kahilingan"
                  : "Send a Calm Written Inquiry"}
              </h3>
              {!user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1">
                      {lang === "fil" ? "Buong Pangalan" : "Your Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g., Ana Reyes"
                      className="w-full px-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="name@example.ph"
                      className="w-full px-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1">
                  {lang === "fil" ? "Paksa" : "Topic"}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    lang === "fil"
                      ? "Hal. Dokumento sa Civil Registrar o iskedyul ng kapilya"
                      : "e.g., Chapel availability or civil registry permit guidance"
                  }
                  className="w-full px-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#242522] mb-1">
                  {lang === "fil" ? "Mensahe" : "How may we help your family?"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    lang === "fil"
                      ? "Isulat ang inyong tanong. Walang pagmamadali."
                      : "Write any question at your own pace. We respond here and via email."
                  }
                  className="w-full px-3 py-2 border border-[#D9C7A5] bg-[#F6F1E8] text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#5A5751] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#183B35]" />
                  RA 10173 • Web &amp; Email Only
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#183B35] text-[#F6F1E8] text-xs uppercase tracking-wider font-medium hover:bg-[#122D28] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#D9C7A5]" />
                  {submitting
                    ? "Sending..."
                    : lang === "fil"
                    ? "Ipadala"
                    : "Send Message"}
                </button>
              </div>
            </form>
          )}

          {user && (
            <div className="space-y-3">
              <h3 className="text-lg font-display font-medium text-[#242522]">
                {isCoordinatorOrAdmin
                  ? "All Family Coordinator Threads"
                  : lang === "fil"
                  ? "Mga Mensahe at Tugon"
                  : "Conversation History"}
              </h3>
              {messages.length === 0 ? (
                <div className="p-5 bg-[#FBF9F5] border border-[#D9C7A5] text-xs text-[#5A5751]">
                  No messages yet. Questions sent above appear here with your
                  coordinator&apos;s written reply.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 sm:p-5 bg-[#FBF9F5] border border-[#D9C7A5] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-[#242522]">
                        {m.subject}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold ${
                          m.status === "responded"
                            ? "bg-[#183B35]/10 text-[#183B35]"
                            : "bg-[#EFE8DC] text-[#5A5751]"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A5751]">
                      {m.senderName} ({m.senderEmail}) •{" "}
                      {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-[#242522] bg-[#F6F1E8] p-3 border border-[#D9C7A5]/70">
                      {m.message}
                    </p>
                    {m.coordinatorReply && (
                      <div className="pl-3 border-l-2 border-[#183B35] text-xs text-[#242522] space-y-0.5">
                        <p className="font-semibold text-[#183B35]">
                          Reply from {m.repliedByName || "Coordinator"}:
                        </p>
                        <p>{m.coordinatorReply}</p>
                      </div>
                    )}
                    {isCoordinatorOrAdmin && (
                      <div className="pt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyTextById[m.id] || ""}
                          onChange={(e) =>
                            setReplyTextById((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder="Write coordinator response..."
                          className="flex-1 px-3 py-1.5 text-xs border border-[#D9C7A5] bg-[#F6F1E8]"
                        />
                        <button
                          type="button"
                          onClick={() => handleReply(m.id)}
                          disabled={submitting}
                          className="px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium bg-[#183B35] text-[#F6F1E8] hover:bg-[#122D28]"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
