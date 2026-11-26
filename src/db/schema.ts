import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type UserRole = "client" | "coordinator" | "staff" | "admin" | "readme";

export interface ChecklistItem {
  id: string;
  label: string;
  stage: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface CaseNoteItem {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  isInternal: boolean;
  createdAt: string;
}

export interface QuotationLineItem {
  id: string;
  description: string;
  category: "package" | "casket_urn" | "chapel" | "addon" | "adjustment";
  quantity: number;
  unitPricePhp: number;
  totalPhp: number;
}

export interface MemorialTribute {
  id: string;
  authorName: string;
  relationship: string;
  message: string;
  litCandle: boolean;
  createdAt: string;
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").$type<UserRole>().notNull().default("client"),
  staffTitle: text("staff_title"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  privacyConsentAt: timestamp("privacy_consent_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameFil: text("name_fil").notNull(),
  category: text("category").notNull(), // traditional | cremation | direct | memorial
  pricePhp: integer("price_php").notNull(),
  durationDays: integer("duration_days").notNull(),
  description: text("description").notNull(),
  descriptionFil: text("description_fil").notNull(),
  inclusions: jsonb("inclusions").$type<string[]>().notNull().default([]),
  casketIncluded: text("casket_included").notNull(),
  chapelIncluded: text("chapel_included").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const addOns = pgTable("add_ons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameFil: text("name_fil").notNull(),
  category: text("category").notNull(),
  pricePhp: integer("price_php").notNull(),
  unitLabel: text("unit_label").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // casket | urn | floral | keepsake
  material: text("material").notNull(),
  finish: text("finish").notNull(),
  dimensions: text("dimensions").notNull(),
  pricePhp: integer("price_php").notNull(),
  stockCount: integer("stock_count").notNull().default(5),
  reorderLevel: integer("reorder_level").notNull().default(2),
  imageUrl: text("image_url").notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // chapel | vehicle | crematory
  capacity: text("capacity").notNull(),
  ratePerDayPhp: integer("rate_per_day_php").notNull().default(0),
  floorLocation: text("floor_location").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("available"), // available | maintenance
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentRequirements = pgTable("document_requirements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameFil: text("name_fil").notNull(),
  description: text("description").notNull(),
  appliesTo: text("applies_to").notNull().default("all"), // all | interment | cremation
  isRequired: boolean("is_required").notNull().default(true),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  referenceCode: text("reference_code").notNull().unique(),
  clientId: integer("client_id").references(() => users.id),
  coordinatorId: integer("coordinator_id").references(() => users.id),
  packageId: integer("package_id").references(() => packages.id),
  casketInventoryId: integer("casket_inventory_id").references(() => inventory.id),
  chapelResourceId: integer("chapel_resource_id").references(() => resources.id),
  selectedAddOnIds: jsonb("selected_add_on_ids").$type<number[]>().notNull().default([]),
  serviceType: text("service_type").notNull().default("interment"), // interment | cremation
  status: text("status").notNull().default("inquiry"),
  // draft | inquiry | documents_pending | quotation_sent | quotation_approved | downpayment_paid | in_coordination | fully_paid | completed | cancelled
  workflowStage: integer("workflow_stage").notNull().default(1), // 1..11
  wizardStep: integer("wizard_step").notNull().default(1), // 1..6
  contactPersonName: text("contact_person_name").notNull(),
  contactPersonEmail: text("contact_person_email").notNull(),
  contactRelationship: text("contact_relationship").notNull(),
  contactAddress: text("contact_address").notNull(),
  preferredCommunicationChannel: text("preferred_communication_channel")
    .notNull()
    .default("in_app_portal"),
  wakeStartDate: text("wake_start_date"),
  wakeEndDate: text("wake_end_date"),
  intermentDate: text("interment_date"),
  intermentLocation: text("interment_location"),
  specialRequests: text("special_requests"),
  checklist: jsonb("checklist").$type<ChecklistItem[]>().notNull().default([]),
  caseNotes: jsonb("case_notes").$type<CaseNoteItem[]>().notNull().default([]),
  privacyConsentAccepted: boolean("privacy_consent_accepted").notNull().default(false),
  privacyConsentAt: timestamp("privacy_consent_at"),
  totalAmountPhp: integer("total_amount_php").notNull().default(0),
  downpaymentRequiredPhp: integer("downpayment_required_php").notNull().default(0),
  amountPaidPhp: integer("amount_paid_php").notNull().default(0),
  balancePhp: integer("balance_php").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deceasedRecords = pgTable("deceased_records", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  dateOfPassing: text("date_of_passing"),
  ageAtPassing: integer("age_at_passing"),
  gender: text("gender"),
  religion: text("religion"),
  placeOfPassing: text("place_of_passing"),
  biographySummary: text("biography_summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  requirementCode: text("requirement_code").notNull(),
  documentLabel: text("document_label").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  privateStoragePayload: text("private_storage_payload").notNull(),
  status: text("status").notNull().default("pending"), // pending | verified | needs_revision
  reviewerNote: text("reviewer_note"),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  resourceId: integer("resource_id").references(() => resources.id),
  assignedStaffId: integer("assigned_staff_id").references(() => users.id),
  title: text("title").notNull(),
  eventType: text("event_type").notNull(), // wake | transfer | preparation | interment | cremation
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location").notNull(),
  taskStatus: text("task_status").notNull().default("scheduled"), // scheduled | in_progress | completed
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  quotationNumber: text("quotation_number").notNull().unique(),
  lineItems: jsonb("line_items").$type<QuotationLineItem[]>().notNull().default([]),
  subtotalPhp: integer("subtotal_php").notNull(),
  discountPhp: integer("discount_php").notNull().default(0),
  discountLabel: text("discount_label"),
  totalPhp: integer("total_php").notNull(),
  downpaymentRequiredPhp: integer("downpayment_required_php").notNull(),
  status: text("status").notNull().default("pending_approval"), // draft | pending_approval | approved | superseded
  approvedByName: text("approved_by_name"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  quotationId: integer("quotation_id").references(() => quotations.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  totalAmountPhp: integer("total_amount_php").notNull(),
  downpaymentAmountPhp: integer("downpayment_amount_php").notNull(),
  amountPaidPhp: integer("amount_paid_php").notNull().default(0),
  balancePhp: integer("balance_php").notNull(),
  dueDate: text("due_date"),
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | partial | paid
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  receiptNumber: text("receipt_number").notNull().unique(),
  amountPhp: integer("amount_php").notNull(),
  paymentStage: text("payment_stage").notNull(), // downpayment | installment | full_balance
  method: text("method").notNull(),
  // paymongo_gcash_test | paymongo_maya_test | paymongo_card_test | manual_cash | bank_transfer
  paymongoSessionId: text("paymongo_session_id"),
  paymongoSignatureHash: text("paymongo_signature_hash"),
  verificationStatus: text("verification_status").notNull().default("verified"),
  // pending_verification | verified | failed
  payerName: text("payer_name").notNull(),
  payerEmail: text("payer_email"),
  recordedByUserId: integer("recorded_by_user_id").references(() => users.id),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull().default("system"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memorials = pgTable("memorials", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  slug: text("slug").notNull().unique(),
  deceasedName: text("deceased_name").notNull(),
  sunriseDate: text("sunrise_date"),
  sunsetDate: text("sunset_date"),
  portraitImageUrl: text("portrait_image_url"),
  obituaryText: text("obituary_text").notNull(),
  wakeLocationSummary: text("wake_location_summary"),
  intermentSummary: text("interment_summary"),
  isPublic: boolean("is_public").notNull().default(false),
  familyShareCode: text("family_share_code").notNull(),
  candlesCount: integer("candles_count").notNull().default(0),
  tributes: jsonb("tributes").$type<MemorialTribute[]>().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id"),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const coordinatorMessages = pgTable("coordinator_messages", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  senderUserId: integer("sender_user_id").references(() => users.id),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open | responded | resolved
  coordinatorReply: text("coordinator_reply"),
  repliedByName: text("replied_by_name"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
