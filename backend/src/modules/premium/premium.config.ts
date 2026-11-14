/** Read at call time so .env changes apply after a restart without code edits. */
export const premiumConfig = () => ({
  priceEtb: Number(process.env.PREMIUM_PACK_PRICE_ETB ?? 100),
  minFacts: Number(process.env.PREMIUM_MIN_FACTS ?? 50), // a pack is only sold for services with at least this many verified facts
  chapaSecret: process.env.CHAPA_SECRET_KEY ?? '',
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
});
