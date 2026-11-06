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

export const DEMO_USERS: Prisma.UserCreateManyInput[] = [
  {
    id: "laura",
    name: "Laura",
    fullName: "Laura Mendez",
    email: "laura@finpal.demo",
    handle: "@laura.designs",
    age: 29,
    occupation: "Freelance designer",
    city: "Bogota",
    avatarColor: "#0B3D91",
    balanceCents: 3_200_00,
  },
  {
    id: "maria",
    name: "Maria",
    fullName: "Maria Torres",
    email: "maria@finpal.demo",
    handle: "@maria.t",
    age: 34,
    occupation: "Product manager",
    city: "Mexico City",
    avatarColor: "#00806F",
    balanceCents: 1_540_00,
  },
  {
    id: "sam",
    name: "Sam",
    fullName: "Sam Rivera",
    email: "sam@finpal.demo",
    handle: "@samr",
    age: 26,
    occupation: "Software developer",
    city: "Austin",
    avatarColor: "#B45309",
    balanceCents: 860_25,
  },
];

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

const DEMO_POSITIONS: Prisma.PositionCreateManyInput[] = [
  { userId: "maria", assetId: "total-market-index", shares: 4.2 },
  { userId: "maria", assetId: "short-term-bond", shares: 6 },
];

// ---------- entry point ----------

/** Wipes all demo data and recreates it. Runs inside a single DB transaction. */
export async function seedDemo(prisma: PrismaClient, now = new Date()) {
  const laura = lauraHistory(now);
  const { maria, sam } = otherHistory(now);
  const withUser = (userId: string, rows: TxSeed[]) => rows.map((r) => ({ ...r, userId }));

  await prisma.$transaction(
    async (tx) => {
      await tx.moneyRequest.deleteMany();
      await tx.transaction.deleteMany();
      await tx.position.deleteMany();
      await tx.riskProfile.deleteMany();
      await tx.autoInvestEvent.deleteMany();
      await tx.user.deleteMany();
      await tx.asset.deleteMany();

      await tx.asset.createMany({ data: DEMO_ASSETS });
      await tx.user.createMany({ data: DEMO_USERS });
      await tx.transaction.createMany({
        data: [...withUser("laura", laura), ...withUser("maria", maria), ...withUser("sam", sam)],
      });
      await tx.position.createMany({ data: DEMO_POSITIONS });
      // One open request so the Payments screen has something to act on.
      await tx.moneyRequest.create({
        data: {
          requesterId: "sam",
          payerId: "laura",
          amountCents: 18_50,
          note: "Pizza night",
          createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
        },
      });
    },
    { timeout: 30_000 },
  );

  return { transactions: laura.length + maria.length + sam.length };
}
