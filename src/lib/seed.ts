import { count } from "drizzle-orm";
import {
  db,
  users,
  packages,
  addOns,
  inventory,
  resources,
  documentRequirements,
  bookings,
  deceasedRecords,
  documents,
  schedules,
  quotations,
  invoices,
  payments,
  notifications,
  memorials,
  auditLogs,
  coordinatorMessages,
} from "@/db";
import { hashPassword, generatePaymongoTestSignature } from "./auth";

let seedPromise: Promise<void> | null = null;

function createSampleDocumentDataUrl(title: string, ref: string, holder: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520" viewBox="0 0 760 520">
    <rect width="760" height="520" fill="#FAF8F5" stroke="#1E293B" stroke-width="6"/>
    <rect x="24" y="24" width="712" height="472" fill="none" stroke="#B08D57" stroke-width="2"/>
    <text x="380" y="85" font-family="Georgia, serif" font-size="22" fill="#1E293B" text-anchor="middle" font-weight="bold">REPUBLIC OF THE PHILIPPINES • QUEZON CITY CIVIL REGISTRY</text>
    <text x="380" y="125" font-family="Georgia, serif" font-size="26" fill="#B08D57" text-anchor="middle">${title}</text>
    <line x1="120" y1="150" x2="640" y2="150" stroke="#CBD5E1" stroke-width="1.5"/>
    <text x="120" y="205" font-family="Arial, sans-serif" font-size="16" fill="#334155">Case Reference: ${ref}</text>
    <text x="120" y="245" font-family="Arial, sans-serif" font-size="16" fill="#334155">Subject / Informant: ${holder}</text>
    <text x="120" y="285" font-family="Arial, sans-serif" font-size="16" fill="#334155">Privacy Classification: RA 10173 Protected Civil Record (Sample Test Document)</text>
    <text x="120" y="345" font-family="Arial, sans-serif" font-size="14" fill="#64748B">Stored privately on Tahanan ng Kapayapaan encrypted server storage.</text>
    <rect x="490" y="385" width="180" height="60" rx="6" fill="#F1F5F9" stroke="#94A3B8"/>
    <text x="580" y="420" font-family="Courier, monospace" font-size="13" fill="#1E293B" text-anchor="middle">CERTIFIED COPY</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = runSeed().finally(() => {
    seedPromise = null;
  });
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(users);
  if (total > 0) return;

  const now = new Date();
  const addDays = (d: number, hour = 9) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    dt.setHours(hour, 0, 0, 0);
    return dt;
  };
  const fmtDate = (d: number) => addDays(d).toISOString().slice(0, 10);

  // 1. Seed Users across all 5 roles (including README role)
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        email: "maria.santos@example.ph",
        passwordHash: hashPassword("DemoClient2026!"),
        fullName: "Maria Clara Santos",
        role: "client",
        staffTitle: "Family Representative",
        preferredLanguage: "en",
        privacyConsentAt: now,
      },
      {
        email: "elena.reyes@kapayapaan.ph",
        passwordHash: hashPassword("DemoCoord2026!"),
        fullName: "Elena Reyes",
        role: "coordinator",
        staffTitle: "Senior Family Service Coordinator",
        preferredLanguage: "en",
        privacyConsentAt: now,
      },
      {
        email: "ramon.cruz@kapayapaan.ph",
        passwordHash: hashPassword("DemoStaff2026!"),
        fullName: "Ramon Cruz",
        role: "staff",
        staffTitle: "Lead Ceremonial Hearse & Chapel Specialist",
        preferredLanguage: "fil",
        privacyConsentAt: now,
      },
      {
        email: "antonio.magsaysay@kapayapaan.ph",
        passwordHash: hashPassword("DemoAdmin2026!"),
        fullName: "Antonio Magsaysay",
        role: "admin",
        staffTitle: "Managing Director & Data Privacy Officer",
        preferredLanguage: "en",
        privacyConsentAt: now,
      },
      {
        email: "readme@kapayapaan.ph",
        passwordHash: hashPassword("DemoReadme2026!"),
        fullName: "System Guide & Compliance Auditor (README Role)",
        role: "readme",
        staffTitle: "Read-Only Documentation & System Observer",
        preferredLanguage: "en",
        privacyConsentAt: now,
      },
      {
        email: "rafael.dizon@example.ph",
        passwordHash: hashPassword("DemoClient2026!"),
        fullName: "Rafael Dizon",
        role: "client",
        staffTitle: "Family Representative",
        preferredLanguage: "en",
        privacyConsentAt: now,
      },
      {
        email: "marco.villanueva@kapayapaan.ph",
        passwordHash: hashPassword("DemoStaff2026!"),
        fullName: "Marco Villanueva",
        role: "staff",
        staffTitle: "Chapel Concierge & Crematory Attendant",
        preferredLanguage: "en",
        privacyConsentAt: now,
      },
    ])
    .returning();

  const clientMaria = insertedUsers[0];
  const coordElena = insertedUsers[1];
  const staffRamon = insertedUsers[2];
  const adminAntonio = insertedUsers[3];
  const clientRafael = insertedUsers[5];
  const staffMarco = insertedUsers[6];

  // 2. Seed Packages
  const insertedPackages = await db
    .insert(packages)
    .values([
      {
        slug: "payapa-traditional-service",
        name: "Payapa Traditional Wake & Interment",
        nameFil: "Payapa Tradisyonal na Burol at Libing",
        category: "traditional",
        pricePhp: 88000,
        durationDays: 4,
        description:
          "A calm, unhurried four-day chapel wake and dignified interment service with complete civil documentation guidance and family suite comfort.",
        descriptionFil:
          "Apat na araw na mapayapang burol sa kapilya at marangal na paglilibing na may buong gabay sa mga dokumento at pag-aasikaso sa pamilya.",
        inclusions: [
          "Dignified transfer from place of passing within Metro Manila",
          "Hygienic restorative care and dressing by licensed embalmers",
          "Classic Mahogany Sanctuary Casket with cream satin interior",
          "4-day private chapel viewing with quiet family rest lounge",
          "Fresh white phalaenopsis orchid & peace lily altar arrangement",
          "Guest registry book, prayer cards, and memorial tribute easel",
          "Ceremonial hearse coach on interment day",
          "Coordinator assistance with Local Civil Registrar permits",
        ],
        casketIncluded: "Classic Mahogany Sanctuary Casket",
        chapelIncluded: "Sampaguita Garden Suite or Narra Family Chapel (4 days)",
        sortOrder: 1,
      },
      {
        slug: "gunita-heritage-chapel",
        name: "Gunita Heritage Sanctuary Service",
        nameFil: "Gunita Marangal na Serbisyo sa Kapilya",
        category: "traditional",
        pricePhp: 145000,
        durationDays: 5,
        description:
          "Designed for larger extended families gathering over five days in our flagship St. Therese Sanctuary Chapel with a handcrafted solid Philippine Narra casket.",
        descriptionFil:
          "Limang araw na pagtitipon ng buong pamilya sa St. Therese Sanctuary Chapel kasama ang gawang-kamay na ataul mula sa kahoy ng Narra.",
        inclusions: [
          "24-hour dignified transfer and full restorative embalming care",
          "Solid Philippine Narra Heritage Casket with brushed bronze hardware",
          "5-day wake in St. Therese Sanctuary Chapel (up to 80 guests)",
          "Private family suite with warm beverage refreshment pantry",
          "Two grand white floral standing sprays and casket topper",
          "Framed 16x20 memorial portrait and digital private memorial page",
          "Mercedes-Benz Ceremonial Hearse Coach & family escort vehicle",
          "Full civil registration & burial permit facilitation",
        ],
        casketIncluded: "Solid Philippine Narra Heritage Casket",
        chapelIncluded: "St. Therese Sanctuary Chapel (5 days)",
        sortOrder: 2,
      },
      {
        slug: "liwanag-cremation-viewing",
        name: "Liwanag Viewing & Dignified Cremation",
        nameFil: "Liwanag Burol at Marangal na Kremasyon",
        category: "cremation",
        pricePhp: 76000,
        durationDays: 3,
        description:
          "Three days of peaceful chapel viewing prior to private on-site cremation, accompanied by a hand-turned alabaster marble urn.",
        descriptionFil:
          "Tatlong araw na tahimik na burol sa kapilya bago ang pribadong kremasyon, kasama ang marmol na urna.",
        inclusions: [
          "Respectful Metro Manila transfer and preparation for viewing",
          "Ceremonial viewing casket for the 3-day chapel vigil",
          "3-day viewing in Narra Intimate Family Chapel",
          "Private scheduled cremation in Kapayapaan On-Site Crematory",
          "Warm Alabaster Marble Urn with engraved brass nameplate",
          "White orchid urn wreath and memorial register folio",
          "Cremation certificate and civil permit coordination",
        ],
        casketIncluded: "Ceremonial Viewing Casket + Warm Alabaster Marble Urn",
        chapelIncluded: "Narra Intimate Family Chapel (3 days)",
        sortOrder: 3,
      },
      {
        slug: "tahimik-direct-cremation",
        name: "Tahimik Direct Cremation Care",
        nameFil: "Tahimik Tuwirang Kremasyon",
        category: "direct",
        pricePhp: 48000,
        durationDays: 1,
        description:
          "Simple, gentle direct cremation with an intimate one-hour private family farewell moment before cremation and complete civil paperwork support.",
        descriptionFil:
          "Simple at magalang na tuwirang kremasyon na may isang oras na pribadong pamamaalam ng pamilya at tulong sa mga papeles.",
        inclusions: [
          "Dignified transfer from hospital or residence within Metro Manila",
          "Sanitary care and cotton-linen shrouding",
          "1-hour quiet family farewell in the Sanctuary Viewing Room",
          "Individual on-site cremation with official cremation certificate",
          "Hand-Turned Acacia Wood Urn with engraved brass plaque",
          "Dedicated coordinator guidance for permits",
        ],
        casketIncluded: "Hand-Turned Acacia Wood Urn",
        chapelIncluded: "1-hour Private Farewell Suite",
        sortOrder: 4,
      },
    ])
    .returning();

  // 3. Seed Optional Respectful Add-Ons
  const insertedAddOns = await db
    .insert(addOns)
    .values([
      {
        name: "Additional Chapel Viewing Day",
        nameFil: "Karagdagang Araw sa Kapilya",
        category: "chapel",
        pricePhp: 12500,
        unitLabel: "per additional day",
        description: "Extends private chapel use and family lounge hospitality by 24 hours.",
      },
      {
        name: "White Orchid & Peace Lily Sanctuary Tribute",
        nameFil: "Karagdagang Puting Orkidyas at Liryo",
        category: "floral",
        pricePhp: 6500,
        unitLabel: "pair of standing arrangements",
        description: "Two serene white orchid and peace lily arrangements refreshed mid-wake.",
      },
      {
        name: "Acoustic String & Liturgical Choir Vigil",
        nameFil: "Akustikong Musika at Koro sa Misa",
        category: "service",
        pricePhp: 8500,
        unitLabel: "for final vigil mass / service",
        description: "Violinist, pianist, and vocalist for the necrological service or mass.",
      },
      {
        name: "Private Livestream Setup for Overseas Relatives",
        nameFil: "Pribadong Livestream para sa Pamilya sa Abroad",
        category: "documentation",
        pricePhp: 5500,
        unitLabel: "password-protected stream",
        description: "Dedicated camera and private encrypted viewing link for OFW & overseas family.",
      },
      {
        name: "Provincial Hearse Escort (Outside Metro Manila)",
        nameFil: "Paghatid sa Probinsya (Labas ng Metro Manila)",
        category: "transport",
        pricePhp: 14000,
        unitLabel: "up to 100 km radius",
        description: "Dignified long-distance ceremonial hearse transport to provincial cemeteries.",
      },
      {
        name: "Certified Civil Registry Copy Assistance (3 Copies)",
        nameFil: "Tulong sa Karagdagang Sertipikadong Kopya",
        category: "documentation",
        pricePhp: 2500,
        unitLabel: "document processing fee",
        description: "Liaison filing for three certified Local Civil Registrar copies.",
      },
    ])
    .returning();

  // 4. Seed Caskets & Urns Inventory
  const insertedInventory = await db
    .insert(inventory)
    .values([
      {
        sku: "CSK-NARRA-01",
        name: "Solid Philippine Narra Heritage Casket",
        category: "casket",
        material: "Kiln-dried Solid Narra Hardwood",
        finish: "Warm Satin Hand-Rubbed Natural Grain",
        dimensions: "208 cm × 71 cm × 58 cm",
        pricePhp: 62000,
        stockCount: 4,
        reorderLevel: 2,
        imageUrl: "/images/casket-heritage.jpg",
        description:
          "Handcrafted by Pampanga master woodworkers with antique brushed bronze swing bars and unbleached cream linen bedding.",
      },
      {
        sku: "CSK-MAHOG-02",
        name: "Classic Mahogany Sanctuary Casket",
        category: "casket",
        material: "Philippine Mahogany Hardwood",
        finish: "Deep Warm Walnut Matte",
        dimensions: "205 cm × 69 cm × 56 cm",
        pricePhp: 38000,
        stockCount: 7,
        reorderLevel: 2,
        imageUrl: "/images/casket-heritage.jpg",
        description:
          "Timeless half-couch wooden casket with soft ivory crepe interior and solid brass corner accents.",
      },
      {
        sku: "CSK-METAL-03",
        name: "Brushed Champagne 18-Gauge Sanctuary Casket",
        category: "casket",
        material: "18-Gauge Protective Gasketed Steel",
        finish: "Muted Warm Champagne & Taupe",
        dimensions: "210 cm × 72 cm × 58 cm",
        pricePhp: 54000,
        stockCount: 3,
        reorderLevel: 2,
        imageUrl: "/images/casket-heritage.jpg",
        description:
          "Gasketed protective steel construction in a soft champagne bronze tone with tufted off-white velvet interior.",
      },
      {
        sku: "URN-MARBLE-01",
        name: "Warm Alabaster Marble Sanctuary Urn",
        category: "urn",
        material: "Hand-turned Romblon Alabaster Marble",
        finish: "Honed Matte Stone with Brushed Brass Lid",
        dimensions: "27 cm height × 19 cm diameter (3.4 L)",
        pricePhp: 14500,
        stockCount: 9,
        reorderLevel: 3,
        imageUrl: "/images/urn-marble.jpg",
        description:
          "Individually carved from natural Philippine marble with subtle warm veining and custom engraved brass medallion.",
      },
      {
        sku: "URN-ACACIA-02",
        name: "Hand-Turned Acacia Heritage Urn",
        category: "urn",
        material: "Sustainable Solid Acacia Wood",
        finish: "Natural Beeswax Satin",
        dimensions: "24 cm × 18 cm × 18 cm (3.2 L)",
        pricePhp: 8500,
        stockCount: 11,
        reorderLevel: 3,
        imageUrl: "/images/urn-marble.jpg",
        description:
          "Warm organic grain vessel suitable for columbarium niches or home remembrance shelves.",
      },
      {
        sku: "URN-BRASS-03",
        name: "Muted Gold & Slate Keepsake Reliquary Set",
        category: "urn",
        material: "Cast Brass with Slate Enamel",
        finish: "Brushed Muted Gold (#B08D57)",
        dimensions: "Main Urn 26 cm + 3 Mini Family Keepsakes",
        pricePhp: 18500,
        stockCount: 5,
        reorderLevel: 2,
        imageUrl: "/images/urn-marble.jpg",
        description:
          "Allows siblings or children living apart to each keep a small, dignified portion alongside the primary columbarium urn.",
      },
    ])
    .returning();

  // 5. Seed Chapels, Vehicles & Crematory Resources
  const insertedResources = await db
    .insert(resources)
    .values([
      {
        name: "St. Therese Sanctuary Chapel",
        type: "chapel",
        capacity: "Up to 80 seated guests",
        ratePerDayPhp: 15000,
        floorLocation: "Ground Floor, East Wing (Wheelchair Accessible)",
        description:
          "Our largest sunlit sanctuary featuring warm travertine stone walls, acoustic narra pews, private family sleeping suite, and courtyard access.",
        imageUrl: "/images/hero-chapel.jpg",
        features: [
          "Private family bedroom & en-suite bath",
          "Step-free wheelchair access",
          "Quiet refreshment pantry",
          "Dedicated audio & livestream readiness",
        ],
        status: "available",
      },
      {
        name: "Sampaguita Garden Suite",
        type: "chapel",
        capacity: "Up to 50 seated guests",
        ratePerDayPhp: 11000,
        floorLocation: "Ground Floor, Garden Courtyard",
        description:
          "Looks onto our tranquil limestone reflecting garden, offering families a serene indoor-outdoor refuge for quiet conversation.",
        imageUrl: "/images/chapel-garden.jpg",
        features: [
          "Direct view of tranquil reflecting courtyard",
          "Private family rest lounge",
          "Warm dimmable architectural lighting",
          "Dedicated Wi-Fi & tribute display screen",
        ],
        status: "available",
      },
      {
        name: "Narra Intimate Family Chapel",
        type: "chapel",
        capacity: "Up to 30 seated guests",
        ratePerDayPhp: 8500,
        floorLocation: "Second Floor, Quiet Sanctuary Wing (Elevator Access)",
        description:
          "Thoughtfully proportioned for intimate family gatherings, quiet prayer vigils, and cremation viewings.",
        imageUrl: "/images/hero-chapel.jpg",
        features: [
          "Wide hospital-grade elevator access",
          "Intimate acoustic privacy",
          "Family kitchenette & lounge sofa",
          "Complimentary brewed barako coffee & tea station",
        ],
        status: "available",
      },
      {
        name: "Ceremonial Hearse Coach Alpha",
        type: "vehicle",
        capacity: "1 Casket + Driver & Attendant",
        ratePerDayPhp: 6500,
        floorLocation: "Motorpool Bay 1",
        description:
          "Midnight-navy ceremonial coach maintained to immaculate standards for church blessings and cemetery processions.",
        imageUrl: "/images/chapel-garden.jpg",
        features: [
          "GPS-coordinated procession pacing",
          "Stainless roller deck & floral rack",
          "Uniformed chauffeur & ceremonial escort",
        ],
        status: "available",
      },
      {
        name: "Dignified First-Call Transfer Coach Beta",
        type: "vehicle",
        capacity: "First-Call Hospital / Residence Transfer",
        ratePerDayPhp: 4500,
        floorLocation: "Motorpool Bay 2",
        description:
          "Discreet, climate-controlled transfer van operated 24/7 by two trained transfer specialists.",
        imageUrl: "/images/chapel-garden.jpg",
        features: [
          "24/7 Metro Manila hospital & home transfer",
          "Two-person licensed transfer crew",
          "Sanitized cot & linen shrouding kit",
        ],
        status: "available",
      },
      {
        name: "Kapayapaan On-Site Crematory Suite A",
        type: "crematory",
        capacity: "Individual Private Cremation Chamber",
        ratePerDayPhp: 12000,
        floorLocation: "Sanctuary West Pavilion",
        description:
          "Modern, environmentally compliant individual cremation chamber adjacent to a quiet glass-walled family farewell room.",
        imageUrl: "/images/urn-marble.jpg",
        features: [
          "Strict single-individual chain-of-custody tag",
          "Adjacent private family witness/farewell suite",
          "Same-day official certificate of cremation",
        ],
        status: "available",
      },
    ])
    .returning();

  // 6. Seed Editable Required Document Types
  await db.insert(documentRequirements).values([
    {
      code: "death_certificate",
      name: "Certificate of Death (Municipal Form No. 103)",
      nameFil: "Sertipiko ng Kamatayan (Municipal Form 103)",
      description:
        "Signed by the attending physician or municipal health officer for civil registration.",
      appliesTo: "all",
      isRequired: true,
      active: true,
      sortOrder: 1,
    },
    {
      code: "transfer_burial_permit",
      name: "Burial / Transfer Permit (Local Civil Registrar)",
      nameFil: "Permit sa Paglilibing o Paglipat",
      description:
        "Issued by the city or municipal health department where passing occurred.",
      appliesTo: "interment",
      isRequired: true,
      active: true,
      sortOrder: 2,
    },
    {
      code: "cremation_authorization",
      name: "Cremation Permit & Next-of-Kin Signed Authorization",
      nameFil: "Permit at Pahintulot sa Kremasyon",
      description:
        "Signed authorization by legal spouse or nearest next-of-kin plus City Health cremation clearance.",
      appliesTo: "cremation",
      isRequired: true,
      active: true,
      sortOrder: 3,
    },
    {
      code: "valid_government_id",
      name: "Valid Government-Issued ID of Informant / Next-of-Kin",
      nameFil: "Balidong Government ID ng Kinatawan ng Pamilya",
      description:
        "PhilSys National ID, Passport, Driver's License, UMID, or Senior Citizen ID of the family representative.",
      appliesTo: "all",
      isRequired: true,
      active: true,
      sortOrder: 4,
    },
  ]);

  // 7. Seed 3 Sample Bookings
  // Booking 1: Maria Clara Santos - Quotation Issued (ready for Client Approval + Down Payment!)
  const [booking1] = await db
    .insert(bookings)
    .values({
      referenceCode: "TKP-2026-1001",
      clientId: clientMaria.id,
      coordinatorId: coordElena.id,
      packageId: insertedPackages[1].id, // Gunita Heritage 145,000
      casketInventoryId: insertedInventory[0].id,
      chapelResourceId: insertedResources[0].id, // St. Therese Chapel
      selectedAddOnIds: [insertedAddOns[1].id, insertedAddOns[3].id], // +6500 +5500 = 157,000
      serviceType: "interment",
      status: "quotation_sent",
      workflowStage: 6,
      wizardStep: 6,
      contactPersonName: "Maria Clara Santos",
      contactPersonEmail: "maria.santos@example.ph",
      contactRelationship: "Daughter",
      contactAddress: "42 Mother Ignacia St., Quezon City, Metro Manila",
      preferredCommunicationChannel: "in_app_portal",
      wakeStartDate: fmtDate(1),
      wakeEndDate: fmtDate(5),
      intermentDate: fmtDate(6),
      intermentLocation: "Loyola Memorial Park, Marikina City",
      specialRequests:
        "Quiet liturgical instrumental music only; overseas brother in Toronto will join via private livestream.",
      checklist: [
        {
          id: "chk-1",
          label: "Initial arrangement details & RA 10173 privacy consent recorded",
          stage: "Inquiry",
          completed: true,
          completedBy: "Elena Reyes",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-2",
          label: "Verify Next-of-Kin Government ID",
          stage: "Documents",
          completed: true,
          completedBy: "Elena Reyes",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-3",
          label: "Verify signed Certificate of Death (Form 103)",
          stage: "Documents",
          completed: false,
        },
        {
          id: "chk-4",
          label: "Client quotation approval & initial down payment confirmation",
          stage: "Payment",
          completed: false,
        },
        {
          id: "chk-5",
          label: "Prepare St. Therese Sanctuary Chapel & livestream link",
          stage: "Coordination",
          completed: false,
        },
      ],
      caseNotes: [
        {
          id: "note-1",
          authorName: "Elena Reyes",
          authorRole: "coordinator",
          text: "Itemized quotation QT-2026-1001 prepared and shared with Ms. Maria Santos. St. Therese Sanctuary Chapel reserved.",
          isInternal: false,
          createdAt: now.toISOString(),
        },
        {
          id: "note-2",
          authorName: "Elena Reyes",
          authorRole: "coordinator",
          text: "Internal note: Family requested barako coffee & decaf chamomile tea in the family lounge.",
          isInternal: true,
          createdAt: now.toISOString(),
        },
      ],
      privacyConsentAccepted: true,
      privacyConsentAt: now,
      totalAmountPhp: 157000,
      downpaymentRequiredPhp: 47100,
      amountPaidPhp: 0,
      balancePhp: 157000,
    })
    .returning();

  // Booking 2: Maria Clara Santos - Service Coordination (Down payment verified, remaining balance open)
  const [booking2] = await db
    .insert(bookings)
    .values({
      referenceCode: "TKP-2026-1002",
      clientId: clientMaria.id,
      coordinatorId: coordElena.id,
      packageId: insertedPackages[2].id, // Liwanag Cremation 76,000
      casketInventoryId: insertedInventory[3].id, // Alabaster Urn
      chapelResourceId: insertedResources[2].id, // Narra Chapel
      selectedAddOnIds: [insertedAddOns[2].id], // +8,500 = 84,500
      serviceType: "cremation",
      status: "in_coordination",
      workflowStage: 9,
      wizardStep: 6,
      contactPersonName: "Maria Clara Santos",
      contactPersonEmail: "maria.santos@example.ph",
      contactRelationship: "Niece & Legal Representative",
      contactAddress: "42 Mother Ignacia St., Quezon City, Metro Manila",
      preferredCommunicationChannel: "email",
      wakeStartDate: fmtDate(0),
      wakeEndDate: fmtDate(2),
      intermentDate: fmtDate(3),
      intermentLocation: "Kapayapaan On-Site Crematory → Santuario de San Antonio Columbarium",
      specialRequests: "Engrave 'Lola Carmen — Mahal ka naming lahat' on the brass urn medallion.",
      checklist: [
        {
          id: "chk-21",
          label: "All civil & cremation authorization permits verified",
          stage: "Documents",
          completed: true,
          completedBy: "Elena Reyes",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-22",
          label: "Quotation approved & Down Payment verified via PayMongo Test Mode",
          stage: "Payment",
          completed: true,
          completedBy: "PayMongo Server Verifier",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-23",
          label: "Narra Intimate Family Chapel floral & portrait setup",
          stage: "Coordination",
          completed: true,
          completedBy: "Marco Villanueva",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-24",
          label: "Final balance settlement & cremation certificate release",
          stage: "Full Payment",
          completed: false,
        },
      ],
      caseNotes: [
        {
          id: "note-21",
          authorName: "Marco Villanueva",
          authorRole: "staff",
          text: "Narra Chapel viewing room ready; white orchids arranged and brass nameplate proof checked.",
          isInternal: false,
          createdAt: now.toISOString(),
        },
      ],
      privacyConsentAccepted: true,
      privacyConsentAt: now,
      totalAmountPhp: 84500,
      downpaymentRequiredPhp: 38000,
      amountPaidPhp: 38000,
      balancePhp: 46500,
    })
    .returning();

  // Booking 3: Rafael Dizon - Completed & Fully Paid
  const [booking3] = await db
    .insert(bookings)
    .values({
      referenceCode: "TKP-2026-1003",
      clientId: clientRafael.id,
      coordinatorId: coordElena.id,
      packageId: insertedPackages[0].id, // Payapa Traditional 88,000
      casketInventoryId: insertedInventory[1].id,
      chapelResourceId: insertedResources[1].id, // Sampaguita Garden Suite
      selectedAddOnIds: [insertedAddOns[5].id], // +2,500 = 90,500
      serviceType: "interment",
      status: "completed",
      workflowStage: 11,
      wizardStep: 6,
      contactPersonName: "Rafael Dizon",
      contactPersonEmail: "rafael.dizon@example.ph",
      contactRelationship: "Eldest Son",
      contactAddress: "19 Katipunan Ave., Loyola Heights, Quezon City",
      preferredCommunicationChannel: "in_app_portal",
      wakeStartDate: fmtDate(-6),
      wakeEndDate: fmtDate(-3),
      intermentDate: fmtDate(-2),
      intermentLocation: "Himlayang Pilipino Memorial Park, Quezon City",
      specialRequests: "Completed with gratitude from the Dizon family.",
      checklist: [
        {
          id: "chk-31",
          label: "Documents verified & burial permit filed",
          stage: "Documents",
          completed: true,
          completedBy: "Elena Reyes",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-32",
          label: "Full balance settled & Acknowledgment Receipts issued",
          stage: "Full Payment",
          completed: true,
          completedBy: "Elena Reyes",
          completedAt: now.toISOString(),
        },
        {
          id: "chk-33",
          label: "Interment procession completed at Himlayang Pilipino",
          stage: "Completed",
          completed: true,
          completedBy: "Ramon Cruz",
          completedAt: now.toISOString(),
        },
      ],
      caseNotes: [
        {
          id: "note-31",
          authorName: "Elena Reyes",
          authorRole: "coordinator",
          text: "All certified civil registry copies handed to Mr. Rafael Dizon. Case completed.",
          isInternal: false,
          createdAt: now.toISOString(),
        },
      ],
      privacyConsentAccepted: true,
      privacyConsentAt: now,
      totalAmountPhp: 90500,
      downpaymentRequiredPhp: 30000,
      amountPaidPhp: 90500,
      balancePhp: 0,
    })
    .returning();

  // 8. Seed Deceased Records
  await db.insert(deceasedRecords).values([
    {
      bookingId: booking1.id,
      fullName: "Don Roberto Salazar Santos",
      dateOfBirth: "1944-08-14",
      dateOfPassing: fmtDate(0),
      ageAtPassing: 81,
      gender: "Male",
      religion: "Roman Catholic",
      placeOfPassing: "St. Luke's Medical Center, Quezon City",
      biographySummary:
        "Retired civil engineer, devoted husband, father of four, and quiet mentor to generations of young scholars in Quezon City.",
    },
    {
      bookingId: booking2.id,
      fullName: "Carmen Mercado-Valdez",
      dateOfBirth: "1939-11-03",
      dateOfPassing: fmtDate(-1),
      ageAtPassing: 86,
      gender: "Female",
      religion: "Roman Catholic",
      placeOfPassing: "Private Residence, Brgy. Laging Handa, Quezon City",
      biographySummary:
        "Beloved retired public school music teacher remembered for her warmth, choir accompaniment, and Sunday family lunches.",
    },
    {
      bookingId: booking3.id,
      fullName: "Engr. Arturo Panganiban Dizon",
      dateOfBirth: "1951-03-22",
      dateOfPassing: fmtDate(-7),
      ageAtPassing: 75,
      gender: "Male",
      religion: "Christian",
      placeOfPassing: "Philippine Heart Center, Quezon City",
      biographySummary:
        "Dedicated structural engineer, avid gardener, and loving grandfather whose quiet integrity anchored the Dizon clan.",
    },
  ]);

  // 9. Seed Documents (Pending, Verified, Needs Revision examples)
  await db.insert(documents).values([
    {
      bookingId: booking1.id,
      requirementCode: "valid_government_id",
      documentLabel: "Valid Government-Issued ID of Informant / Next-of-Kin",
      fileName: "maria_santos_philsys_id.svg",
      mimeType: "image/svg+xml",
      fileSizeBytes: 2480,
      privateStoragePayload: createSampleDocumentDataUrl(
        "PHILSYS NATIONAL ID — INFORMANT COPY",
        "TKP-2026-1001",
        "Maria Clara Santos"
      ),
      status: "verified",
      reviewerNote: "Verified against informant signature.",
      uploadedByUserId: clientMaria.id,
      reviewedByUserId: coordElena.id,
    },
    {
      bookingId: booking1.id,
      requirementCode: "death_certificate",
      documentLabel: "Certificate of Death (Municipal Form No. 103)",
      fileName: "roberto_santos_form103_scan.svg",
      mimeType: "image/svg+xml",
      fileSizeBytes: 2610,
      privateStoragePayload: createSampleDocumentDataUrl(
        "MUNICIPAL FORM 103 — CERTIFICATE OF DEATH",
        "TKP-2026-1001",
        "Don Roberto Salazar Santos"
      ),
      status: "pending",
      reviewerNote: "Awaiting final coordinator verification check.",
      uploadedByUserId: clientMaria.id,
    },
    {
      bookingId: booking2.id,
      requirementCode: "death_certificate",
      documentLabel: "Certificate of Death (Municipal Form No. 103)",
      fileName: "carmen_valdez_form103.svg",
      mimeType: "image/svg+xml",
      fileSizeBytes: 2590,
      privateStoragePayload: createSampleDocumentDataUrl(
        "MUNICIPAL FORM 103 — CERTIFICATE OF DEATH",
        "TKP-2026-1002",
        "Carmen Mercado-Valdez"
      ),
      status: "verified",
      reviewerNote: "Physician signature and registry stamp verified.",
      uploadedByUserId: clientMaria.id,
      reviewedByUserId: coordElena.id,
    },
    {
      bookingId: booking2.id,
      requirementCode: "cremation_authorization",
      documentLabel: "Cremation Permit & Next-of-Kin Signed Authorization",
      fileName: "carmen_valdez_cremation_permit.svg",
      mimeType: "image/svg+xml",
      fileSizeBytes: 2540,
      privateStoragePayload: createSampleDocumentDataUrl(
        "CITY HEALTH CREMATION PERMIT & AUTHORIZATION",
        "TKP-2026-1002",
        "Carmen Mercado-Valdez"
      ),
      status: "verified",
      reviewerNote: "Cleared for scheduled on-site cremation.",
      uploadedByUserId: clientMaria.id,
      reviewedByUserId: coordElena.id,
    },
  ]);

  // 10. Seed Schedules (No overlapping resources or staff!)
  await db.insert(schedules).values([
    {
      bookingId: booking1.id,
      resourceId: insertedResources[4].id, // Transfer Coach Beta
      assignedStaffId: staffRamon.id,
      title: "Hospital Transfer — St. Luke's QC to Sanctuary Preparation",
      eventType: "transfer",
      startTime: addDays(1, 8),
      endTime: addDays(1, 11),
      location: "St. Luke's Medical Center, E. Rodriguez Sr. Ave., QC",
      taskStatus: "scheduled",
      notes: "Coordinate quietly at Hospital Mortuary Gate B with Elena Reyes.",
    },
    {
      bookingId: booking1.id,
      resourceId: insertedResources[0].id, // St. Therese Chapel
      assignedStaffId: staffMarco.id,
      title: "5-Day Wake — Don Roberto Santos (St. Therese Sanctuary)",
      eventType: "wake",
      startTime: addDays(1, 14),
      endTime: addDays(5, 20),
      location: "St. Therese Sanctuary Chapel, Ground Floor East Wing",
      taskStatus: "scheduled",
      notes: "Set up private livestream camera and warm chamomile tea station.",
    },
    {
      bookingId: booking1.id,
      resourceId: insertedResources[3].id, // Ceremonial Hearse Alpha
      assignedStaffId: staffRamon.id,
      title: "Interment Procession — Loyola Memorial Park Marikina",
      eventType: "interment",
      startTime: addDays(6, 8),
      endTime: addDays(6, 12),
      location: "St. Therese Chapel → Loyola Memorial Park, Marikina",
      taskStatus: "scheduled",
      notes: "Departure promptly after 8:30 AM blessing.",
    },
    {
      bookingId: booking2.id,
      resourceId: insertedResources[2].id, // Narra Chapel
      assignedStaffId: staffMarco.id,
      title: "3-Day Viewing — Carmen Mercado-Valdez (Narra Chapel)",
      eventType: "wake",
      startTime: addDays(0, 10),
      endTime: addDays(2, 21),
      location: "Narra Intimate Family Chapel, 2nd Floor",
      taskStatus: "in_progress",
      notes: "Acoustic vigil ensemble scheduled on final evening at 7:00 PM.",
    },
    {
      bookingId: booking2.id,
      resourceId: insertedResources[5].id, // Crematory Suite A
      assignedStaffId: staffMarco.id,
      title: "Private Cremation — Carmen Mercado-Valdez",
      eventType: "cremation",
      startTime: addDays(3, 10),
      endTime: addDays(3, 13),
      location: "Kapayapaan On-Site Crematory Suite A",
      taskStatus: "scheduled",
      notes: "Prepare Warm Alabaster Marble Urn with engraved brass medallion.",
    },
  ]);

  // 11. Seed Quotations & Invoices
  const [quote1] = await db
    .insert(quotations)
    .values({
      bookingId: booking1.id,
      quotationNumber: "QT-2026-1001",
      lineItems: [
        {
          id: "li-1",
          description: "Gunita Heritage Sanctuary Service (5 Days, Solid Narra Casket included)",
          category: "package",
          quantity: 1,
          unitPricePhp: 145000,
          totalPhp: 145000,
        },
        {
          id: "li-2",
          description: "White Orchid & Peace Lily Sanctuary Tribute",
          category: "addon",
          quantity: 1,
          unitPricePhp: 6500,
          totalPhp: 6500,
        },
        {
          id: "li-3",
          description: "Private Livestream Setup for Overseas Relatives",
          category: "addon",
          quantity: 1,
          unitPricePhp: 5500,
          totalPhp: 5500,
        },
      ],
      subtotalPhp: 157000,
      discountPhp: 0,
      totalPhp: 157000,
      downpaymentRequiredPhp: 47100,
      status: "pending_approval",
      notes:
        "30% initial down payment initiates formal chapel confirmation. Remaining balance may be settled in calm installments before interment.",
    })
    .returning();

  const [quote2] = await db
    .insert(quotations)
    .values({
      bookingId: booking2.id,
      quotationNumber: "QT-2026-1002",
      lineItems: [
        {
          id: "li-21",
          description: "Liwanag Viewing & Dignified Cremation (3 Days + Alabaster Marble Urn)",
          category: "package",
          quantity: 1,
          unitPricePhp: 76000,
          totalPhp: 76000,
        },
        {
          id: "li-22",
          description: "Acoustic String & Liturgical Choir Vigil",
          category: "addon",
          quantity: 1,
          unitPricePhp: 8500,
          totalPhp: 8500,
        },
      ],
      subtotalPhp: 84500,
      discountPhp: 0,
      totalPhp: 84500,
      downpaymentRequiredPhp: 38000,
      status: "approved",
      approvedByName: "Maria Clara Santos",
      approvedAt: now,
      notes: "Approved online by family representative.",
    })
    .returning();

  const [quote3] = await db
    .insert(quotations)
    .values({
      bookingId: booking3.id,
      quotationNumber: "QT-2026-1003",
      lineItems: [
        {
          id: "li-31",
          description: "Payapa Traditional Wake & Interment (4 Days)",
          category: "package",
          quantity: 1,
          unitPricePhp: 88000,
          totalPhp: 88000,
        },
        {
          id: "li-32",
          description: "Certified Civil Registry Copy Assistance (3 Copies)",
          category: "addon",
          quantity: 1,
          unitPricePhp: 2500,
          totalPhp: 2500,
        },
      ],
      subtotalPhp: 90500,
      discountPhp: 0,
      totalPhp: 90500,
      downpaymentRequiredPhp: 30000,
      status: "approved",
      approvedByName: "Rafael Dizon",
      approvedAt: addDays(-6),
      notes: "Completed & settled in full.",
    })
    .returning();

  const [inv1] = await db
    .insert(invoices)
    .values({
      bookingId: booking1.id,
      quotationId: quote1.id,
      invoiceNumber: "INV-2026-1001",
      totalAmountPhp: 157000,
      downpaymentAmountPhp: 47100,
      amountPaidPhp: 0,
      balancePhp: 157000,
      dueDate: fmtDate(5),
      paymentStatus: "unpaid",
    })
    .returning();

  const [inv2] = await db
    .insert(invoices)
    .values({
      bookingId: booking2.id,
      quotationId: quote2.id,
      invoiceNumber: "INV-2026-1002",
      totalAmountPhp: 84500,
      downpaymentAmountPhp: 38000,
      amountPaidPhp: 38000,
      balancePhp: 46500,
      dueDate: fmtDate(2),
      paymentStatus: "partial",
    })
    .returning();

  const [inv3] = await db
    .insert(invoices)
    .values({
      bookingId: booking3.id,
      quotationId: quote3.id,
      invoiceNumber: "INV-2026-1003",
      totalAmountPhp: 90500,
      downpaymentAmountPhp: 30000,
      amountPaidPhp: 90500,
      balancePhp: 0,
      dueDate: fmtDate(-3),
      paymentStatus: "paid",
    })
    .returning();

  void inv1;

  // 12. Seed Verified Sample Payments (Labeled as Acknowledgment Receipts)
  const pmSig2 = generatePaymongoTestSignature("TKP-2026-1002", 38000, "paymongo_gcash_test");
  const pmSig3 = generatePaymongoTestSignature("TKP-2026-1003", 30000, "paymongo_card_test");

  await db.insert(payments).values([
    {
      bookingId: booking2.id,
      invoiceId: inv2.id,
      receiptNumber: "AR-2026-5001",
      amountPhp: 38000,
      paymentStage: "downpayment",
      method: "paymongo_gcash_test",
      paymongoSessionId: pmSig2.sessionId,
      paymongoSignatureHash: pmSig2.signatureHash,
      verificationStatus: "verified",
      payerName: "Maria Clara Santos",
      payerEmail: "maria.santos@example.ph",
      notes: "PayMongo TEST MODE GCash down payment verified server-side. Acknowledgment Receipt issued.",
      verifiedAt: now,
    },
    {
      bookingId: booking3.id,
      invoiceId: inv3.id,
      receiptNumber: "AR-2026-5002",
      amountPhp: 30000,
      paymentStage: "downpayment",
      method: "paymongo_card_test",
      paymongoSessionId: pmSig3.sessionId,
      paymongoSignatureHash: pmSig3.signatureHash,
      verificationStatus: "verified",
      payerName: "Rafael Dizon",
      payerEmail: "rafael.dizon@example.ph",
      notes: "PayMongo TEST MODE Checkout verified server-side (zero card numbers stored).",
      verifiedAt: addDays(-6),
    },
    {
      bookingId: booking3.id,
      invoiceId: inv3.id,
      receiptNumber: "AR-2026-5003",
      amountPhp: 60500,
      paymentStage: "full_balance",
      method: "manual_cash",
      verificationStatus: "verified",
      payerName: "Rafael Dizon",
      payerEmail: "rafael.dizon@example.ph",
      recordedByUserId: coordElena.id,
      notes: "Cash settlement received at Arrangement Office Desk; Acknowledgment Receipt issued.",
      verifiedAt: addDays(-3),
    },
  ]);

  // 13. Seed Memorials (Private by default for active family; shared example for completed case)
  await db.insert(memorials).values([
    {
      bookingId: booking1.id,
      slug: "don-roberto-santos-1944-2026",
      deceasedName: "Don Roberto Salazar Santos",
      sunriseDate: "August 14, 1944",
      sunsetDate: fmtDate(0),
      portraitImageUrl: "/images/hero-chapel.jpg",
      obituaryText:
        "With quiet gratitude for a life of generosity and service, our family remembers Don Roberto Salazar Santos. Please keep him in your gentle prayers.",
      wakeLocationSummary: "St. Therese Sanctuary Chapel, Tahanan ng Kapayapaan, Quezon City",
      intermentSummary: `Loyola Memorial Park, Marikina City (${fmtDate(6)})`,
      isPublic: false, // PRIVATE BY DEFAULT! Family controls sharing
      familyShareCode: "SANTOS-PEACE-2026",
      candlesCount: 4,
      tributes: [
        {
          id: "tr-1",
          authorName: "Maria Clara Santos",
          relationship: "Daughter",
          message: "Maraming salamat sa lahat ng pagmamahal at paggabay, Papa.",
          litCandle: true,
          createdAt: now.toISOString(),
        },
      ],
    },
    {
      bookingId: booking3.id,
      slug: "engr-arturo-dizon-1951-2026",
      deceasedName: "Engr. Arturo Panganiban Dizon",
      sunriseDate: "March 22, 1951",
      sunsetDate: fmtDate(-7),
      portraitImageUrl: "/images/chapel-garden.jpg",
      obituaryText:
        "Forever cherished by his children and grandchildren. Thank you to everyone who joined us in prayer at Sampaguita Garden Suite.",
      wakeLocationSummary: "Sampaguita Garden Suite, Tahanan ng Kapayapaan, Quezon City",
      intermentSummary: "Laid to rest at Himlayang Pilipino Memorial Park",
      isPublic: true, // Family explicitly enabled sharing
      familyShareCode: "DIZON-LIGHT-2026",
      candlesCount: 18,
      tributes: [
        {
          id: "tr-31",
          authorName: "Rafael Dizon",
          relationship: "Son",
          message: "Rest peacefully, Dad. Your kindness lives on in all of us.",
          litCandle: true,
          createdAt: addDays(-5).toISOString(),
        },
        {
          id: "tr-32",
          authorName: "Engr. Noel Bautista",
          relationship: "Colleague & Friend",
          message: "Isang tunay na maginoo at tapat na kaibigan sa propesyon.",
          litCandle: true,
          createdAt: addDays(-4).toISOString(),
        },
      ],
    },
  ]);

  // 14. Seed Notifications
  await db.insert(notifications).values([
    {
      userId: clientMaria.id,
      bookingId: booking1.id,
      title: "Itemized Quotation Ready for Your Review (QT-2026-1001)",
      message:
        "Coordinator Elena Reyes has prepared the itemized quotation for Don Roberto Salazar Santos. Take all the time your family needs to review and approve.",
      category: "approval",
      isRead: false,
    },
    {
      userId: clientMaria.id,
      bookingId: booking2.id,
      title: "Acknowledgment Receipt Issued (AR-2026-5001)",
      message:
        "Your ₱38,000 PayMongo Test Mode down payment for TKP-2026-1002 has been verified server-side. Remaining balance: ₱46,500.",
      category: "payment",
      isRead: false,
    },
    {
      userId: coordElena.id,
      bookingId: booking1.id,
      title: "Document Uploaded for Verification (TKP-2026-1001)",
      message:
        "Maria Clara Santos uploaded Certificate of Death (Form 103) for review.",
      category: "document",
      isRead: false,
    },
    {
      userId: staffRamon.id,
      bookingId: booking1.id,
      title: "Assigned Transfer Schedule — St. Luke's QC",
      message:
        "Transfer Coach Beta scheduled tomorrow at 8:00 AM for case TKP-2026-1001.",
      category: "schedule",
      isRead: false,
    },
    {
      userId: adminAntonio.id,
      bookingId: booking2.id,
      title: "PayMongo Test Payment Verified (₱38,000)",
      message:
        "Acknowledgment Receipt AR-2026-5001 recorded and reconciled against INV-2026-1002.",
      category: "payment",
      isRead: false,
    },
  ]);

  // 15. Seed Coordinator Online Support Message (No Phone Features!)
  await db.insert(coordinatorMessages).values([
    {
      bookingId: booking1.id,
      senderUserId: clientMaria.id,
      senderName: "Maria Clara Santos",
      senderEmail: "maria.santos@example.ph",
      subject: "Question regarding overseas livestream link for Toronto relatives",
      message:
        "Good day Ms. Elena, may we receive the private password-protected viewing link a day before the wake begins so my brother in Canada can test it calmly?",
      status: "responded",
      coordinatorReply:
        "Good day Ms. Maria, yes of course. We will generate and share the encrypted private viewing link 24 hours prior inside your Case Dashboard.",
      repliedByName: "Elena Reyes",
      repliedAt: now,
    },
  ]);

  // 16. Seed Audit Logs
  await db.insert(auditLogs).values([
    {
      actorUserId: adminAntonio.id,
      actorName: "Antonio Magsaysay",
      actorRole: "admin",
      action: "SYSTEM_BOOTSTRAP",
      entityType: "system",
      entityId: "TKP-2026",
      summary:
        "Initialized RA 10173 privacy policies, editable civil document requirements, and PayMongo Test Mode server verification.",
      metadata: { compliance: "RA 10173", mode: "PAYMONGO_TEST" },
    },
    {
      actorUserId: coordElena.id,
      actorName: "Elena Reyes",
      actorRole: "coordinator",
      action: "QUOTATION_ISSUED",
      entityType: "quotation",
      entityId: "QT-2026-1001",
      summary: "Issued itemized quotation QT-2026-1001 (₱157,000) for booking TKP-2026-1001.",
      metadata: { bookingRef: "TKP-2026-1001", totalPhp: 157000 },
    },
    {
      actorUserId: clientMaria.id,
      actorName: "Maria Clara Santos",
      actorRole: "client",
      action: "PAYMENT_VERIFIED_SERVER_SIDE",
      entityType: "payment",
      entityId: "AR-2026-5001",
      summary:
        "PayMongo Test Mode GCash payment of ₱38,000 verified server-side for TKP-2026-1002.",
      metadata: { receiptNumber: "AR-2026-5001", cardStored: false },
    },
  ]);
}
