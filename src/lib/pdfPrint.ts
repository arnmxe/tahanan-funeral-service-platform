import { FUNERAL_HOME_INFO, formatPhp } from "./constants";
import type { EnrichedBooking, PaymentRecord, QuotationRecord } from "@/types/portal";

function openPrintableDocument(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #242522;
      background: #F6F1E8;
      margin: 0;
      padding: 36px;
      line-height: 1.6;
      font-variant-numeric: tabular-nums;
    }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #FBF9F5;
      border: 1px solid #D9C7A5;
      padding: 44px;
    }
    .header {
      border-bottom: 2px solid #D9C7A5;
      padding-bottom: 22px;
      margin-bottom: 26px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .brand {
      font-family: Georgia, "Playfair Display", serif;
      font-size: 24px;
      font-weight: 600;
      color: #183B35;
      margin: 0 0 6px 0;
    }
    .sub {
      font-size: 12px;
      color: #5A5751;
      margin: 2px 0;
    }
    .doc-badge {
      background: #183B35;
      color: #F6F1E8;
      border: 1px solid #D9C7A5;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      padding: 8px 14px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13px;
    }
    th {
      background: #EFE8DC;
      color: #183B35;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: left;
      padding: 11px 12px;
      border-top: 1px solid #D9C7A5;
      border-bottom: 1px solid #D9C7A5;
    }
    td {
      padding: 11px 12px;
      border-bottom: 1px solid #E5DDD0;
      color: #242522;
    }
    .num {
      text-align: right;
      font-family: "Manrope", -apple-system, BlinkMacSystemFont, sans-serif;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }
    .totals {
      margin-top: 18px;
      margin-left: auto;
      width: 340px;
      font-size: 13.5px;
      background: #F6F1E8;
      border: 1px solid #D9C7A5;
      padding: 16px 18px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      color: #5A5751;
      border-bottom: 1px solid #E5DDD0;
    }
    .totals-final {
      display: flex;
      justify-content: space-between;
      padding: 10px 0 4px 0;
      font-size: 15px;
      font-weight: 700;
      color: #183B35;
    }
    .footer {
      margin-top: 34px;
      padding-top: 16px;
      border-top: 1px solid #D9C7A5;
      font-size: 11px;
      color: #5A5751;
    }
    .actions {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      background: #183B35;
      color: #F6F1E8;
      border: 1px solid #D9C7A5;
      padding: 10px 18px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    @media print {
      .actions { display: none; }
      body { padding: 0; background: #FFFFFF; }
      .sheet { border: none; padding: 16px; background: #FFFFFF; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="sheet">
    ${bodyHtml}
    <div class="footer">
      <strong>${FUNERAL_HOME_INFO.name}</strong> • ${FUNERAL_HOME_INFO.address}<br/>
      Email: ${FUNERAL_HOME_INFO.supportEmail} • ${FUNERAL_HOME_INFO.dpaRegistration}<br/>
      Protected under the Philippine Data Privacy Act of 2012 (RA 10173) • 100% Itemized PHP Pricing.
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9-_]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function printQuotationAndInvoicePdf(
  booking: EnrichedBooking,
  quote: QuotationRecord
) {
  const rowsHtml = (quote.lineItems || [])
    .map(
      (item) => `<tr>
      <td>${item.description}</td>
      <td>${item.category.toUpperCase()}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${formatPhp(item.unitPricePhp)}</td>
      <td class="num">${formatPhp(item.totalPhp)}</td>
    </tr>`
    )
    .join("");

  const inv = booking.invoices[0];
  const bodyHtml = `
    <div class="header">
      <div>
        <h1 class="brand">${FUNERAL_HOME_INFO.name}</h1>
        <p class="sub">${FUNERAL_HOME_INFO.address}</p>
        <p class="sub">Arrangement Desk: ${FUNERAL_HOME_INFO.supportEmail}</p>
      </div>
      <div class="doc-badge">ITEMIZED QUOTATION &amp; STATEMENT</div>
    </div>
    <p style="font-size: 13px; color: #242522;">
      <strong>Quotation No.:</strong> ${quote.quotationNumber} &nbsp;|&nbsp;
      <strong>Invoice Ref.:</strong> ${inv?.invoiceNumber || "Pending"} &nbsp;|&nbsp;
      <strong>Booking Ref.:</strong> ${booking.referenceCode}<br/>
      <strong>In Loving Memory Of:</strong> ${booking.deceased?.fullName || "Family Arrangement"}<br/>
      <strong>Family Representative:</strong> ${booking.contactPersonName} (${booking.contactPersonEmail})<br/>
      <strong>Approval Status:</strong> ${quote.status.replace(/_/g, " ").toUpperCase()}
      ${quote.approvedByName ? `(Approved by ${quote.approvedByName})` : ""}
    </p>
    <table>
      <thead>
        <tr>
          <th>Service / Item Description</th>
          <th>Category</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Total (PHP)</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal:</span><span class="num">${formatPhp(quote.subtotalPhp)}</span></div>
      ${
        quote.discountPhp > 0
          ? `<div class="totals-row"><span>Discount (${quote.discountLabel || "Adjustment"}):</span><span class="num">-${formatPhp(quote.discountPhp)}</span></div>`
          : ""
      }
      <div class="totals-final"><span>Total Contracted Amount:</span><span class="num">${formatPhp(quote.totalPhp)}</span></div>
      <div class="totals-row"><span>Initial Down Payment (30%):</span><span class="num">${formatPhp(quote.downpaymentRequiredPhp)}</span></div>
      <div class="totals-row"><span>Verified Payments Received:</span><span class="num">${formatPhp(booking.amountPaidPhp)}</span></div>
      <div class="totals-final"><span>Remaining Balance:</span><span class="num">${formatPhp(booking.balancePhp)}</span></div>
    </div>
    ${quote.notes ? `<p style="font-size: 12px; color: #5A5751; margin-top: 20px;"><strong>Notes:</strong> ${quote.notes}</p>` : ""}
  `;

  openPrintableDocument(`${quote.quotationNumber}_${booking.referenceCode}`, bodyHtml);
}

export function printAcknowledgmentReceiptPdf(
  booking: EnrichedBooking,
  payment: PaymentRecord
) {
  const bodyHtml = `
    <div class="header">
      <div>
        <h1 class="brand">${FUNERAL_HOME_INFO.name}</h1>
        <p class="sub">${FUNERAL_HOME_INFO.address}</p>
        <p class="sub">Email: ${FUNERAL_HOME_INFO.supportEmail}</p>
      </div>
      <div class="doc-badge">ACKNOWLEDGMENT RECEIPT</div>
    </div>
    <p style="font-size: 13.5px; color: #242522;">
      <strong>Acknowledgment Receipt No.:</strong> ${payment.receiptNumber}<br/>
      <strong>Date Verified:</strong> ${new Date(payment.verifiedAt || payment.createdAt).toLocaleString()}<br/>
      <strong>Case Reference:</strong> ${booking.referenceCode} — ${booking.deceased?.fullName || "Beloved Departed"}<br/>
      <strong>Received From:</strong> ${payment.payerName} (${payment.payerEmail || booking.contactPersonEmail})
    </p>
    <table>
      <thead>
        <tr>
          <th>Payment Stage</th>
          <th>Payment Channel</th>
          <th>Verification Reference</th>
          <th class="num">Amount Received</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${payment.paymentStage.replace(/_/g, " ").toUpperCase()}</td>
          <td>${payment.method.replace(/_/g, " ").toUpperCase()}</td>
          <td>${payment.paymongoSessionId || "Desk Cash / Verified Ledger"}</td>
          <td class="num">${formatPhp(payment.amountPhp)}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Total Service Contract:</span><span class="num">${formatPhp(booking.totalAmountPhp)}</span></div>
      <div class="totals-row"><span>Cumulative Verified Paid:</span><span class="num">${formatPhp(booking.amountPaidPhp)}</span></div>
      <div class="totals-final"><span>Current Remaining Balance:</span><span class="num">${formatPhp(booking.balancePhp)}</span></div>
    </div>
    <p style="font-size: 12px; color: #5A5751; margin-top: 24px;">
      <strong>Document Notice:</strong> Official <strong>Acknowledgment Receipt</strong> confirming payment received and verified for memorial service coordination. Zero payment card numbers are stored on our servers.
    </p>
  `;

  openPrintableDocument(`Acknowledgment_Receipt_${payment.receiptNumber}`, bodyHtml);
}

export function exportCsvRows(
  filename: string,
  rows: Array<Record<string, unknown>>
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (v: unknown) => {
    const str = v === null || v === undefined ? "" : String(v);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printFinancialSummaryPdf(
  metrics: {
    totalBookingsCount: number;
    activeCasesCount: number;
    completedCasesCount: number;
    totalContractedPhp: number;
    totalCollectedPhp: number;
    totalOutstandingPhp: number;
    onlinePaymongoTotalPhp: number;
    manualCashTotalPhp: number;
  },
  rows: Array<Record<string, unknown>>
) {
  const tableRows = rows
    .map(
      (r) => `<tr>
      <td>${r.referenceCode}</td>
      <td>${r.deceasedName}</td>
      <td>${r.packageName}</td>
      <td>${String(r.status).replace(/_/g, " ")}</td>
      <td class="num">${formatPhp(Number(r.totalAmountPhp || 0))}</td>
      <td class="num">${formatPhp(Number(r.amountPaidPhp || 0))}</td>
      <td class="num">${formatPhp(Number(r.balancePhp || 0))}</td>
    </tr>`
    )
    .join("");

  const bodyHtml = `
    <div class="header">
      <div>
        <h1 class="brand">${FUNERAL_HOME_INFO.name}</h1>
        <p class="sub">Management Revenue &amp; Booking Reconciliation Report</p>
        <p class="sub">Generated: ${new Date().toLocaleString()}</p>
      </div>
      <div class="doc-badge">EXECUTIVE REPORT</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Total Cases</th>
          <th>Active Cases</th>
          <th>Completed</th>
          <th class="num">Contracted Revenue</th>
          <th class="num">Verified Collected</th>
          <th class="num">Open Balances</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${metrics.totalBookingsCount}</td>
          <td>${metrics.activeCasesCount}</td>
          <td>${metrics.completedCasesCount}</td>
          <td class="num">${formatPhp(metrics.totalContractedPhp)}</td>
          <td class="num">${formatPhp(metrics.totalCollectedPhp)}</td>
          <td class="num">${formatPhp(metrics.totalOutstandingPhp)}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size: 13px; color: #242522;">
      <strong>PayMongo Online (Test Mode Verified):</strong> ${formatPhp(metrics.onlinePaymongoTotalPhp)} &nbsp;|&nbsp;
      <strong>Manual Desk Cash / Bank Recorded:</strong> ${formatPhp(metrics.manualCashTotalPhp)}
    </p>
    <table>
      <thead>
        <tr>
          <th>Ref</th>
          <th>Deceased</th>
          <th>Package</th>
          <th>Status</th>
          <th class="num">Total</th>
          <th class="num">Paid</th>
          <th class="num">Balance</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  openPrintableDocument("Tahanan_ng_Kapayapaan_Financial_Report", bodyHtml);
}
