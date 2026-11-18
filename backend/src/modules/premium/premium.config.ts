/** Read at call time so .env changes apply after a restart without code edits. */
export const premiumConfig = () => ({
  monthlyEtb: Number(process.env.PREMIUM_MONTHLY_ETB ?? 99), // price of one 30-day Plus pass
  passDays: 30,
  packsPerMonth: Number(process.env.PREMIUM_PACKS_PER_MONTH ?? 10), // fair-use limit of Application Packs per pass
  minFacts: Number(process.env.PREMIUM_MIN_FACTS ?? 3), // a pack is only offered for services with at least this many verified facts
  chapaSecret: process.env.CHAPA_SECRET_KEY ?? '',
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
});
