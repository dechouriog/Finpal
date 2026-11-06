import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Demo data shared by `npm run seed` and the in-app "Reset demo data" button.
 *
 * Laura's numbers are tuned to match the pitch video:
 *  - Wallet balance: $3,200.00
 *  - Last 12 complete months: income averages exactly $1,850/mo, spending exactly $920/mo
 *  - Emergency fund (3 x spending) = $2,760 -> "Ready to invest now" = $440
 * The current month holds a few recent items (Rent, Studio Norte, Groceries) and
 * is excluded from the 12-month analysis.
 */

// ---------- deterministic helpers ----------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** UTC date at a given hour so the calendar day is stable across time zones. */
function at(year: number, month: number, day: number, hour = 12, minute = 0) {
  return new Date(Date.UTC(year, month, day, hour, minute));
}

type TxSeed = Omit<Prisma.TransactionCreateManyInput, "userId">;

// ---------- static catalog ----------

export const DEMO_ASSETS: Prisma.AssetCreateManyInput[] = [
  {
    id: "total-market-index",
    name: "Total Market Index Fund",
    category: "INDEX",
    priceCents: 124_50,
    description: "Owns a small slice of thousands of companies across the whole market.",
  },
  {
    id: "global-equity-index",
    name: "Global Equity Index Fund",
    category: "INDEX",
    priceCents: 87_30,
    description: "Spreads your money across companies in many countries.",
  },
  {
    id: "large-cap-index",
    name: "Large Company Index Fund",
    category: "INDEX",
    priceCents: 215_40,
    description: "Tracks the biggest, most established companies.",
  },
  {
    id: "short-term-bond",
    name: "Short-Term Bond Fund",
    category: "BOND",
    priceCents: 50_20,
    description: "Lends money for short periods. Lower ups and downs than stocks.",
  },
  {
    id: "aggregate-bond",
    name: "Aggregate Bond Fund",
    category: "BOND",
    priceCents: 98_10,
    description: "A broad mix of government and company bonds.",
  },
  {
    id: "inflation-protected-bond",
    name: "Inflation-Protected Bond Fund",
    category: "BOND",
    priceCents: 26_15,
    description: "Bonds designed to keep pace with rising prices.",
  },
  {
    id: "northwind-robotics",
    name: "Northwind Robotics",
    category: "GROWTH",
    priceCents: 43_80,
    description: "A fictional fast-growing automation company. Bigger swings, higher risk.",
  },
  {
    id: "aurora-cloud",
    name: "Aurora Cloud Systems",
    category: "GROWTH",
    priceCents: 156_75,
    description: "A fictional cloud software company. Bigger swings, higher risk.",
  },
];

type Persona = Omit<Prisma.UserCreateManyInput, "id" | "spaceId" | "isDemo" | "email" | "handle"> & {
  emailLocal: string;
  handle: string;
};

/** The three people in every space. Laura is the main user; Maria and Sam are her contacts. */
const PERSONAS: Record<"laura" | "maria" | "sam", Persona> = {
  laura: {
    name: "Laura",
    fullName: "Laura Mendez",
    emailLocal: "laura",
    handle: "@laura.designs",
    age: 29,
    occupation: "Freelance designer",
    city: "Bogota",
    avatarColor: "#0B3D91",
    balanceCents: 3_200_00,
  },
  maria: {
    name: "Maria",
    fullName: "Maria Torres",
    emailLocal: "maria",
    handle: "@maria.t",
    age: 34,
    occupation: "Product manager",
    city: "Mexico City",
    avatarColor: "#00806F",
    balanceCents: 1_540_00,
  },
  sam: {
    name: "Sam",
    fullName: "Sam Rivera",
    emailLocal: "sam",
    handle: "@samr",
    age: 26,
    occupation: "Software developer",
    city: "Austin",
    avatarColor: "#B45309",
    balanceCents: 860_25,
  },
};

/** The reserved space used to record the pitch video (reachable only via the secret URL). */
export const RESERVED_SPACE = { laura: "laura", maria: "maria", sam: "sam" } as const;
export const RESERVED_EMAIL = "laura@finpal.demo";

// ---------- Laura's history ----------

/** Monthly income totals for the last 12 complete months (oldest first). Sum = 12 x $1,850. */
const LAURA_MONTHLY_INCOME = [
  1_760_00, 1_925_00, 1_680_00, 2_010_00, 1_835_00, 1_790_00, 1_950_00, 1_725_00, 1_880_00, 1_905_00, 1_770_00,
  1_970_00,
];
const LAURA_MONTHLY_SPEND = 920_00;
const RETAINER = 850_00; // Studio Norte pays every month: the "steady income pattern"
const OTHER_CLIENTS = ["Andes Coffee Co.", "Lumen Apps", "Brava Records", "Casa Verde Hotels", "Pico Studio"];

function lauraHistory(now: Date): TxSeed[] {
  const rand = mulberry32(29);
  const txs: TxSeed[] = [];
  const curY = now.getUTCFullYear();
  const curM = now.getUTCMonth();

  for (let i = 0; i < 12; i++) {
    // i = 0 is 12 months ago, i = 11 is last month
    const ref = new Date(Date.UTC(curY, curM - 12 + i, 1));
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();
    const income = LAURA_MONTHLY_INCOME[i]!;

    // --- income: retainer + 1 or 2 other clients ---
    txs.push({
      type: "RECEIVE",
      category: "client",
      counterparty: "Studio Norte",
      amountCents: RETAINER,
      note: "Monthly retainer",
      createdAt: at(y, m, 3, 14),
    });
    const rest = income - RETAINER;
    const clientA = OTHER_CLIENTS[i % OTHER_CLIENTS.length]!;
    if (i % 3 === 0) {
      txs.push({ type: "RECEIVE", category: "client", counterparty: clientA, amountCents: rest, note: "Design project", createdAt: at(y, m, 18, 16) });
    } else {
      const first = Math.round((rest * 0.55) / 500) * 500;
      const clientB = OTHER_CLIENTS[(i + 2) % OTHER_CLIENTS.length]!;
      txs.push({ type: "RECEIVE", category: "client", counterparty: clientA, amountCents: first, note: "Design project", createdAt: at(y, m, 12, 15) });
      txs.push({ type: "RECEIVE", category: "client", counterparty: clientB, amountCents: rest - first, note: "Brand refresh", createdAt: at(y, m, 24, 11) });
    }

    // --- spending: fixed bills + variable items, groceries close the month at exactly $920 ---
    const spend: { counterparty: string; category: string; cents: number; day: number }[] = [
      { counterparty: "Rent", category: "rent", cents: 450_00, day: 1 },
      { counterparty: "Design tools", category: "software", cents: 29_00, day: 5 },
      { counterparty: "Power & water", category: "utilities", cents: 52_00 + Math.round(rand() * 12_00), day: 8 },
      { counterparty: "Fiber internet", category: "internet", cents: 39_00, day: 10 },
      { counterparty: "Mobile plan", category: "phone", cents: 22_00, day: 12 },
      { counterparty: "Ride share", category: "transport", cents: 12_00 + Math.round(rand() * 10_00), day: 9 },
      { counterparty: "Ride share", category: "transport", cents: 11_00 + Math.round(rand() * 9_00), day: 21 },
      { counterparty: "Paloma Coffee", category: "dining", cents: 18_00 + Math.round(rand() * 14_00), day: 15 },
      { counterparty: "Groceries", category: "groceries", cents: 58_00 + Math.round(rand() * 14_00), day: 6 },
      { counterparty: "Groceries", category: "groceries", cents: 55_00 + Math.round(rand() * 16_00), day: 13 },
      { counterparty: "Groceries", category: "groceries", cents: 60_00 + Math.round(rand() * 12_00), day: 20 },
    ];
    const subtotal = spend.reduce((s, e) => s + e.cents, 0);
    spend.push({ counterparty: "Groceries", category: "groceries", cents: LAURA_MONTHLY_SPEND - subtotal, day: 27 });

    for (const e of spend) {
      txs.push({
        type: "SEND",
        category: e.category,
        counterparty: e.counterparty,
        amountCents: -e.cents,
        createdAt: at(y, m, e.day, 10 + Math.floor(rand() * 9), Math.floor(rand() * 60)),
      });
    }
  }

  // --- current month: the items shown in "Recent activity" in the pitch ---
  const today = now.getUTCDate();
  const day = (d: number) => Math.min(d, today);
  txs.push({ type: "SEND", category: "rent", counterparty: "Rent", amountCents: -450_00, createdAt: at(curY, curM, 1, 9) });
  txs.push({
    type: "RECEIVE",
    category: "client",
    counterparty: "Studio Norte",
    amountCents: RETAINER,
    note: "Monthly retainer",
    createdAt: at(curY, curM, day(3), 14),
  });
  txs.push({ type: "SEND", category: "groceries", counterparty: "Groceries", amountCents: -64_20, createdAt: at(curY, curM, day(4), 18, 30) });

  return txs;
}

function otherHistory(now: Date): { maria: TxSeed[]; sam: TxSeed[] } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return {
    maria: [
      { type: "DEPOSIT", category: "deposit", counterparty: "PayPal", amountCents: 500_00, note: "Funded with PayPal", createdAt: at(y, m - 2, 4, 10) },
      { type: "BUY", category: "invest", counterparty: "Total Market Index Fund", amountCents: -522_90, assetId: "total-market-index", shares: 4.2, createdAt: at(y, m - 2, 5, 11) },
      { type: "BUY", category: "invest", counterparty: "Short-Term Bond Fund", amountCents: -301_20, assetId: "short-term-bond", shares: 6, createdAt: at(y, m - 2, 5, 11, 5) },
      { type: "RECEIVE", category: "client", counterparty: "Lumen Apps", amountCents: 1_200_00, note: "Consulting", createdAt: at(y, m - 1, 28, 15) },
      { type: "SEND", category: "dining", counterparty: "Luna Taco Shop", amountCents: -38_50, createdAt: at(y, m, 2, 20) },
    ],
    sam: [
      { type: "RECEIVE", category: "client", counterparty: "Brava Records", amountCents: 950_00, note: "Website build", createdAt: at(y, m - 1, 15, 13) },
      { type: "SEND", category: "rent", counterparty: "Rent", amountCents: -600_00, createdAt: at(y, m, 1, 9) },
      { type: "SEND", category: "groceries", counterparty: "Groceries", amountCents: -42_75, createdAt: at(y, m, 3, 19) },
    ],
  };
}

// ---------- spaces ----------

export type SpaceIds = { laura: string; maria: string; sam: string };

function personaUser(
  key: keyof SpaceIds,
  ids: SpaceIds,
  isDemo: boolean,
): Prisma.UserCreateManyInput {
  const { emailLocal, handle, ...rest } = PERSONAS[key];
  const reserved = ids.laura === RESERVED_SPACE.laura;
  // Reserved users keep clean emails/handles; demo clones get a unique suffix.
  const suffix = reserved ? "" : `.${ids.laura.slice(-8)}`;
  return {
    ...rest,
    id: ids[key],
    spaceId: ids.laura,
    isDemo,
    email: reserved ? `${emailLocal}@finpal.demo` : `${emailLocal}+${ids.laura}@demo.finpal.app`,
    handle: `${handle}${suffix}`,
  };
}

/**
 * Create a full space: Laura (main user) plus her contacts Maria and Sam, with
 * 12 months of seeded history. Must run inside a transaction.
 */
export async function createSpace(tx: Prisma.TransactionClient, ids: SpaceIds, opts: { isDemo: boolean; now?: Date }) {
  const now = opts.now ?? new Date();
  const laura = lauraHistory(now);
  const { maria, sam } = otherHistory(now);
  const rows = (userId: string, list: TxSeed[]) => list.map((r) => ({ ...r, userId, isSeed: true }));

  await tx.user.createMany({
    data: [personaUser("laura", ids, opts.isDemo), personaUser("maria", ids, opts.isDemo), personaUser("sam", ids, opts.isDemo)],
  });
  await tx.transaction.createMany({
    data: [...rows(ids.laura, laura), ...rows(ids.maria, maria), ...rows(ids.sam, sam)],
  });
  await tx.position.createMany({
    data: [
      { userId: ids.maria, assetId: "total-market-index", shares: 4.2 },
      { userId: ids.maria, assetId: "short-term-bond", shares: 6 },
    ],
  });
  // One open request so the Payments screen has something to act on.
  await tx.moneyRequest.create({
    data: {
      requesterId: ids.sam,
      payerId: ids.laura,
      amountCents: 18_50,
      note: "Pizza night",
      createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
    },
  });
  return { transactions: laura.length + maria.length + sam.length };
}

/** Delete every user of a space (cascades to their transactions, positions, plans and requests). */
export async function deleteSpace(tx: Prisma.TransactionClient, spaceId: string) {
  const users = await tx.user.findMany({ where: { spaceId }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return 0;
  await tx.moneyRequest.deleteMany({ where: { OR: [{ requesterId: { in: ids } }, { payerId: { in: ids } }] } });
  await tx.user.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

/**
 * Restore a space to its initial state, keeping the main user's id so the
 * signed-in session stays valid. Contacts get fresh ids.
 */
export async function resetSpace(tx: Prisma.TransactionClient, mainUserId: string, isDemo: boolean, now = new Date()) {
  await deleteSpace(tx, mainUserId);
  const reserved = mainUserId === RESERVED_SPACE.laura;
  const ids: SpaceIds = reserved
    ? { ...RESERVED_SPACE }
    : { laura: mainUserId, maria: `${mainUserId}-maria`, sam: `${mainUserId}-sam` };
  return createSpace(tx, ids, { isDemo, now });
}

/** Ids for a brand-new demo space. */
export function newDemoSpaceIds(): SpaceIds {
  const id = `demo_${crypto.randomUUID().replace(/-/g, "")}`;
  return { laura: id, maria: `${id}-maria`, sam: `${id}-sam` };
}

// ---------- entry point ----------

/**
 * Base seed (idempotent, safe to re-run): upserts the asset catalog and resets
 * ONLY the reserved recording space. Demo users created by "Try the demo" are untouched.
 */
export async function seedBase(prisma: PrismaClient, now = new Date()) {
  return prisma.$transaction(
    async (tx) => {
      for (const asset of DEMO_ASSETS) {
        await tx.asset.upsert({ where: { id: asset.id }, create: asset, update: asset });
      }
      return resetSpace(tx, RESERVED_SPACE.laura, false, now);
    },
    { timeout: 30_000 },
  );
}
