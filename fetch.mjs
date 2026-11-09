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
    since: p.listed_date || null,
    _cat: sale ? 1 : 2,
    _type: p.property_type_id,
    _locs: String((p.location || {}).path || '').split('.').filter(Boolean).reverse(),
    _area: parts[parts.length - 1] || '',
    level: p.listing_level === 'premium' || p.is_premium ? 'premium' : (p.listing_level === 'featured' || p.is_featured ? 'featured' : '')
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

// ---------- helpers for public Property Finder pages ----------
async function nextData(url) {
  const r = await fetch(url, { headers: { ...HEADERS, accept: 'text/html' } });
  if (!r.ok) throw new Error('page ' + r.status);
  const h = await r.text();
  const m = h.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no data');
  return JSON.parse(m[1]).props.pageProps;
}
const sleep = ms => new Promise(res => setTimeout(res, ms));
const isUs = b => /better\s*homes|betterhomes/i.test(b || '');

// ---------- lowest similar listing on the market (other agencies) for each new team listing ----------
const NEW_MS = 7 * 864e5;
for (const x of listings) {
  if (!x.since || Date.now() - Date.parse(x.since) > NEW_MS || !x._type || !x._locs.length) continue;
  for (const loc of x._locs.slice(0, 2)) {
    const bdr = x.beds == null ? '' : '&bdr[]=' + x.beds;
    const url = 'https://www.propertyfinder.ae/en/search?c=' + x._cat + '&l=' + loc + '&t=' + x._type + bdr + '&ob=pa';
    try {
      const pp = await nextData(url);
      const L = ((pp.searchResult || {}).listings || []).map(l => l.property).filter(Boolean)
        .filter(p => !isUs((p.broker || {}).name) && p.price && p.price.value && !p.price.is_hidden)
        .filter(p => x._cat === 1 || (p.price.period || 'yearly') === 'yearly');
      if (L.length) {
        const c = L.sort((a, b) => a.price.value - b.price.value)[0];
        x.comp = {
          price: c.price.value,
          broker: (c.broker || {}).name || '',
          agent: (c.agent || {}).name || '',
          title: c.title || '',
          loc: (c.location || {}).name || '',
          size: c.size && c.size.value ? Math.round(c.size.unit === 'sqm' ? c.size.value * SQM : c.size.value) : null,
          count: L.length
        };
        break;
      }
    } catch (e) { console.log('compare', x.ref, e.message); }
    await sleep(800);
  }
}

// ---------- recent sales (transactions) in the team's main areas ----------
const areaCount = {};
listings.forEach(x => { if (x._area) areaCount[x._area] = (areaCount[x._area] || 0) + 1; });
const areas = Object.keys(areaCount).sort((a, b) => areaCount[b] - areaCount[a]).slice(0, 10);
const sold = [];
for (const a of areas) {
  const slug = a.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  try {
    const pp = await nextData('https://www.propertyfinder.ae/en/transactions/sold/dubai/' + slug);
    const T = ((pp.list || {}).transactionList || []).filter(t => t.price && t.transactionDate);
    if (T.length) sold.push({
      area: a,
      items: T.slice(0, 6).map(t => ({
        price: t.price, date: t.transactionDate, type: t.propertyType || '', beds: t.bedrooms,
        size: Math.round(t.builtupArea || t.plotArea || 0) || null, place: t.locationName || ''
      }))
    });
  } catch (e) { console.log('sold', a, e.message); }
  await sleep(800);
}

listings.forEach(x => { delete x._cat; delete x._type; delete x._locs; delete x._area; });
let prev = null;
try { if (existsSync('data.json')) { const o = JSON.parse(readFileSync('data.json', 'utf8')); prev = JSON.stringify({ listings: o.listings, sold: o.sold }); } } catch (e) {}
const payload = JSON.stringify({ listings, sold });
if (prev === payload) {
  console.log('No change,', listings.length, 'listings');
} else {
  writeFileSync('data.json', JSON.stringify({ updated: new Date().toISOString(), listings, sold }));
  console.log('Saved', listings.length, 'listings,', listings.filter(x => x.comp).length, 'market checks,', sold.length, 'sold areas');
}
