export const DAILY_LIMIT_ANON = 5;
export const DAILY_LIMIT_AUTHED = 30;

export type QuotaDoc = {
  date?: string;
  count?: number;
  batches?: Record<string, boolean>;
};

export type QuotaMutation = {
  changed: boolean;
  data?: Required<QuotaDoc>;
};

export class QuotaExceededError extends Error {
  code = "quota-exceeded";

  constructor() {
    super("QUOTA_EXCEEDED");
  }
}

export const getTodayKey = (): string => new Date().toISOString().slice(0, 10);

export const getQuotaLimit = (isAnonymous: boolean): number =>
  isAnonymous ? DAILY_LIMIT_ANON : DAILY_LIMIT_AUTHED;

export function applyQuotaIncrement(
  doc: QuotaDoc | undefined,
  today: string,
  isAnonymous: boolean,
  quotaEventId: string
): QuotaMutation {
  const sameDay = doc?.date === today;
  const count = sameDay ? (doc?.count || 0) : 0;
  const batches = sameDay ? { ...(doc?.batches || {}) } : {};

  if (batches[quotaEventId]) return { changed: false };
  if (count >= getQuotaLimit(isAnonymous)) throw new QuotaExceededError();

  batches[quotaEventId] = true;
  return {
    changed: true,
    data: { date: today, count: count + 1, batches },
  };
}

export function applyQuotaRefund(
  doc: QuotaDoc | undefined,
  today: string,
  quotaEventId: string
): QuotaMutation {
  if (!doc || doc.date !== today) return { changed: false };
  const batches = { ...(doc.batches || {}) };
  if (!batches[quotaEventId]) return { changed: false };

  delete batches[quotaEventId];
  return {
    changed: true,
    data: {
      date: today,
      count: Math.max(0, (doc.count || 0) - 1),
      batches,
    },
  };
}

export async function checkAndIncrementQuota(
  db: any,
  uid: string,
  isAnonymous: boolean,
  quotaEventId: string,
  today = getTodayKey()
): Promise<void> {
  const ref = db.doc(`quota/${uid}`);

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const mutation = applyQuotaIncrement(snap.data(), today, isAnonymous, quotaEventId);
    if (mutation.changed) tx.set(ref, mutation.data);
  });
}

export async function refundQuota(
  db: any,
  uid: string,
  quotaEventId: string,
  today = getTodayKey()
): Promise<void> {
  const ref = db.doc(`quota/${uid}`);

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const mutation = applyQuotaRefund(snap.data(), today, quotaEventId);
    if (mutation.changed) tx.set(ref, mutation.data);
  });
}
