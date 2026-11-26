import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import {
  db,
  bookings,
  deceasedRecords,
  documents,
  quotations,
  invoices,
  payments,
  schedules,
  memorials,
  packages,
  addOns,
  inventory,
  resources,
  users,
  notifications,
  type QuotationLineItem,
} from "@/db";
import { getSessionUser, isReadOnlyRole, recordAuditLog } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ bookings: [] });
  }

  const [
    allBookings,
    allDeceased,
    allDocs,
    allQuotes,
    allInvoices,
    allPayments,
    allSchedules,
    allMemorials,
    allPackages,
    allResources,
    allUsers,
  ] = await Promise.all([
    db.select().from(bookings).orderBy(desc(bookings.updatedAt), desc(bookings.id)),
    db.select().from(deceasedRecords),
    db.select().from(documents).orderBy(desc(documents.createdAt)),
    db.select().from(quotations).orderBy(desc(quotations.createdAt)),
    db.select().from(invoices).orderBy(desc(invoices.createdAt)),
    db.select().from(payments).orderBy(desc(payments.createdAt)),
    db.select().from(schedules).orderBy(desc(schedules.startTime)),
    db.select().from(memorials),
    db.select().from(packages),
    db.select().from(resources),
    db.select().from(users),
  ]);

  // Row-level security filter
  const visibleBookings = allBookings.filter((b) => {
    if (user.role === "client") {
      return b.clientId === user.id;
    }
    if (user.role === "staff") {
      // Staff sees active operational bookings or bookings with tasks assigned to them
      const hasTask = allSchedules.some(
        (s) => s.bookingId === b.id && s.assignedStaffId === user.id
      );
      return hasTask || b.status !== "draft";
    }
    // coordinator, admin, readme
    return true;
  });

  const enriched = visibleBookings.map((b) => {
    const deceased = allDeceased.find((d) => d.bookingId === b.id) || null;
    const pkg = allPackages.find((p) => p.id === b.packageId) || null;
    const chapel = allResources.find((r) => r.id === b.chapelResourceId) || null;
    const coordinator = allUsers.find((u) => u.id === b.coordinatorId) || null;

    // Strip privateStoragePayload from bulk response
    const caseDocs =
      user.role === "staff"
        ? []
        : allDocs
            .filter((d) => d.bookingId === b.id)
            .map((d) => ({
              id: d.id,
              bookingId: d.bookingId,
              requirementCode: d.requirementCode,
              documentLabel: d.documentLabel,
              fileName: d.fileName,
              mimeType: d.mimeType,
              fileSizeBytes: d.fileSizeBytes,
              status: d.status,
              reviewerNote: d.reviewerNote,
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
            }));

    const caseQuotes =
      user.role === "staff" ? [] : allQuotes.filter((q) => q.bookingId === b.id);
    const caseInvoices =
      user.role === "staff" ? [] : allInvoices.filter((inv) => inv.bookingId === b.id);
    const casePayments =
      user.role === "staff" ? [] : allPayments.filter((pm) => pm.bookingId === b.id);
    const caseSchedules = allSchedules.filter((s) => s.bookingId === b.id);
    const memorial = allMemorials.find((m) => m.bookingId === b.id) || null;

    const filteredNotes =
      user.role === "client"
        ? (b.caseNotes || []).filter((n) => !n.isInternal)
        : b.caseNotes || [];

    return {
      ...b,
      caseNotes: filteredNotes,
      deceased,
      package: pkg,
      chapel,
      coordinator: coordinator
        ? {
            id: coordinator.id,
            fullName: coordinator.fullName,
            email: coordinator.email,
            staffTitle: coordinator.staffTitle,
          }
        : null,
      documents: caseDocs,
      quotations: caseQuotes,
      invoices: caseInvoices,
      payments: casePayments,
      schedules: caseSchedules,
      memorial,
    };
  });

  return NextResponse.json({ bookings: enriched });
}

export async function POST(request: Request) {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in or select a Family/Client account to save or submit a booking." },
      { status: 401 }
    );
  }
  if (isReadOnlyRole(user)) {
    return NextResponse.json(
      {
        error:
          "README Role is strictly Read-Only. Switch to the Family/Client demo account to create or save bookings.",
      },
      { status: 403 }
    );
  }
  if (user.role === "staff") {
    return NextResponse.json(
      { error: "Driver/Staff accounts cannot submit client service bookings." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const saveAsDraft = Boolean(body.saveAsDraft);
  const draftId = body.draftId ? Number(body.draftId) : null;

  const packageId = body.packageId ? Number(body.packageId) : null;
  const casketInventoryId = body.casketInventoryId ? Number(body.casketInventoryId) : null;
  const chapelResourceId = body.chapelResourceId ? Number(body.chapelResourceId) : null;
  const selectedAddOnIds: number[] = Array.isArray(body.selectedAddOnIds)
    ? body.selectedAddOnIds.map((id: unknown) => Number(id)).filter(Boolean)
    : [];
  const serviceType = body.serviceType === "cremation" ? "cremation" : "interment";
  const wizardStep = Math.min(6, Math.max(1, Number(body.wizardStep || 1)));

  const contactPersonName = String(body.contactPersonName || user.fullName).trim();
  const contactPersonEmail = String(body.contactPersonEmail || user.email).trim();
  const contactRelationship = String(body.contactRelationship || "Family Representative").trim();
  const contactAddress = String(body.contactAddress || "Metro Manila, Philippines").trim();
  const preferredCommunicationChannel = String(
    body.preferredCommunicationChannel || "in_app_portal"
  );

  const deceasedName = String(body.deceasedName || "").trim();
  const dateOfBirth = String(body.dateOfBirth || "").trim();
  const dateOfPassing = String(body.dateOfPassing || "").trim();
  const ageAtPassing = body.ageAtPassing ? Number(body.ageAtPassing) : null;
  const gender = String(body.gender || "").trim();
  const religion = String(body.religion || "").trim();
  const placeOfPassing = String(body.placeOfPassing || "").trim();
  const biographySummary = String(body.biographySummary || "").trim();

  const wakeStartDate = String(body.wakeStartDate || "").trim();
  const wakeEndDate = String(body.wakeEndDate || "").trim();
  const intermentDate = String(body.intermentDate || "").trim();
  const intermentLocation = String(body.intermentLocation || "").trim();
  const specialRequests = String(body.specialRequests || "").trim();
  const privacyConsentAccepted = Boolean(body.privacyConsentAccepted);

  if (!saveAsDraft) {
    if (!packageId) {
      return NextResponse.json(
        { error: "Please choose a service package before submitting." },
        { status: 400 }
      );
    }
    if (!deceasedName) {
      return NextResponse.json(
        { error: "Please provide the full name of your departed loved one." },
        { status: 400 }
      );
    }
    if (!wakeStartDate || !wakeEndDate) {
      return NextResponse.json(
        { error: "Please choose the wake start and end dates." },
        { status: 400 }
      );
    }
    if (!privacyConsentAccepted) {
      return NextResponse.json(
        {
          error:
            "Please accept the Data Privacy Act of 2012 (RA 10173) consent notice to proceed.",
        },
        { status: 400 }
      );
    }
  }

  // Check Chapel Anti-Double-Booking when submitting with chapel + dates
  if (chapelResourceId && wakeStartDate && wakeEndDate && !saveAsDraft) {
    const reqStart = new Date(`${wakeStartDate}T10:00:00`);
    const reqEnd = new Date(`${wakeEndDate}T21:00:00`);

    if (reqEnd <= reqStart) {
      return NextResponse.json(
        { error: "Wake end date must be after the wake start date." },
        { status: 400 }
      );
    }

    const existingChapelSlots = await db
      .select()
      .from(schedules)
      .where(eq(schedules.resourceId, chapelResourceId));

    const conflict = existingChapelSlots.find((slot) => {
      if (draftId && slot.bookingId === draftId) return false;
      return reqStart < new Date(slot.endTime) && reqEnd > new Date(slot.startTime);
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: `Selected chapel is already reserved during those dates (${conflict.title}). Please choose another chapel suite or adjust your wake dates.`,
        },
        { status: 409 }
      );
    }
  }

  // Compute itemized quotation pricing
  const [pkgRows, addOnRows, invRows, coordUsers] = await Promise.all([
    db.select().from(packages),
    db.select().from(addOns),
    db.select().from(inventory),
    db.select().from(users),
  ]);

  const chosenPkg = pkgRows.find((p) => p.id === packageId) || null;
  const chosenInv = invRows.find((i) => i.id === casketInventoryId) || null;
  const chosenAddOns = addOnRows.filter((a) => selectedAddOnIds.includes(a.id));
  const defaultCoord = coordUsers.find((u) => u.role === "coordinator" && u.active) || null;

  const lineItems: QuotationLineItem[] = [];
  if (chosenPkg) {
    lineItems.push({
      id: `li-pkg-${chosenPkg.id}`,
      description: `${chosenPkg.name} (${chosenPkg.durationDays} days)`,
      category: "package",
      quantity: 1,
      unitPricePhp: chosenPkg.pricePhp,
      totalPhp: chosenPkg.pricePhp,
    });
  }
  if (chosenInv && Boolean(body.includeSeparateInventoryPrice)) {
    lineItems.push({
      id: `li-inv-${chosenInv.id}`,
      description: `Selected Casket/Urn Upgrade: ${chosenInv.name}`,
      category: "casket_urn",
      quantity: 1,
      unitPricePhp: chosenInv.pricePhp,
      totalPhp: chosenInv.pricePhp,
    });
  }
  for (const addon of chosenAddOns) {
    lineItems.push({
      id: `li-add-${addon.id}`,
      description: `${addon.name} (${addon.unitLabel})`,
      category: "addon",
      quantity: 1,
      unitPricePhp: addon.pricePhp,
      totalPhp: addon.pricePhp,
    });
  }

  const totalAmountPhp = lineItems.reduce((sum, item) => sum + item.totalPhp, 0);
  const downpaymentRequiredPhp = Math.round(totalAmountPhp * 0.3);

  // Update existing draft if draftId belongs to user
  if (draftId) {
    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, draftId))
      .limit(1);

    if (
      existing &&
      (existing.clientId === user.id ||
        user.role === "admin" ||
        user.role === "coordinator")
    ) {
      const nextStatus = saveAsDraft ? "draft" : "quotation_sent";
      const nextStage = saveAsDraft ? Math.min(5, wizardStep) : 6;

      const [updatedBooking] = await db
        .update(bookings)
        .set({
          packageId,
          casketInventoryId,
          chapelResourceId,
          selectedAddOnIds,
          serviceType,
          status: nextStatus,
          workflowStage: nextStage,
          wizardStep,
          contactPersonName,
          contactPersonEmail,
          contactRelationship,
          contactAddress,
          preferredCommunicationChannel,
          wakeStartDate: wakeStartDate || null,
          wakeEndDate: wakeEndDate || null,
          intermentDate: intermentDate || null,
          intermentLocation: intermentLocation || null,
          specialRequests: specialRequests || null,
          privacyConsentAccepted,
          privacyConsentAt: privacyConsentAccepted ? new Date() : existing.privacyConsentAt,
          totalAmountPhp,
          downpaymentRequiredPhp,
          balancePhp: Math.max(0, totalAmountPhp - existing.amountPaidPhp),
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, existing.id))
        .returning();

      const [existingDeceased] = await db
        .select()
        .from(deceasedRecords)
        .where(eq(deceasedRecords.bookingId, existing.id))
        .limit(1);

      if (existingDeceased) {
        await db
          .update(deceasedRecords)
          .set({
            fullName: deceasedName || existingDeceased.fullName,
            dateOfBirth: dateOfBirth || null,
            dateOfPassing: dateOfPassing || null,
            ageAtPassing,
            gender: gender || null,
            religion: religion || null,
            placeOfPassing: placeOfPassing || null,
            biographySummary: biographySummary || null,
          })
          .where(eq(deceasedRecords.id, existingDeceased.id));
      } else if (deceasedName) {
        await db.insert(deceasedRecords).values({
          bookingId: existing.id,
          fullName: deceasedName,
          dateOfBirth: dateOfBirth || null,
          dateOfPassing: dateOfPassing || null,
          ageAtPassing,
          gender: gender || null,
          religion: religion || null,
          placeOfPassing: placeOfPassing || null,
          biographySummary: biographySummary || null,
        });
      }

      if (!saveAsDraft) {
        await finalizeSubmittedBookingArtifacts({
          booking: updatedBooking,
          deceasedName: deceasedName || "Beloved Family Member",
          dateOfBirth,
          dateOfPassing,
          biographySummary,
          intermentLocation,
          lineItems,
          totalAmountPhp,
          downpaymentRequiredPhp,
          chapelResourceId,
          wakeStartDate,
          wakeEndDate,
          coordinatorId: defaultCoord?.id ?? null,
          actor: user,
        });
      }

      return NextResponse.json({ ok: true, booking: updatedBooking });
    }
  }

  // Create fresh booking
  const refSuffix = `${Math.floor(1000 + Math.random() * 8999)}`;
  const referenceCode = `TKP-2026-${refSuffix}`;
  const status = saveAsDraft ? "draft" : "quotation_sent";
  const workflowStage = saveAsDraft ? Math.min(5, wizardStep) : 6;

  const [createdBooking] = await db
    .insert(bookings)
    .values({
      referenceCode,
      clientId: user.id,
      coordinatorId: defaultCoord?.id ?? null,
      packageId,
      casketInventoryId,
      chapelResourceId,
      selectedAddOnIds,
      serviceType,
      status,
      workflowStage,
      wizardStep,
      contactPersonName,
      contactPersonEmail,
      contactRelationship,
      contactAddress,
      preferredCommunicationChannel,
      wakeStartDate: wakeStartDate || null,
      wakeEndDate: wakeEndDate || null,
      intermentDate: intermentDate || null,
      intermentLocation: intermentLocation || null,
      specialRequests: specialRequests || null,
      checklist: [
        {
          id: "chk-init-1",
          label: "Arrangement form & RA 10173 consent submitted",
          stage: "Inquiry",
          completed: !saveAsDraft,
          completedBy: !saveAsDraft ? contactPersonName : undefined,
          completedAt: !saveAsDraft ? new Date().toISOString() : undefined,
        },
        {
          id: "chk-init-2",
          label: "Verify uploaded Certificate of Death & Informant Government ID",
          stage: "Documents",
          completed: false,
        },
        {
          id: "chk-init-3",
          label: "Client approval of itemized quotation & initial down payment",
          stage: "Payment",
          completed: false,
        },
        {
          id: "chk-init-4",
          label: "Chapel preparation, floral tribute & ceremonial hearse briefing",
          stage: "Coordination",
          completed: false,
        },
      ],
      caseNotes: [
        {
          id: `note-${Date.now()}`,
          authorName: defaultCoord?.fullName || "Care Desk",
          authorRole: "coordinator",
          text: saveAsDraft
            ? "Draft saved privately. You may resume this arrangement at your own pace without any rush."
            : `Arrangement ${referenceCode} received. Itemized quotation has been prepared for your calm review.`,
          isInternal: false,
          createdAt: new Date().toISOString(),
        },
      ],
      privacyConsentAccepted,
      privacyConsentAt: privacyConsentAccepted ? new Date() : null,
      totalAmountPhp,
      downpaymentRequiredPhp,
      amountPaidPhp: 0,
      balancePhp: totalAmountPhp,
    })
    .returning();

  if (deceasedName || !saveAsDraft) {
    await db.insert(deceasedRecords).values({
      bookingId: createdBooking.id,
      fullName: deceasedName || "Draft Arrangement",
      dateOfBirth: dateOfBirth || null,
      dateOfPassing: dateOfPassing || null,
      ageAtPassing,
      gender: gender || null,
      religion: religion || null,
      placeOfPassing: placeOfPassing || null,
      biographySummary: biographySummary || null,
    });
  }

  if (!saveAsDraft) {
    await finalizeSubmittedBookingArtifacts({
      booking: createdBooking,
      deceasedName,
      dateOfBirth,
      dateOfPassing,
      biographySummary,
      intermentLocation,
      lineItems,
      totalAmountPhp,
      downpaymentRequiredPhp,
      chapelResourceId,
      wakeStartDate,
      wakeEndDate,
      coordinatorId: defaultCoord?.id ?? null,
      actor: user,
    });
  } else {
    await recordAuditLog({
      actor: user,
      action: "BOOKING_DRAFT_SAVED",
      entityType: "booking",
      entityId: createdBooking.referenceCode,
      summary: `Saved arrangement draft ${createdBooking.referenceCode} at step ${wizardStep}.`,
    });
  }

  return NextResponse.json({ ok: true, booking: createdBooking });
}

async function finalizeSubmittedBookingArtifacts(params: {
  booking: typeof bookings.$inferSelect;
  deceasedName: string;
  dateOfBirth: string;
  dateOfPassing: string;
  biographySummary: string;
  intermentLocation: string;
  lineItems: QuotationLineItem[];
  totalAmountPhp: number;
  downpaymentRequiredPhp: number;
  chapelResourceId: number | null;
  wakeStartDate: string;
  wakeEndDate: string;
  coordinatorId: number | null;
  actor: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
}) {
  const {
    booking,
    deceasedName,
    dateOfBirth,
    dateOfPassing,
    biographySummary,
    intermentLocation,
    lineItems,
    totalAmountPhp,
    downpaymentRequiredPhp,
    chapelResourceId,
    wakeStartDate,
    wakeEndDate,
    coordinatorId,
    actor,
  } = params;

  const quoteNum = booking.referenceCode.replace("TKP-", "QT-");
  const invNum = booking.referenceCode.replace("TKP-", "INV-");

  const [existingQuote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.bookingId, booking.id))
    .limit(1);

  if (!existingQuote) {
    const [createdQuote] = await db
      .insert(quotations)
      .values({
        bookingId: booking.id,
        quotationNumber: quoteNum,
        lineItems,
        subtotalPhp: totalAmountPhp,
        discountPhp: 0,
        totalPhp: totalAmountPhp,
        downpaymentRequiredPhp,
        status: "pending_approval",
        notes:
          "Prepared automatically from your selected package and optional services. Please review at your own pace before approving.",
      })
      .returning();

    await db.insert(invoices).values({
      bookingId: booking.id,
      quotationId: createdQuote.id,
      invoiceNumber: invNum,
      totalAmountPhp,
      downpaymentAmountPhp: downpaymentRequiredPhp,
      amountPaidPhp: 0,
      balancePhp: totalAmountPhp,
      dueDate: wakeEndDate || null,
      paymentStatus: "unpaid",
    });
  }

  // Reserve chapel on schedule if chosen
  if (chapelResourceId && wakeStartDate && wakeEndDate) {
    const [chapel] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, chapelResourceId))
      .limit(1);

    await db.insert(schedules).values({
      bookingId: booking.id,
      resourceId: chapelResourceId,
      title: `Wake Reservation — ${deceasedName} (${chapel?.name || "Chapel"})`,
      eventType: "wake",
      startTime: new Date(`${wakeStartDate}T10:00:00`),
      endTime: new Date(`${wakeEndDate}T21:00:00`),
      location: chapel?.name || "Tahanan ng Kapayapaan Chapel",
      taskStatus: "scheduled",
      notes: `Auto-reserved upon booking submission (${booking.referenceCode}).`,
    });
  }

  // Create private-by-default Memorial page
  const [existingMem] = await db
    .select()
    .from(memorials)
    .where(eq(memorials.bookingId, booking.id))
    .limit(1);

  if (!existingMem) {
    const slug = `${deceasedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${booking.referenceCode.toLowerCase()}`;

    await db.insert(memorials).values({
      bookingId: booking.id,
      slug,
      deceasedName,
      sunriseDate: dateOfBirth || "Remembered Always",
      sunsetDate: dateOfPassing || new Date().toISOString().slice(0, 10),
      portraitImageUrl: "/images/hero-chapel.jpg",
      obituaryText:
        biographySummary ||
        `In loving remembrance of ${deceasedName}. Our family invites your quiet prayers and cherished memories.`,
      wakeLocationSummary: wakeStartDate
        ? `Wake from ${wakeStartDate} to ${wakeEndDate}`
        : "Tahanan ng Kapayapaan Memorial Chapels",
      intermentSummary: intermentLocation || "Schedule coordinated with family",
      isPublic: false, // Private by default!
      familyShareCode: `PEACE-${booking.referenceCode.slice(-4)}`,
      candlesCount: 1,
      tributes: [],
    });
  }

  // Notify client & coordinator
  if (booking.clientId) {
    await db.insert(notifications).values({
      userId: booking.clientId,
      bookingId: booking.id,
      title: `Arrangement ${booking.referenceCode} Submitted & Quotation Ready`,
      message: `Your itemized quotation (${quoteNum}) is ready for review in your Case Dashboard.`,
      category: "approval",
    });
  }

  if (coordinatorId) {
    await db.insert(notifications).values({
      userId: coordinatorId,
      bookingId: booking.id,
      title: `New Family Arrangement Assigned (${booking.referenceCode})`,
      message: `${booking.contactPersonName} submitted service arrangements for ${deceasedName}.`,
      category: "schedule",
    });
  }

  await recordAuditLog({
    actor,
    action: "BOOKING_SUBMITTED",
    entityType: "booking",
    entityId: booking.referenceCode,
    summary: `Submitted arrangement ${booking.referenceCode} for ${deceasedName} (₱${totalAmountPhp.toLocaleString()}).`,
  });
}
