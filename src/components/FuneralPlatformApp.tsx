"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  Globe,
  LogOut,
  Menu,
  MessageSquareHeart,
  ShieldCheck,
  UserCircle2,
  X,
  LayoutDashboard,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import type {
  AddOnItem,
  AdminUserItem,
  CoordinatorMessageItem,
  DemoAccountInfo,
  DocumentRequirementItem,
  EnrichedBooking,
  InventoryItem,
  Language,
  MemorialRecord,
  NotificationItem,
  PackageItem,
  PortalUser,
  ResourceItem,
  ScheduleItem,
  StaffMemberInfo,
} from "@/types/portal";
import { FUNERAL_HOME_INFO, ROLE_DIRECTORY } from "@/lib/constants";
import { PublicShowcase } from "./PublicShowcase";
import { BookingWizard } from "./BookingWizard";
import { CaseDashboard } from "./CaseDashboard";
import { AdminConsole } from "./AdminConsole";
import { ReadmeRoleView } from "./ReadmeRoleView";
import { AuthModal } from "./AuthModal";
import { CoordinatorDrawer } from "./CoordinatorDrawer";

export function FuneralPlatformApp() {
  const [view, setView] = useState<string>("home");
  const [lang, setLang] = useState<Language>("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Demo Role state
  const [user, setUser] = useState<PortalUser | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountInfo[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Catalog & Core Data
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [documentRequirements, setDocumentRequirements] = useState<
    DocumentRequirementItem[]
  >([]);
  const [staffDirectory, setStaffDirectory] = useState<StaffMemberInfo[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);

  // Bookings, Schedules, Memorials, Notifications, Coordinator Messages
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [memorials, setMemorials] = useState<MemorialRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const [coordDrawerOpen, setCoordDrawerOpen] = useState(false);
  const [coordMessages, setCoordMessages] = useState<CoordinatorMessageItem[]>([]);

  const [wizardSelection, setWizardSelection] = useState<{
    packageId?: number;
    casketInventoryId?: number;
    chapelResourceId?: number;
  }>({});

  const fetchCatalog = useCallback(async () => {
    const res = await fetch("/api/catalog");
    if (res.ok) {
      const data = await res.json();
      setPackages(data.packages || []);
      setAddOns(data.addOns || []);
      setInventory(data.inventory || []);
      setResources(data.resources || []);
      setDocumentRequirements(data.documentRequirements || []);
      setStaffDirectory(data.staffDirectory || []);
      setAdminUsers(data.adminUsers || []);
    }
  }, []);

  const fetchMemorials = useCallback(async (code?: string) => {
    const qs = code ? `?code=${encodeURIComponent(code)}` : "";
    const res = await fetch(`/api/memorials${qs}`);
    if (res.ok) {
      const data = await res.json();
      setMemorials(data.memorials || []);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    if (res.ok) {
      const data = await res.json();
      setSchedules(data.schedules || []);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings || []);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    }
  }, []);

  const fetchCoordMessages = useCallback(async () => {
    const res = await fetch("/api/support");
    if (res.ok) {
      const data = await res.json();
      setCoordMessages(data.messages || []);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchCatalog(),
      fetchBookings(),
      fetchSchedules(),
      fetchMemorials(),
      fetchNotifications(),
      fetchCoordMessages(),
    ]);
  }, [
    fetchCatalog,
    fetchBookings,
    fetchSchedules,
    fetchMemorials,
    fetchNotifications,
    fetchCoordMessages,
  ]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const authRes = await fetch("/api/auth");
        if (authRes.ok && mounted) {
          const authData = await authRes.json();
          setUser(authData.user || null);
          setDemoAccounts(authData.demoAccounts || []);
          if (authData.user?.preferredLanguage === "fil") {
            setLang("fil");
          }
        }
        if (mounted) {
          await refreshAll();
        }
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [refreshAll]);

  async function handleAuthenticated(nextUser: PortalUser) {
    setUser(nextUser);
    if (nextUser.preferredLanguage === "fil") setLang("fil");
    await refreshAll();
    if (nextUser.role === "readme") {
      setView("readme");
    } else if (nextUser.role === "admin") {
      setView("admin");
    } else {
      setView("dashboard");
    }
  }

  async function handleSwitchRoleByEmail(email: string) {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demo_switch", email }),
    });
    if (res.ok) {
      const data = await res.json();
      await handleAuthenticated(data.user);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setBookings([]);
    setNotifications([]);
    setUnreadCount(0);
    setView("home");
    await Promise.all([fetchCatalog(), fetchSchedules(), fetchMemorials()]);
  }

  async function toggleLanguage() {
    const next: Language = lang === "en" ? "fil" : "en";
    setLang(next);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_language", language: next }),
    });
  }

  async function markAllNotificationsRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    await fetchNotifications();
  }

  const publicNavItems = [
    { key: "home", en: "Overview", fil: "Buod" },
    { key: "packages", en: "Packages & Pricing", fil: "Presyo at Serbisyo" },
    { key: "caskets", en: "Caskets & Urns", fil: "Ataul at Urna" },
    { key: "chapels", en: "Chapels & Calendar", fil: "Kapilya at Iskedyul" },
    { key: "memorials", en: "Memorials", fil: "Pag-alaala" },
    { key: "faq", en: "FAQ & Privacy", fil: "FAQ at Privacy" },
    { key: "contact", en: "Contact", fil: "Ugnayan" },
  ];

  const drafts = bookings.filter((b) => b.status === "draft");

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F1E8] text-[#242522]">
      {/* Subtle Top Editorial Sanctuary Ribbon */}
      <div className="bg-[#183B35] text-[#F6F1E8]/90 text-xs border-b border-[#D9C7A5]/25">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 tracking-wide text-[#D9C7A5] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D9C7A5]" strokeWidth={1.6} />
              {FUNERAL_HOME_INFO.city}
            </span>
            <span className="hidden md:inline text-[#D9C7A5]/35">•</span>
            <span className="hidden md:inline text-[#F6F1E8]/80">
              24-Hour Sanctuary Chapels • RA 10173 Privacy Compliant • Written Concierge Support
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("readme")}
              className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-widest transition ${
                view === "readme"
                  ? "text-[#D9C7A5] underline underline-offset-4"
                  : "text-[#F6F1E8]/80 hover:text-[#D9C7A5]"
              }`}
            >
              <BookOpen className="w-3 h-3" strokeWidth={1.6} />
              <span>README &amp; Roles</span>
            </button>
            <span className="text-[#D9C7A5]/35">|</span>
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-[#F6F1E8]/85 hover:text-[#D9C7A5] transition"
            >
              <Globe className="w-3 h-3 text-[#D9C7A5]" strokeWidth={1.6} />
              <span>{lang === "en" ? "EN / Filipino" : "FIL / English"}</span>
            </button>
            <span className="text-[#D9C7A5]/35">|</span>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-2.5 py-0.5 border border-[#D9C7A5]/50 text-[#D9C7A5] text-[11px] uppercase tracking-wider hover:bg-[#D9C7A5]/15 transition"
            >
              {user ? `Role: ${user.role}` : "Demo Roles (5)"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Warm Ivory Editorial Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#F6F1E8]/95 backdrop-blur-md border-b border-[#D9C7A5]/80">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo Crest & Editorial Wordmark */}
          <button
            type="button"
            onClick={() => setView("home")}
            className="flex items-center gap-3 text-left group shrink-0"
          >
            <div className="w-10 h-10 bg-[#183B35] border border-[#D9C7A5] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-[1.02]">
              <svg
                viewBox="0 0 32 32"
                className="w-6 h-6 text-[#D9C7A5]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <path d="M8 26V14a8 8 0 0 1 16 0v12" />
                <path d="M16 9v17" />
                <path d="M12.5 16.5C14 15 15.2 14.2 16 13c.8 1.2 2 2 3.5 3.5" />
                <line x1="6" y1="26" x2="26" y2="26" />
              </svg>
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-display font-semibold text-[#183B35] leading-tight tracking-tight">
                Tahanan ng Kapayapaan
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[#5A5751] mt-0.5">
                Memorial Chapels &amp; Sanctuary
              </span>
            </div>
          </button>

          {/* Desktop Refined Editorial Navigation */}
          <nav className="hidden xl:flex items-center gap-5">
            {publicNavItems.map((item) => {
              const isActive = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`relative py-2 text-[13.5px] font-medium tracking-wide transition-colors duration-200 ${
                    isActive
                      ? "text-[#183B35] font-semibold"
                      : "text-[#242522]/80 hover:text-[#183B35]"
                  }`}
                >
                  <span>{lang === "fil" ? item.fil : item.en}</span>
                  <span
                    className={`absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-[#183B35] transition-transform duration-300 origin-left ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: Message Coordinator + Start Booking + User Workspace */}
          <div className="flex items-center gap-2.5">
            {user && (
              <div className="flex items-center gap-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border transition ${
                    view === "dashboard"
                      ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                      : "bg-[#FBF9F5] text-[#183B35] border-[#D9C7A5] hover:border-[#183B35]"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span className="hidden md:inline">
                    {user.role === "staff" ? "Schedule" : "Cases"}
                  </span>
                </button>

                {(user.role === "admin" || user.role === "readme") && (
                  <button
                    type="button"
                    onClick={() => setView("admin")}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border transition ${
                      view === "admin"
                        ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                        : "bg-[#FBF9F5] text-[#183B35] border-[#D9C7A5] hover:border-[#183B35]"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span className="hidden md:inline">Admin</span>
                  </button>
                )}

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((o) => !o)}
                    aria-label="Notifications"
                    className="relative p-2 bg-[#FBF9F5] border border-[#D9C7A5] text-[#183B35] hover:border-[#183B35] transition"
                  >
                    <Bell className="w-4 h-4" strokeWidth={1.6} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#183B35] text-[#D9C7A5] text-[10px] font-price font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FBF9F5] shadow-2xl border border-[#D9C7A5] p-5 z-50 space-y-3">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#D9C7A5]/60">
                        <strong className="text-xs uppercase tracking-widest text-[#183B35] font-semibold">
                          Updates ({unreadCount} unread)
                        </strong>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="text-xs text-[#183B35] underline underline-offset-4 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-2.5">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-[#5A5751] py-4 text-center">
                            No notifications at this moment.
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 border text-xs space-y-1 ${
                                n.isRead
                                  ? "bg-[#F6F1E8]/70 border-[#D9C7A5]/50"
                                  : "bg-[#EFE8DC] border-[#183B35]/40"
                              }`}
                            >
                              <strong className="block text-[#242522]">
                                {n.title}
                              </strong>
                              <p className="text-[#5A5751]">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message Coordinator Button */}
            <button
              type="button"
              onClick={() => setCoordDrawerOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#FBF9F5] border border-[#B7A99A] text-[#183B35] text-xs font-medium tracking-wide hover:border-[#183B35] hover:bg-[#EFE8DC]/60 transition-colors duration-200"
            >
              <MessageSquareHeart className="w-3.5 h-3.5 text-[#183B35]" strokeWidth={1.6} />
              <span>
                {lang === "fil" ? "Mensahe sa Coordinator" : "Message Coordinator"}
              </span>
            </button>

            {/* Start Booking Primary Editorial CTA */}
            <button
              type="button"
              onClick={() => setView("booking")}
              className={`hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium tracking-wider uppercase transition-all duration-200 ${
                view === "booking"
                  ? "bg-[#122D28] text-[#D9C7A5] border border-[#183B35]"
                  : "bg-[#183B35] text-[#F6F1E8] border border-[#183B35] hover:bg-[#122D28]"
              }`}
            >
              <span>{lang === "fil" ? "Simulan ang Booking" : "Start Booking"}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D9C7A5]" strokeWidth={1.7} />
            </button>

            {user ? (
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  title="Switch Account or Demo Role"
                  className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    ROLE_DIRECTORY[user.role]?.badgeColor ||
                    "bg-[#183B35] text-[#F6F1E8]"
                  }`}
                >
                  {user.role}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 bg-[#FBF9F5] border border-[#D9C7A5] text-[#5A5751] hover:text-[#183B35] transition"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.6} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-transparent border border-[#D9C7A5] text-[#242522] text-xs font-medium hover:border-[#183B35] transition"
              >
                <UserCircle2 className="w-3.5 h-3.5 text-[#183B35]" strokeWidth={1.6} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((m) => !m)}
              className="xl:hidden p-2 bg-[#FBF9F5] border border-[#D9C7A5] text-[#183B35]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={1.6} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={1.6} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Editorial Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#F6F1E8] border-t border-[#D9C7A5] px-4 sm:px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {publicNavItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setView(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3.5 py-2.5 text-xs font-medium text-left border transition ${
                    view === item.key
                      ? "bg-[#183B35] text-[#F6F1E8] border-[#183B35]"
                      : "bg-[#FBF9F5] border-[#D9C7A5] text-[#242522]"
                  }`}
                >
                  {lang === "fil" ? item.fil : item.en}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setView("readme");
                  setMobileMenuOpen(false);
                }}
                className="px-3.5 py-2.5 text-xs font-medium text-left bg-[#FBF9F5] border border-[#D9C7A5] text-[#183B35]"
              >
                README &amp; Roles
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#D9C7A5]/60">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCoordDrawerOpen(true);
                }}
                className="flex-1 py-2.5 px-4 bg-[#FBF9F5] border border-[#183B35] text-[#183B35] text-xs font-medium"
              >
                Message Coordinator
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("booking");
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 px-4 bg-[#183B35] text-[#F6F1E8] text-xs font-medium uppercase tracking-wider"
              >
                Start Booking
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1">
        {loadingInitial ? (
          <div className="max-w-3xl mx-auto px-4 py-28 text-center space-y-4">
            <div className="w-9 h-9 border border-[#D9C7A5] border-t-[#183B35] rounded-full animate-spin mx-auto" />
            <p className="text-[#5A5751] font-display italic text-lg">
              Preparing sanctuary arrangements...
            </p>
          </div>
        ) : view === "readme" ? (
          <ReadmeRoleView
            user={user}
            onSwitchRole={handleSwitchRoleByEmail}
            onNavigate={(next) => setView(next)}
          />
        ) : view === "booking" ? (
          <BookingWizard
            lang={lang}
            user={user}
            packages={packages}
            addOns={addOns}
            inventory={inventory}
            resources={resources}
            schedules={schedules}
            documentRequirements={documentRequirements}
            existingDrafts={drafts}
            initialSelection={wizardSelection}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onQuickClientDemoLogin={() =>
              handleSwitchRoleByEmail("maria.santos@example.ph")
            }
            onBookingSaved={async (savedId, wasDraft) => {
              await refreshAll();
              setSelectedBookingId(savedId);
              if (!wasDraft) {
                setView("dashboard");
              }
            }}
          />
        ) : view === "dashboard" && user ? (
          <CaseDashboard
            lang={lang}
            user={user}
            bookings={bookings}
            schedules={schedules}
            resources={resources}
            staffDirectory={staffDirectory}
            documentRequirements={documentRequirements}
            selectedBookingId={selectedBookingId}
            onSelectBookingId={setSelectedBookingId}
            onNavigateToWizard={() => setView("booking")}
            onRefreshAll={refreshAll}
          />
        ) : view === "admin" &&
          user &&
          (user.role === "admin" || user.role === "readme") ? (
          <AdminConsole
            user={user}
            packages={packages}
            inventory={inventory}
            resources={resources}
            documentRequirements={documentRequirements}
            adminUsers={adminUsers}
            onRefreshCatalog={refreshAll}
          />
        ) : (
          <PublicShowcase
            section={
              [
                "home",
                "packages",
                "caskets",
                "chapels",
                "memorials",
                "faq",
                "contact",
              ].includes(view)
                ? view
                : "home"
            }
            lang={lang}
            user={user}
            packages={packages}
            addOns={addOns}
            inventory={inventory}
            resources={resources}
            schedules={schedules}
            memorials={memorials}
            onNavigate={(next) => setView(next)}
            onStartBookingWithSelection={(opts) => {
              setWizardSelection(opts);
              setView("booking");
            }}
            onOpenCoordinatorDrawer={() => setCoordDrawerOpen(true)}
            onRefreshMemorials={fetchMemorials}
          />
        )}
      </main>

      {/* Persistent Floating "Message a Coordinator" Concierge Button on Every Screen */}
      <button
        type="button"
        onClick={() => setCoordDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2.5 px-5 py-3 bg-[#183B35] text-[#F6F1E8] border border-[#D9C7A5] shadow-xl text-xs font-medium tracking-wider uppercase hover:bg-[#122D28] transition-all duration-200"
      >
        <MessageSquareHeart className="w-4 h-4 text-[#D9C7A5]" strokeWidth={1.6} />
        <span>
          {lang === "fil" ? "Mensahe sa Coordinator" : "Message Coordinator"}
        </span>
      </button>

      {/* Editorial Luxury Sanctuary Footer */}
      <footer className="forest-weave text-[#F6F1E8] border-t border-[#D9C7A5]/40 mt-20">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-16 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#D9C7A5]/25">
            <div className="md:col-span-5 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#D9C7A5]">
                Quezon City Sanctuary &amp; Crematory
              </p>
              <h3 className="text-2xl sm:text-3xl font-display font-medium text-[#F6F1E8]">
                {FUNERAL_HOME_INFO.shortName}
              </h3>
              <p className="text-sm text-[#F6F1E8]/75 leading-relaxed max-w-md">
                {FUNERAL_HOME_INFO.address}
              </p>
              <p className="text-xs text-[#D9C7A5]/90">
                {FUNERAL_HOME_INFO.visitingHours}
              </p>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#D9C7A5] font-semibold">
                Sanctuary Navigation
              </h4>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                {publicNavItems.map((nav) => (
                  <button
                    key={nav.key}
                    type="button"
                    onClick={() => setView(nav.key)}
                    className="text-left text-[#F6F1E8]/80 hover:text-[#D9C7A5] transition"
                  >
                    {nav.en}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setView("booking")}
                  className="text-left text-[#D9C7A5] hover:underline underline-offset-4"
                >
                  Start Booking
                </button>
                <button
                  type="button"
                  onClick={() => setView("readme")}
                  className="text-left text-[#F6F1E8]/80 hover:text-[#D9C7A5] transition"
                >
                  README &amp; Roles
                </button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#D9C7A5] font-semibold">
                Stewardship &amp; Privacy
              </h4>
              <p className="text-xs text-[#F6F1E8]/75 leading-relaxed">
                100% itemized PHP pricing, verified Acknowledgment Receipts, zero
                unsolicited calls or countdown timers, and strict compliance with the
                Data Privacy Act of 2012 (RA 10173).
              </p>
              <p className="text-xs text-[#D9C7A5]">
                Concierge: {FUNERAL_HOME_INFO.supportEmail}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#F6F1E8]/60">
            <span>© 2026 {FUNERAL_HOME_INFO.name}. All rights reserved.</span>
            <span>{FUNERAL_HOME_INFO.dpaRegistration}</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        lang={lang}
        demoAccounts={demoAccounts}
        onAuthenticated={handleAuthenticated}
      />

      <CoordinatorDrawer
        open={coordDrawerOpen}
        onClose={() => setCoordDrawerOpen(false)}
        lang={lang}
        user={user}
        messages={coordMessages}
        onRefreshMessages={fetchCoordMessages}
      />
    </div>
  );
}
