/** Remote Postgres (Supabase pooler) needs a longer interactive transaction window. */
export const PRISMA_INTERACTIVE_TX_OPTIONS = {
  maxWait: 15_000,
  timeout: 30_000,
} as const;
