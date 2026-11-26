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
// One market lookup per (category, type, beds, location) key, shared by every listing that matches it,
// so we can price-check every listing (not just new ones) without a request each. Capped to stay in budget.
const MAX_COMP_KEYS = 140;
const compCache = new Map();
let compKeys = 0;
async function rivalsFor(cat, type, beds, loc) {
  const key = cat + '|' + type + '|' + beds + '|' + loc;
  if (compCache.has(key)) return compCache.get(key);
  if (compKeys >= MAX_COMP_KEYS) return null;
  compKeys++;
  const bdr = beds == null ? '' : '&bdr[]=' + beds;
  const url = 'https://www.propertyfinder.ae/en/search?c=' + cat + '&l=' + loc + '&t=' + type + bdr + '&ob=pa';
  let out = [];
  try {
    const pp = await nextData(url);
    out = ((pp.searchResult || {}).listings || []).map(l => l.property).filter(Boolean)
      .filter(p => !isUs((p.broker || {}).name) && p.price && p.price.value && !p.price.is_hidden)
      .filter(p => cat === 1 || (p.price.period || 'yearly') === 'yearly');
  } catch (e) { console.log('compare', key, e.message); }
  await sleep(800);
  compCache.set(key, out);
  return out;
}
const mapRival = c => ({
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
});
for (const x of listings) {
  if (!x._type || !x._locs.length) continue;
  const recent = x.since && Date.now() - Date.parse(x.since) <= NEW_MS;
  for (const loc of x._locs.slice(0, 2)) {
    const raw = await rivalsFor(x._cat, x._type, x.beds, loc);
    if (!raw || !raw.length) continue;
    // like for like: only homes within 10% of our size (when both sizes are known)
    const L = raw.filter(p => { if (!x.size) return true; const s = p.size && p.size.value ? (p.size.unit === 'sqm' ? p.size.value * SQM : p.size.value) : 0; return s && Math.abs(s - x.size) / x.size <= SIZE_TOL; });
    if (!L.length) continue;
    const sorted = L.slice().sort((a, b) => a.price.value - b.price.value);
    x.comp = { ...mapRival(sorted[0]), count: L.length }; // single cheapest rival, for every listing (used by the HOT / overpriced flags)
    if (recent) x.comps = sorted.slice(0, COMPS).map(mapRival); // detailed rival list only for new listings, to keep data.json small
    break;
  }
}

// ---------- recent sales (transactions) in the team's main areas ----------
const areaCount = {};
listings.forEach(x => { if (x._area) areaCount[x._area] = (areaCount[x._area] || 0) + 1; });
// Every area the team has stock in (our AOS), busiest first. Capped at 30 to keep the hourly job's runtime sane.
const areas = Object.keys(areaCount).sort((a, b) => areaCount[b] - areaCount[a]).slice(0, 30);
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

// ---------- full photo galleries: every image from each listing's page, cached so each is fetched once ----------
const GAL_PER_RUN = 60;   // cap new gallery fetches per run so the hourly job stays in budget; the rest fill on later runs
const IMG_BASE = 'https://static.shared.propertyfinder.ae/media/images/listing/';
let gal = {};
try { if (existsSync('gallery.json')) gal = JSON.parse(readFileSync('gallery.json', 'utf8')); } catch (e) {}
let galNew = 0;
for (const x of listings) {
  if (gal[x.ref] && gal[x.ref].length) { x.imgs = gal[x.ref]; continue; } // use the cached full gallery
  if (galNew >= GAL_PER_RUN || !x.url) continue;                           // keep the 3 preview images until a later run fills this one
  galNew++;
  try {
    const r = await fetch(x.url, { headers: { ...HEADERS, accept: 'text/html' } });
    if (r.ok) {
      const html = await r.text();
      const re = /media\/images\/listing\/([A-Z0-9]+)\/([0-9a-f-]{36})\/\d+x\d+\.(?:jpg|webp)/g;
      const seenImg = new Set(), full = [];
      let m; while ((m = re.exec(html))) { const k = m[1] + '/' + m[2]; if (!seenImg.has(k)) { seenImg.add(k); full.push(IMG_BASE + k + '/1312x894.jpg'); } }
      if (full.length) { gal[x.ref] = full; x.imgs = full; }
    }
  } catch (e) { console.log('gallery', x.ref, e.message); }
  await sleep(600);
}
// drop galleries for listings no longer live, then persist
const liveSet = new Set(listings.map(x => x.ref));
Object.keys(gal).forEach(r => { if (!liveSet.has(r)) delete gal[r]; });
const galJson = JSON.stringify(gal);
let prevGal = null;
try { if (existsSync('gallery.json')) prevGal = readFileSync('gallery.json', 'utf8'); } catch (e) {}
if (prevGal !== galJson) writeFileSync('gallery.json', galJson);

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

// ---------- other Better Homes branches: lightweight stock for the browse view ----------
// These power the branch dropdown and agent search only. No galleries, market check, flags or brochures —
// those stay exclusive to the Local Division stock above. Tapping a branch listing opens it on Property Finder.
const BRANCHES = [
  { key: 'bb',       name: 'Business Bay',        id: 2465 },
  { key: 'marina',   name: 'Dubai Marina',        id: 2463 },
  { key: 'motor',    name: 'Motor City',          id: 3560 },
  { key: 'abudhabi', name: 'Abu Dhabi',           id: 2467 },
  { key: 'sharjah',  name: 'Sharjah',             id: 2468 },
  { key: 'offplan',  name: 'Off Plan',            id: 3662 },
  { key: 'lindas',   name: "Linda's Real Estate", id: 4088 },
  { key: 'crc',      name: 'CRC (Commercial)',    id: 2466, cats: [3, 4] }, // commercial: offices, retail, warehouses, land
  { key: 'pm',       name: 'Property Management',  id: 2473 }
];
const BRANCH_TTL_MS = 50 * 60 * 1000;  // refresh branch stock ~once an hour, not on every 10-minute loop
const BRANCH_PAGE_CAP = 40;            // up to ~2000 listings per branch per category — covers even the biggest
const BRANCH_SIG = JSON.stringify(BRANCHES.map(b => [b.key, b.id, b.cats || [1, 2]]));  // changes when a branch/category is added — forces an immediate refetch
let prevBr = null;
try { if (existsSync('branches.json')) prevBr = JSON.parse(readFileSync('branches.json', 'utf8')); } catch (e) {}
if (prevBr && prevBr.fetchedAt && prevBr.sig === BRANCH_SIG && (Date.now() - Date.parse(prevBr.fetchedAt) < BRANCH_TTL_MS)) {
  console.log('Branch stock still fresh (' + (prevBr.listings || []).length + ' listings), skipping this loop');
} else {
  async function branchPage(broker, cat, p) {
    const u = 'https://www.propertyfinder.ae/api/pwa/property/search?sorting.sort=featured&filters.category_id=' + cat +
      '&filters.furnished=all&pagination.limit=50&pagination.page=' + p +
      '&filters.price_type=price_type_any&filters.utilities_price_type=notSelected&filters.broker_id=' + broker + '&locale=en';
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await fetch(u, { headers: HEADERS });
      if (r.ok) return r.json();
      console.log('branch', broker, cat, p, 'status', r.status);
      await sleep(2500 * attempt);
    }
    return null;
  }
  const brAll = [], brCounts = [];
  for (const b of BRANCHES) {
    const refs = new Set();
    for (const cat of (b.cats || [1, 2])) {  // residential (1,2) by default; CRC uses commercial (3,4)
      let p = 1, pages = 1;
      do {
        const j = await branchPage(b.id, cat, p);
        if (!j) break;
        for (const l of j.listings || []) {
          if (!l.property) continue;
          const m = map(l.property);
          if (!m.ref || refs.has(m.ref) || !m.imgs.length) continue;
          refs.add(m.ref);
          brAll.push({ ref: m.ref, title: m.title, type: m.type, price: m.price, por: m.por, period: m.period,
            beds: m.beds, baths: m.baths, size: m.size, ptype: m.ptype, loc: m.loc, area: m.area,
            imgs: m.imgs.slice(0, 3), url: m.url, agent: m.agent, avatar: m.avatar, since: m.since,
            level: m.level, branch: b.key });
        }
        pages = (j.meta || {}).page_count || 1;
        p++;
        await sleep(250);
      } while (p <= pages && p <= BRANCH_PAGE_CAP);
    }
    brCounts.push({ key: b.key, name: b.name, count: refs.size });
    console.log('Branch', b.name, refs.size);
  }
  // price history for branch stock → "Price reduced" for 14 days after a cut (same logic as the Local feed above)
  if (brAll.length) {
    let brHist = {};
    try { if (existsSync('branch-price-history.json')) brHist = JSON.parse(readFileSync('branch-price-history.json', 'utf8')); } catch (e) {}
    const brHistNext = {};
    brAll.forEach(x => {
      const h = brHist[x.ref], p = x.por ? null : x.price;
      const rec = { price: p };
      if (h && h.drop && Date.now() - Date.parse(h.drop.at) < DROP_MS && p && p < h.drop.was) rec.drop = h.drop;
      if (h && h.price && p && p < h.price) rec.drop = { was: rec.drop ? rec.drop.was : h.price, at: new Date().toISOString() };
      if (rec.drop) x.drop = rec.drop;
      brHistNext[x.ref] = rec; // only current refs are carried over, so stale listings prune themselves
    });
    const brHistJson = JSON.stringify(brHistNext);
    let prevBrHist = null;
    try { if (existsSync('branch-price-history.json')) prevBrHist = readFileSync('branch-price-history.json', 'utf8'); } catch (e) {}
    if (prevBrHist !== brHistJson) writeFileSync('branch-price-history.json', brHistJson);
    console.log('Branch price cuts:', brAll.filter(x => x.drop).length);
  }
  if (brAll.length) {
    writeFileSync('branches.json', JSON.stringify({
      fetchedAt: new Date().toISOString(),
      sig: BRANCH_SIG,
      branches: BRANCHES.map(b => ({ key: b.key, name: b.name })),
      counts: brCounts,
      listings: brAll
    }));
    console.log('Saved', brAll.length, 'branch listings across', BRANCHES.length, 'branches');
  } else if (prevBr) {
    console.log('Branch fetch returned nothing; keeping previous branches.json');
  }
}

// ---------- Local Division closed deals (agent-claimed on Property Finder) for the TV "deal closed" slide ----------
// Shows the latest few deals across all Local Division agents, each with agent, property, type and value.
const DEAL_COUNT = 5;                       // latest N deals shown on the board
const DEAL_TTL_MS = 3 * 60 * 60 * 1000;     // deals change slowly — refresh ~every 3 hours
let prevDeals = null;
try { if (existsSync('deals.json')) prevDeals = JSON.parse(readFileSync('deals.json', 'utf8')); } catch (e) {}
if (prevDeals && prevDeals.fetchedAt && (Date.now() - Date.parse(prevDeals.fetchedAt) < DEAL_TTL_MS)) {
  console.log('Deals still fresh (' + (prevDeals.deals || []).length + '), skipping');
} else {
  // full Local Division agent roster
  let roster = [];
  try {
    for (let p = 1; p <= 6; p++) {
      const r = await fetch('https://www.propertyfinder.ae/api/pwa/agents?broker_id=' + BROKER + '&page=' + p + '&locale=en', { headers: HEADERS });
      if (!r.ok) break;
      const j = await r.json();
      const a = j.agents || [];
      a.forEach(x => roster.push({ id: x.id, slug: x.slug, name: x.name }));
      if (a.length < 20) break;
    }
  } catch (e) { console.log('deals roster', e.message); }
  function findDeals(o) {
    if (o && typeof o === 'object') {
      if (Array.isArray(o.claimedTransactionsList)) return o.claimedTransactionsList;
      for (const k in o) { const r = findDeals(o[k]); if (r) return r; }
    }
    return null;
  }
  const seen = new Set();
  let deals = [];
  for (const ag of roster) {
    try {
      const r = await fetch('https://www.propertyfinder.ae/en/agent/' + ag.slug + '-' + ag.id, { headers: { ...HEADERS, accept: 'text/html' } });
      if (!r.ok) { await sleep(300); continue; }
      const h = await r.text();
      const m = h.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!m) { await sleep(300); continue; }
      const list = findDeals(JSON.parse(m[1])) || [];
      const imgM = h.match(new RegExp('media/images/agent_image/' + ag.id + '/[0-9a-f-]{36}/\\d+x\\d+\\.(?:jpg|webp)'));
      const photo = imgM ? 'https://static.shared.propertyfinder.ae/' + imgM[0] : '';
      for (const t of list) {
        const loc = t.location || {};
        const key = ag.id + '|' + t.date + '|' + t.price + '|' + (loc.tower || '');
        if (seen.has(key)) continue;
        seen.add(key);
        deals.push({ agent: ag.name, photo, type: t.dealType, price: t.price, date: t.date,
          community: loc.community || '', tower: loc.tower || '', ptype: t.propertyType || '', beds: t.bedroom || '', tx: [] });
      }
    } catch (e) { console.log('deal agent', ag.name, e.message); }
    await sleep(400);
  }
  deals.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  deals = deals.slice(0, DEAL_COUNT);
  // attach recent DLD transactions in the deal's community (sales for a sale, rentals for a rental) — real market context, no misleading photos
  const monthsB = (a, b) => { const s = Date.parse(a), e = Date.parse(b); return s && e && e > s ? Math.max(1, Math.round((e - s) / (30.44 * 864e5))) : null; };
  async function dealTx(community, isSale) {
    const kind = isSale ? 'sold' : 'rent';
    const slug = String(community || '').toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return [];
    function findTx(o) { if (o && typeof o === 'object') { if (Array.isArray(o.transactionList)) return o.transactionList; for (const k in o) { const r = findTx(o[k]); if (r) return r; } } return null; }
    try {
      const pp = await nextData('https://www.propertyfinder.ae/en/transactions/' + kind + '/dubai/' + slug);
      let T = (findTx(pp) || []).filter(t => t.price && t.transactionDate && !t.isBulkTransaction);
      T.sort((a, b) => Date.parse(b.transactionDate) - Date.parse(a.transactionDate));
      return T.slice(0, 5).map(t => {
        const it = { price: t.price, date: t.transactionDate, ptype: t.propertyType || '',
          beds: /studio/i.test(String(t.bedrooms)) ? 0 : (t.bedrooms == null || t.bedrooms === '' ? null : parseInt(t.bedrooms, 10)),
          size: Math.round(t.builtupArea || t.plotArea || 0) || null, place: t.locationName || '' };
        if (!isSale) it.months = monthsB(t.contractStartDate, t.contractEndDate);
        return it;
      });
    } catch (e) { console.log('dealTx', community, e.message); return []; }
  }
  for (const d of deals) { d.tx = await dealTx(d.community, d.type === 'Sale'); delete d.path; delete d.imgs; await sleep(400); }
  if (deals.length) {
    const dealJson = JSON.stringify({ fetchedAt: new Date().toISOString(), deals });
    let prevD = null; try { if (existsSync('deals.json')) prevD = JSON.parse(readFileSync('deals.json', 'utf8')); } catch (e) {}
    const changed = !prevD || JSON.stringify(prevD.deals || []) !== JSON.stringify(deals);
    if (changed) { writeFileSync('deals.json', dealJson); console.log('Saved', deals.length, 'deals'); }
    else { console.log('Deals unchanged'); }
  } else {
    console.log('No deals found; keeping previous deals.json');
  }
}

// ========== Location gazetteer + price index for the Listing Price Estimator ==========
// 1) Harvest the full Dubai location gazetteer (name + transaction slug + area) from Property Finder's
//    location search, so the estimator typeahead covers every community and building, like PF itself.
// 2) Crawl registered DLD transactions for EVERY Dubai community the gazetteer returns → median AED/sqft
//    by property type x bedroom band, per community and per building (deep pagination, outliers trimmed,
//    last ~18 months). Rebuilds at most once a day. No CORS at build time.
if (await (async () => {
  try {
    if (existsSync('price-index.json')) {
      const prev = JSON.parse(readFileSync('price-index.json', 'utf8'));
      if (prev.generatedAt && Date.now() - Date.parse(prev.generatedAt) < 20 * 3600e3) { console.log('Price index fresh (<20h); skipping rebuild'); return false; }
    }
  } catch (e) {}
  return true;
})()) {
  const JHEAD = { ...HEADERS, accept: 'application/json' };
  // ---------- 1. Gazetteer ----------
  const LETTERS = ['a', 'e', 'i', 'o', 'u', 'y'];   // vowel sweep catches essentially every location name
  const MAX_PAGES = 400;
  const gaz = {};            // slug -> {n,s,k,a,c}
  const commSlugs = {};      // community slug -> name
  for (const ch of LETTERS) {
    let page = 1, pages = 1;
    do {
      let j;
      try { j = await (await fetch('https://www.propertyfinder.ae/b2c-location/api/v2/en/locations?filters.doc_types=location&filters.category_id=1&filters.name=' + ch + '&filters.use_popularity=true&pagination.limit=50&pagination.page=' + page, { headers: JHEAD })).json(); }
      catch (e) { break; }
      pages = (j.meta && j.meta.pages) || 1;
      for (const it of (j.items || [])) {
        const l = it.location; if (!l || l.url_city_slug !== 'dubai') continue;
        const slug = l.current_language_slug, lt = l.location_type;
        if (!slug || lt === 'CITY' || gaz[slug]) continue;
        const parts = (l.path_name || '').split(',').map(s => s.trim()).filter(x => x && x !== 'Dubai');
        const comm = parts[0] || l.name;
        gaz[slug] = { n: l.name, s: slug, k: lt === 'COMMUNITY' ? 'c' : 'b', a: lt === 'COMMUNITY' ? 'Dubai · community' : ((parts.join(', ') || 'Dubai') + ' · ' + lt.toLowerCase()), c: comm };
        if (lt === 'COMMUNITY') commSlugs[slug] = l.name;
      }
      page++; await sleep(140);
    } while (page <= pages && page <= MAX_PAGES);
    console.log('gazetteer letter', ch, '→', Object.keys(gaz).length, 'locations so far');
  }
  const locs = Object.values(gaz);
  if (locs.length > 500) writeFileSync('locations.json', JSON.stringify({ generatedAt: new Date().toISOString(), locs }));
  console.log('Gazetteer:', locs.length, 'Dubai locations,', Object.keys(commSlugs).length, 'communities');

  // ---------- 2. Price index over every community the gazetteer found ----------
  const WINDOW_MS = 18 * 30.44 * 864e5, COMM_PAGES = 8;
  const findTx = o => { if (o && typeof o === 'object') { if (Array.isArray(o.transactionList)) return o.transactionList; for (const k in o) { const r = findTx(o[k]); if (r) return r; } } return null; };
  const bandOf = b => { if (b == null || b === '') return 'na'; if (/studio/i.test(String(b))) return '0'; const n = parseInt(b, 10); return isNaN(n) ? 'na' : (n >= 4 ? '4' : String(n)); };
  const ptBucket = t => { t = String(t || '').toLowerCase(); if (/villa|townhouse/.test(t)) return 'villa'; if (/land|plot/.test(t)) return 'land'; return 'apartment'; };
  const pctl = (a, p) => { a = a.slice().sort((x, y) => x - y); if (a.length === 1) return a[0]; const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
  function summ(psfs) { if (!psfs.length) return null; let a = psfs.slice().sort((x, y) => x - y); if (a.length >= 8) { const lo = Math.floor(a.length * 0.05), hi = Math.ceil(a.length * 0.95); a = a.slice(lo, hi); } const m = Math.floor(a.length / 2), psf = a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; return { psf: Math.round(psf), n: psfs.length, lo: Math.round(pctl(a, .25)), hi: Math.round(pctl(a, .75)) }; }
  function byType(rows) { const types = {}; for (const r of rows) (types[r.type] = types[r.type] || []).push(r); const out = {}; for (const ty in types) { const rs = types[ty], bands = { all: rs.map(r => r.psf) }; rs.forEach(r => { (bands[r.band] = bands[r.band] || []).push(r.psf); }); const o = { latest: rs.map(r => r.date).sort().slice(-1)[0] || '' }; for (const bk in bands) { const s = summ(bands[bk]); if (s) o[bk] = s; } out[ty] = o; } return out; }
  // a compact sample of the most recent real transactions, shown under the estimate so people see what it is built on
  function samples(rows) { return rows.slice().sort((a, b) => (b.date < a.date ? -1 : 1)).slice(0, 14).map(r => ({ nm: r.bname, b: r.band, z: r.z, p: r.p, d: r.date, t: r.type })); }
  async function crawl(kind, slug) {
    const out = [];
    for (let p = 1; p <= COMM_PAGES; p++) {
      let rs; try { rs = findTx(await nextData('https://www.propertyfinder.ae/en/transactions/' + kind + '/dubai/' + slug + '?page=' + p)) || []; } catch (e) { break; }
      if (!rs.length) break;
      let oldHit = false;
      for (const t of rs) { if (!t.price || !t.pricePerSqft || !t.transactionDate || t.isBulkTransaction) continue; if (Date.now() - Date.parse(t.transactionDate) > WINDOW_MS) { oldHit = true; continue; } out.push({ psf: (kind === 'rent' ? +t.pricePerSqft * 12 : +t.pricePerSqft), band: bandOf(t.bedrooms), type: ptBucket(t.propertyType), date: t.transactionDate, bslug: t.locationSlug || '', bname: t.locationName || '', p: t.price, z: Math.round(t.builtupArea || t.plotArea || 0) || null }); }
      if (rs.length < 10 || oldHit) break;
      await sleep(200);
    }
    return out;
  }

  // crawl every gazetteer community; fall back to a core list if the gazetteer came back empty
  let communityList = Object.entries(commSlugs);
  if (communityList.length < 20) communityList = [['downtown-dubai', 'Downtown Dubai'], ['dubai-marina', 'Dubai Marina'], ['business-bay', 'Business Bay'], ['jumeirah-village-circle-jvc', 'Jumeirah Village Circle (JVC)'], ['palm-jumeirah', 'Palm Jumeirah'], ['jumeirah-lake-towers-jlt', 'Jumeirah Lake Towers (JLT)']];
  const index = { generatedAt: new Date().toISOString(), communities: {}, buildings: {} };
  const seenBuild = {};
  for (const [slug, name] of communityList) {
    const sale = await crawl('sold', slug); await sleep(150);
    const rent = await crawl('rent', slug); await sleep(150);
    if (!sale.length && !rent.length) continue;
    index.communities[slug] = { name, sale: byType(sale), rent: byType(rent), sx: samples(sale), rx: samples(rent) };
    for (const r of sale.concat(rent)) { if (r.bslug) (seenBuild[r.bslug] = seenBuild[r.bslug] || { name: r.bname, area: name, sale: [], rent: [] }); }
    sale.forEach(r => { if (r.bslug && seenBuild[r.bslug]) seenBuild[r.bslug].sale.push(r); });
    rent.forEach(r => { if (r.bslug && seenBuild[r.bslug]) seenBuild[r.bslug].rent.push(r); });
  }
  for (const bslug in seenBuild) { const b = seenBuild[bslug]; if (b.sale.length + b.rent.length < 3) continue; index.buildings[bslug] = { name: b.name, area: b.area, sale: byType(b.sale), rent: byType(b.rent), sx: samples(b.sale), rx: samples(b.rent) }; }

  const idxJson = JSON.stringify(index);
  let prevIdx = null; try { if (existsSync('price-index.json')) prevIdx = readFileSync('price-index.json', 'utf8'); } catch (e) {}
  const strip = s => s ? s.replace(/"generatedAt":"[^"]*",/, '') : s;
  if (strip(prevIdx) !== strip(idxJson)) writeFileSync('price-index.json', idxJson);
  console.log('Price index:', Object.keys(index.communities).length, 'communities,', Object.keys(index.buildings).length, 'buildings');
}
