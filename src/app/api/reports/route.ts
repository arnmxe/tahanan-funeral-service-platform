import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import {
  db,
  bookings,
  payments,
  packages,
  inventory,
  auditLogs,
  deceasedRecords,
} from "@/db";
import { getSessionUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();

  if (!user || (user.role !== "admin" && user.role !== "readme")) {
    return NextResponse.json(
      { error: "Reports & Audit Logs are restricted to Admin and README Auditor roles." },
      { status: 403 }
    );
  }

  const [allBookings, allPayments, allPackages, allInventory, allLogs, allDeceased] =
    await Promise.all([
      db.select().from(bookings).orderBy(desc(bookings.createdAt)),
      db.select().from(payments).orderBy(desc(payments.createdAt)),
      db.select().from(packages),
      db.select().from(inventory),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)),
      db.select().from(deceasedRecords),
    ]);

  const activeBookings = allBookings.filter((b) => b.status !== "draft" && b.status !== "cancelled");
  const totalContractedPhp = activeBookings.reduce((sum, b) => sum + b.totalAmountPhp, 0);
  const totalCollectedPhp = allPayments
    .filter((p) => p.verificationStatus === "verified")
    .reduce((sum, p) => sum + p.amountPhp, 0);
  const totalOutstandingPhp = activeBookings.reduce((sum, b) => sum + b.balancePhp, 0);

  const onlinePaymongoTotalPhp = allPayments
    .filter((p) => p.verificationStatus === "verified" && p.method.startsWith("paymongo_"))
    .reduce((sum, p) => sum + p.amountPhp, 0);

  const manualCashTotalPhp = allPayments
    .filter((p) => p.verificationStatus === "verified" && !p.method.startsWith("paymongo_"))
    .reduce((sum, p) => sum + p.amountPhp, 0);

  const packageBreakdown = allPackages.map((pkg) => {
    const matching = activeBookings.filter((b) => b.packageId === pkg.id);
    return {
      packageId: pkg.id,
      packageName: pkg.name,
      category: pkg.category,
      bookingsCount: matching.length,
      contractedPhp: matching.reduce((s, b) => s + b.totalAmountPhp, 0),
    };
  });

  const lowStockItems = allInventory.filter((i) => i.stockCount <= i.reorderLevel);

  const csvRows = allBookings.map((b) => {
    const dec = allDeceased.find((d) => d.bookingId === b.id);
    const pkg = allPackages.find((p) => p.id === b.packageId);
    return {
      referenceCode: b.referenceCode,
      status: b.status,
      serviceType: b.serviceType,
      deceasedName: dec?.fullName || "Draft",
      familyRepresentative: b.contactPersonName,
      packageName: pkg?.name || "Unselected",
      totalAmountPhp: b.totalAmountPhp,
      amountPaidPhp: b.amountPaidPhp,
      balancePhp: b.balancePhp,
      wakeStartDate: b.wakeStartDate || "",
      intermentDate: b.intermentDate || "",
      createdAt: b.createdAt,
    };
  });

  return NextResponse.json({
    metrics: {
      totalBookingsCount: allBookings.length,
      activeCasesCount: activeBookings.length,
      completedCasesCount: allBookings.filter((b) => b.status === "completed").length,
      totalContractedPhp,
      totalCollectedPhp,
      totalOutstandingPhp,
      onlinePaymongoTotalPhp,
      manualCashTotalPhp,
      lowStockCount: lowStockItems.length,
    },
    packageBreakdown,
    lowStockItems,
    paymentsLedger: allPayments.slice(0, 50),
    csvRows,
    auditLogs: allLogs.slice(0, 80),
  });
}
