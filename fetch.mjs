// Reads Better Homes - Local Division listings from Property Finder and writes data.json
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const BROKER = 12158;
const SQM = 10.7639;
const HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'referer': 'https://www.propertyfinder.ae/en/broker/better-homes-local-division-12287'
};

async function page(cat, p) {
  const u = 'https://www.propertyfinder.ae/api/pwa/property/search?sorting.sort=featured&filters.category_id=' + cat +
    '&filters.furnished=all&pagination.limit=20&pagination.page=' + p +
    '&filters.price_type=price_type_any&filters.utilities_price_type=notSelected&filters.broker_id=' + BROKER + '&locale=en';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(u, { headers: HEADERS });
    if (r.ok) return r.json();
    console.log('PF', cat, p, 'status', r.status, 'attempt', attempt);
    await new Promise(res => setTimeout(res, 3000 * attempt));
  }
  throw new Error('Property Finder request failed');
}

function map(p) {
  const sale = /sale/i.test(p.offering_type || '') || (p.price && p.price.period === 'sell');
  const parts = String((p.location || {}).full_name || '').split(',').map(s => s.trim()).filter(s => s && s !== 'Dubai');
  const period = (p.price || {}).period;
  const size = p.size && p.size.value ? Math.round(p.size.unit === 'sqm' ? p.size.value * SQM : p.size.value) : null;
  return {
    ref: p.reference,
    title: p.title,
    type: sale ? 'Sale' : 'Rent',
    price: (p.price || {}).value || null,
    por: !!(p.price || {}).is_hidden,
    period: period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : period === 'daily' ? 'day' : 'year',
    beds: /studio/i.test(String(p.bedrooms)) ? 0 : (p.bedrooms == null || p.bedrooms === '' ? null : parseInt(p.bedrooms, 10)),
    baths: p.bathrooms == null || p.bathrooms === '' ? null : parseInt(p.bathrooms, 10),
    size,
    ptype: p.property_type,
    loc: parts.slice(0, 3).join(' · '),
    area: parts[parts.length - 1] || '',
    imgs: (p.images || []).slice(0, 4).map(i => String(i.medium || i.small || '').replace(/\/\d+x\d+\.(jpg|webp)/, '/1312x894.$1').replace(/\?.*$/, '')).filter(Boolean),
    agent: (p.agent || {}).name || '',
    avatar: (p.agent || {}).image || '',
    since: p.listed_date || null
  };
}

const out = [];
for (const cat of [1, 2]) {
  let p = 1, pages = 1;
  do {
    const j = await page(cat, p);
    for (const l of j.listings || []) if (l.property) out.push(map(l.property));
    pages = (j.meta || {}).page_count || 1;
    p++;
  } while (p <= pages);
}
const seen = new Set();
const listings = out.filter(x => x.imgs.length && !seen.has(x.ref) && seen.add(x.ref));
if (!listings.length) throw new Error('No listings returned');
let prev = null;
try { if (existsSync('data.json')) prev = JSON.stringify(JSON.parse(readFileSync('data.json', 'utf8')).listings); } catch (e) {}
if (prev === JSON.stringify(listings)) {
  console.log('No change,', listings.length, 'listings');
} else {
  writeFileSync('data.json', JSON.stringify({ updated: new Date().toISOString(), listings }));
  console.log('Saved', listings.length, 'listings');
}
