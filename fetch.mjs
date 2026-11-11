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
    url: p.share_url || '',
    agent: (p.agent || {}).name || '',
    avatar: (p.agent || {}).image || '',
    since: p.listed_date || null,
    // extra detail for the PDF brochure; moved to details.json below so data.json stays small
    _det: {
      desc: String(p.description || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2500),
      amen: (p.amenity_names || []).slice(0, 16),
      furn: p.furnished === 'YES' ? 'Furnished' : p.furnished === 'PARTLY' ? 'Partly furnished' : p.furnished === 'NO' ? 'Unfurnished' : '',
      plot: p.plot_size ? Math.round(p.plot_size) : null,
      status: p.completion_status === 'off_plan' ? 'Off-plan' : p.completion_status === 'completed' ? 'Ready' : '',
      permit: (p.rera && (p.rera.number || p.rera)) || '',
      phone: ((p.contact_options || []).find(c => c.type === 'phone') || {}).value || ((p.broker || {}).phone || ''),
      office: (p.broker || {}).address || '',
      imgs: (p.images || []).slice(0, 6).map(i => String(i.medium || i.small || '').replace(/\/\d+x\d+\.(jpg|webp)/, '/1312x894.$1').replace(/\?.*$/, '')).filter(Boolean)
    },
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
const COMPS = 8; // how many similar listings from other agencies to keep per new listing
const SIZE_TOL = 0.10; // a similar listing must be within 10% of our size
for (const x of listings) {
  if (!x.since || Date.now() - Date.parse(x.since) > NEW_MS || !x._type || !x._locs.length) continue;
  for (const loc of x._locs.slice(0, 2)) {
    const bdr = x.beds == null ? '' : '&bdr[]=' + x.beds;
    const url = 'https://www.propertyfinder.ae/en/search?c=' + x._cat + '&l=' + loc + '&t=' + x._type + bdr + '&ob=pa';
    try {
      const pp = await nextData(url);
      const L = ((pp.searchResult || {}).listings || []).map(l => l.property).filter(Boolean)
        .filter(p => !isUs((p.broker || {}).name) && p.price && p.price.value && !p.price.is_hidden)
        .filter(p => x._cat === 1 || (p.price.period || 'yearly') === 'yearly')
        // like for like: only homes within 10% of our size (when both sizes are known)
        .filter(p => { if (!x.size) return true; const s = p.size && p.size.value ? (p.size.unit === 'sqm' ? p.size.value * SQM : p.size.value) : 0; return s && Math.abs(s - x.size) / x.size <= SIZE_TOL; });
      if (L.length) {
        // keep the cheapest few so people can open and compare them; comp stays the single cheapest (used by the TV slide)
        x.comps = L.sort((a, b) => a.price.value - b.price.value).slice(0, COMPS).map(c => ({
          price: c.price.value,
          broker: (c.broker || {}).name || '',
          agent: (c.agent || {}).name || '',
          title: c.title || '',
          loc: (c.location || {}).name || '',
          size: c.size && c.size.value ? Math.round(c.size.unit === 'sqm' ? c.size.value * SQM : c.size.value) : null,
          beds: /studio/i.test(String(c.bedrooms)) ? 0 : (c.bedrooms == null || c.bedrooms === '' ? null : parseInt(c.bedrooms, 10)),
          baths: c.bathrooms == null || c.bathrooms === '' ? null : parseInt(c.bathrooms, 10),
          url: c.share_url || (c.details_path ? 'https://www.propertyfinder.ae' + c.details_path : ''),
          img: String(((c.images || [])[0] || {}).medium || ((c.images || [])[0] || {}).small || '').replace(/\?.*$/, ''),
          since: c.listed_date || null
        }));
        x.comp = { ...x.comps[0], count: L.length };
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
// ---------- recent rentals (Ejari contracts) in the same areas ----------
// price is the contract amount; months is the contract length, so a short contract is never read as a yearly rent
const monthsBetween = (a, b) => { const s = Date.parse(a), e = Date.parse(b); return s && e && e > s ? Math.max(1, Math.round((e - s) / (30.44 * 864e5))) : null; };
const sold = [], rented = [];
// Like for like: in each area, read the transactions for the property type the team lists most there
// (sales for "sold", rentals for "rented"), and keep only recent ones. If that returns nothing, fall back
// to all types in the area, so a slide never disappears.
const RECENT_MS = 45 * 864e5;
const mainType = (area, cat) => {
  const c = {};
  listings.forEach(x => { if (x._area === area && x._cat === cat && x._type) { const k = x._type + '|' + (x.ptype || ''); c[k] = (c[k] || 0) + 1; } });
  const k = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
  return k ? { id: k.split('|')[0], name: k.split('|')[1] } : null;
};
for (const a of areas) {
  const slug = a.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const kind of ['sold', 'rented']) {
    const ty = mainType(a, kind === 'sold' ? 1 : 2);
    const tries = ty ? [ty, null] : [null];
    for (const t0 of tries) {
      try {
        const pp = await nextData('https://www.propertyfinder.ae/en/transactions/' + kind + '/dubai/' + slug + (t0 ? '?t=' + t0.id : ''));
        let T = ((pp.list || {}).transactionList || []).filter(t => t.price && t.transactionDate && !t.isBulkTransaction);
        const fresh = T.filter(t => Date.now() - Date.parse(t.transactionDate) <= RECENT_MS);
        if (fresh.length >= 2 || (t0 && fresh.length)) T = fresh;
        else if (t0) { await sleep(800); continue; } // too few recent deals of this type: try all types
        if (!T.length) break;
        (kind === 'sold' ? sold : rented).push({
          area: a,
          ptype: t0 ? t0.name : '',
          items: T.slice(0, 6).map(t => {
            const item = {
              price: t.price, date: t.transactionDate, type: t.propertyType || '', beds: t.bedrooms,
              size: Math.round(t.builtupArea || t.plotArea || 0) || null, place: t.locationName || ''
            };
            if (kind === 'rented') { item.months = monthsBetween(t.contractStartDate, t.contractEndDate); item.status = /renew/i.test(t.status || '') ? 'Renewal' : 'New'; }
            return item;
          })
        });
        break;
      } catch (e) { console.log(kind, a, e.message); }
      await sleep(800);
    }
    await sleep(800);
  }
}

// ---------- price history: mark a listing "Price reduced" for 14 days after its price drops ----------
const DROP_MS = 14 * 864e5;
let hist = {};
try { if (existsSync('price-history.json')) hist = JSON.parse(readFileSync('price-history.json', 'utf8')); } catch (e) {}
const histNext = {};
listings.forEach(x => {
  const h = hist[x.ref], p = x.por ? null : x.price;
  const rec = { price: p };
  if (h && h.drop && Date.now() - Date.parse(h.drop.at) < DROP_MS && p && p < h.drop.was) rec.drop = h.drop;
  if (h && h.price && p && p < h.price) rec.drop = { was: rec.drop ? rec.drop.was : h.price, at: new Date().toISOString() };
  if (rec.drop) x.drop = rec.drop;
  histNext[x.ref] = rec;
});
const histJson = JSON.stringify(histNext);
if (JSON.stringify(hist) !== histJson) writeFileSync('price-history.json', histJson);

// brochure details, keyed by reference, in their own file (only loaded when someone makes a brochure)
const details = {};
listings.forEach(x => { details[x.ref] = x._det; });
const detailsJson = JSON.stringify(details);
let prevDetails = null;
try { if (existsSync('details.json')) prevDetails = readFileSync('details.json', 'utf8'); } catch (e) {}
if (prevDetails !== detailsJson) { writeFileSync('details.json', detailsJson); console.log('Saved details for', listings.length, 'listings'); }

listings.forEach(x => { delete x._cat; delete x._type; delete x._locs; delete x._area; delete x._det; });
let prev = null;
try { if (existsSync('data.json')) { const o = JSON.parse(readFileSync('data.json', 'utf8')); prev = JSON.stringify({ listings: o.listings, sold: o.sold, rented: o.rented }); } } catch (e) {}
const payload = JSON.stringify({ listings, sold, rented });
if (prev === payload) {
  console.log('No change,', listings.length, 'listings');
} else {
  writeFileSync('data.json', JSON.stringify({ updated: new Date().toISOString(), listings, sold, rented }));
  console.log('Saved', listings.length, 'listings,', listings.filter(x => x.comp).length, 'market checks,', listings.filter(x => x.drop).length, 'price cuts,', sold.length, 'sold areas,', rented.length, 'rented areas');
}
