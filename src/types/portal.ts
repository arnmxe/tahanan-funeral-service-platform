import type {
  UserRole,
  ChecklistItem,
  CaseNoteItem,
  QuotationLineItem,
  MemorialTribute,
} from "@/db/schema";

export type Language = "en" | "fil";

export interface PortalUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  staffTitle: string | null;
  preferredLanguage: string;
}

export interface DemoAccountInfo {
  role: UserRole;
  titleEn: string;
  titleFil: string;
  email: string;
  summary: string;
}

export interface PackageItem {
  id: number;
  slug: string;
  name: string;
  nameFil: string;
  category: string;
  pricePhp: number;
  durationDays: number;
  description: string;
  descriptionFil: string;
  inclusions: string[];
  casketIncluded: string;
  chapelIncluded: string;
  active: boolean;
}

export interface AddOnItem {
  id: number;
  name: string;
  nameFil: string;
  category: string;
  pricePhp: number;
  unitLabel: string;
  description: string;
  active: boolean;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  material: string;
  finish: string;
  dimensions: string;
  pricePhp: number;
  stockCount: number;
  reorderLevel: number;
  imageUrl: string;
  description: string;
  active: boolean;
}

export interface ResourceItem {
  id: number;
  name: string;
  type: string;
  capacity: string;
  ratePerDayPhp: number;
  floorLocation: string;
  description: string;
  imageUrl: string;
  features: string[];
  status: string;
}

export interface DocumentRequirementItem {
  id: number;
  code: string;
  name: string;
  nameFil: string;
  description: string;
  appliesTo: string;
  isRequired: boolean;
  active: boolean;
  sortOrder: number;
}

export interface StaffMemberInfo {
  id: number;
  fullName: string;
  role: UserRole;
  staffTitle: string | null;
}

export interface AdminUserItem {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  staffTitle: string | null;
  active: boolean;
  createdAt: string;
}

export interface UploadedDocMeta {
  id: number;
  bookingId: number;
  requirementCode: string;
  documentLabel: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  reviewerNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationRecord {
  id: number;
  bookingId: number;
  quotationNumber: string;
  lineItems: QuotationLineItem[];
  subtotalPhp: number;
  discountPhp: number;
  discountLabel: string | null;
  totalPhp: number;
  downpaymentRequiredPhp: number;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InvoiceRecord {
  id: number;
  bookingId: number;
  quotationId: number | null;
  invoiceNumber: string;
  totalAmountPhp: number;
  downpaymentAmountPhp: number;
  amountPaidPhp: number;
  balancePhp: number;
  dueDate: string | null;
  paymentStatus: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  bookingId: number;
  invoiceId: number | null;
  receiptNumber: string;
  amountPhp: number;
  paymentStage: string;
  method: string;
  paymongoSessionId: string | null;
  verificationStatus: string;
  payerName: string;
  payerEmail: string | null;
  notes: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface ScheduleItem {
  id: number;
  bookingId: number | null;
  bookingRef?: string | null;
  resourceId: number | null;
  resourceName?: string;
  resourceType?: string;
  assignedStaffId: number | null;
  assignedStaffName?: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location: string;
  taskStatus: string;
  notes: string | null;
}

export interface MemorialRecord {
  id: number;
  bookingId: number;
  slug: string;
  deceasedName: string;
  sunriseDate: string | null;
  sunsetDate: string | null;
  portraitImageUrl: string | null;
  obituaryText: string;
  wakeLocationSummary: string | null;
  intermentSummary: string | null;
  isPublic: boolean;
  familyShareCode: string;
  candlesCount: number;
  tributes: MemorialTribute[];
}

export interface EnrichedBooking {
  id: number;
  referenceCode: string;
  clientId: number | null;
  coordinatorId: number | null;
  packageId: number | null;
  casketInventoryId: number | null;
  chapelResourceId: number | null;
  selectedAddOnIds: number[];
  serviceType: string;
  status: string;
  workflowStage: number;
  wizardStep: number;
  contactPersonName: string;
  contactPersonEmail: string;
  contactRelationship: string;
  contactAddress: string;
  preferredCommunicationChannel: string;
  wakeStartDate: string | null;
  wakeEndDate: string | null;
  intermentDate: string | null;
  intermentLocation: string | null;
  specialRequests: string | null;
  checklist: ChecklistItem[];
  caseNotes: CaseNoteItem[];
  privacyConsentAccepted: boolean;
  totalAmountPhp: number;
  downpaymentRequiredPhp: number;
  amountPaidPhp: number;
  balancePhp: number;
  createdAt: string;
  updatedAt: string;
  deceased: {
    id: number;
    fullName: string;
    dateOfBirth: string | null;
    dateOfPassing: string | null;
    ageAtPassing: number | null;
    gender: string | null;
    religion: string | null;
    placeOfPassing: string | null;
    biographySummary: string | null;
  } | null;
  package: PackageItem | null;
  chapel: ResourceItem | null;
  coordinator: {
    id: number;
    fullName: string;
    email: string;
    staffTitle: string | null;
  } | null;
  documents: UploadedDocMeta[];
  quotations: QuotationRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  schedules: ScheduleItem[];
  memorial: MemorialRecord | null;
}

export interface NotificationItem {
  id: number;
  userId: number;
  bookingId: number | null;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export interface CoordinatorMessageItem {
  id: number;
  bookingId: number | null;
  senderUserId: number | null;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: string;
  coordinatorReply: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
  createdAt: string;
}
