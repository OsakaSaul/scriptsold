// Company enrichment from a website domain, as many apps wrote it.
const CLEARBIT_KEY = process.env.CLEARBIT_KEY;

export async function enrichCompany(domain) {
  const res = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${domain}`, {
    headers: { Authorization: `Bearer ${CLEARBIT_KEY}` },
  });
  if (!res.ok) return null;
  const company = await res.json();
  return { name: company.name, sector: company.category && company.category.sector };
}
