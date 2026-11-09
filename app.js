(function(){
  var SLIDE_MS = 15000, PHOTOS = 4, REFRESH_MIN = 5, NEW_DAYS = 7;

var css = ''
  + ':root{--bg:#0b1622;--panel:#0f1d2c;--ink:#f4f1ea;--muted:#9fb0c2;--line:rgba(255,255,255,.12);--gold:#c9a45c;--rent:#3fa7a0;--new:#e4572e}'
  + '*{box-sizing:border-box;margin:0;padding:0}'
  + 'html,body{height:100%;background:var(--bg)!important;color:var(--ink);overflow:hidden;font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif}'
  + '#tv{position:fixed;inset:0;display:grid;grid-template-columns:62% 38%;z-index:2147483647;background:var(--bg);cursor:none}'
  + '#tv .ph{position:relative;overflow:hidden;background:#000}'
  + '#tv .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s ease;transform:scale(1.04)}'
  + '#tv .ph img.on{opacity:1;animation:tvkb 14s linear forwards}'
  + '@keyframes tvkb{from{transform:scale(1.04)}to{transform:scale(1.12)}}'
  + '#tv .ph:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,22,34,0) 70%,rgba(11,22,34,.85) 100%),linear-gradient(0deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 25%)}'
  + '#tv .tags{position:absolute;top:3.5vh;left:3vw;z-index:2;display:flex;gap:.8vw}'
  + '#tv .tg{padding:.9vh 1.3vw;border-radius:3px;font-weight:700;letter-spacing:.18em;font-size:1.25vw}'
  + '#tv .Sale{background:var(--gold);color:#0b1622}#tv .Rent{background:var(--rent);color:#fff}#tv .New{background:var(--new);color:#fff}#tv .Prem{background:#6d3fc0;color:#fff}#tv .Feat{background:#fff;color:#0b1622}'
  + '#tv .dots{position:absolute;left:3vw;bottom:3vh;display:flex;gap:.6vw;z-index:2}'
  + '#tv .dots i{width:2.2vw;height:.45vh;background:rgba(255,255,255,.35);border-radius:2px}#tv .dots i.on{background:#fff}'
  + '#tv .in{position:relative;padding:5vh 3.2vw 4vh 2.6vw;display:flex;flex-direction:column;background:var(--panel)}'
  + '#tv .br{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:1.8vh}'
  + '#tv .br b{font-size:1.6vw;font-weight:700}#tv .br span{white-space:nowrap;font-size:.95vw;color:var(--muted);letter-spacing:.2em;text-transform:uppercase}'
  + '#tv .bd{flex:1;display:flex;flex-direction:column;justify-content:center;gap:2.2vh}'
  + '#tv .sub{font-size:1.15vw;color:var(--gold);opacity:.8;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-top:-1vh}'
  + '#tv .loc{font-size:3.4vw;line-height:1.05;color:var(--gold);letter-spacing:.02em;text-transform:uppercase;font-weight:800}'
  + '#tv .ti{font-size:2.1vw;line-height:1.18;font-weight:600}#tv .pt{font-size:1.3vw;color:var(--muted);display:flex;gap:1.2vw;align-items:center;flex-wrap:wrap}#tv .pt .pub{color:var(--ink);background:rgba(255,255,255,.08);border:1px solid var(--line);padding:.5vh .9vw;border-radius:2vw;font-size:1.25vw}'
  + '#tv .pr{font-size:4.1vw;font-weight:700;line-height:1}#tv .pr small{font-size:1.5vw;font-weight:500;color:var(--muted);margin-left:.4vw}'
  + '#tv .pr .cur{font-size:1.7vw;font-weight:600;color:var(--gold);margin-right:.6vw;vertical-align:.9vw;letter-spacing:.06em}'
  + '#tv .sp{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}'
  + '#tv .sp div{padding:2.2vh 0}#tv .sp div+div{padding-left:1.4vw;border-left:1px solid var(--line)}'
  + '#tv .sp b{display:block;font-size:2.1vw;font-weight:600}#tv .sp span{font-size:.9vw;color:var(--muted);letter-spacing:.16em;text-transform:uppercase}'
  + '#tv .pl{font-size:1.05vw;color:var(--muted)}'
  + '#tv .ag{display:flex;align-items:center;gap:1.1vw;padding:2.2vh 0;border-bottom:1px solid var(--line);min-height:12vh}'
  + '#tv .ag .av{width:6.2vw;height:6.2vw;border-radius:50%;object-fit:cover;object-position:top;border:2px solid var(--gold);flex:none;background:#1c2d40}'
  + '#tv .ag .ini{display:grid;place-items:center;font-size:2vw;font-weight:600;color:var(--gold)}'
  + '#tv .ag span{display:block;font-size:.85vw;color:var(--muted);letter-spacing:.18em;text-transform:uppercase;margin-bottom:.6vh}'
  + '#tv .ag b{font-size:1.7vw;font-weight:600;line-height:1.2}'
  + '#tv .ft{display:flex;justify-content:space-between;font-size:.95vw;color:var(--muted)}'
  + '#tv .bar{position:absolute;left:0;bottom:0;height:.5vh;background:var(--gold);width:0}'
  + '#tv .fd{animation:tvin .9s ease both}@keyframes tvin{from{opacity:0;transform:translateY(1.2vh)}to{opacity:1;transform:none}}'
  + '#tv .grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;background:#000}'
  + '#tv .grid div{background-size:cover;background-position:center;animation:tvkb 15s linear forwards}'
  + '#tv .grid:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,22,34,.15),rgba(11,22,34,.85))}'
  + '#tv .spot{position:absolute;left:3vw;bottom:5vh;z-index:3}'
  + '#tv .spot span{display:block;font-size:1.1vw;letter-spacing:.3em;color:var(--gold);text-transform:uppercase;margin-bottom:1vh}'
  + '#tv .spot b{display:block;font-size:4.2vw;line-height:1;font-weight:700}'
  + '#tv .spot i{display:block;font-style:normal;font-size:1.4vw;color:var(--muted);margin-top:1.4vh}'
  + '#tv .areas{display:flex;flex-direction:column;gap:2.1vh}'
  + '#tv .areas h3{font-size:1vw;letter-spacing:.2em;color:var(--muted);text-transform:uppercase;font-weight:500}'
  + '#tv .arow{display:grid;grid-template-columns:1fr auto;gap:.4vh 1vw;align-items:baseline}'
  + '#tv .arow b{font-size:1.55vw;font-weight:600}#tv .arow em{font-style:normal;font-size:1.55vw;color:var(--gold);font-weight:700}'
  + '#tv .arow .tr{grid-column:1/3;height:.9vh;background:rgba(255,255,255,.08);border-radius:1vh;overflow:hidden}'
  + '#tv .arow .tr i{display:block;height:100%;background:var(--gold);border-radius:1vh;width:0;transition:width 1.4s ease}'
  + '#tv .msg{position:absolute;inset:0;display:grid;place-items:center;font-size:2vw;color:var(--muted);background:var(--bg);z-index:5;text-align:center;padding:5vw}';

  
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  document.title = 'Local Division · Live Stock';
  var tv = document.createElement('div'); tv.id = 'tv';
  tv.innerHTML = '<div class="ph" id="tvph"><div class="tags" id="tvtags"></div><div class="dots" id="tvdots"></div></div>'
    + '<div class="in"><div class="br"><b>betterhomes</b><span>Local Division</span></div><div class="ag" id="tvag"></div>'
    + '<div class="bd" id="tvbd"></div><div class="ft"><span id="tvref"></span><span id="tvhead"></span><span id="tvclock"></span></div><div class="bar" id="tvbar"></div></div>'
    + '<div class="msg" id="tvmsg">Loading live stock…</div>';
  document.body.appendChild(tv);

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function num(n){ return Number(n).toLocaleString('en-US', {maximumFractionDigits:0}); }
  function shuffle(a){ for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function keyOf(ref){ return String(ref || '').toUpperCase().trim().replace(/(\d)[SL]$/, '$1').replace(/-\d{1,2}$/, '').replace(/^([A-Z]{2}\d+)[SL]$/, '$1'); }
  function isNew(t){ return t && (Date.now() - t) < NEW_DAYS*864e5; }

  // ---------- data (data.json is refreshed from Property Finder every 10 minutes) ----------
  var status = {err:[]};
  function load(){
    return fetch('data.json?t=' + Date.now(), {cache:'no-store'}).then(function(r){ if (!r.ok) throw new Error('data ' + r.status); return r.json(); })
      .then(function(d){
        return (d.listings || []).map(function(x){
          x.key = x.ref; x.since = Date.parse(x.since || 0) || 0; x.isNew = isNew(x.since); return x;
        }).filter(function(x){ return x.imgs && x.imgs.length; });
      });
  }

  // ---------- slideshow ----------
  var queue = [], all = [], pos = -1, photoTimer = null, imgs = [];
  function buildQueue(){
    // Premium and Featured listings get priority: one of them, then 2 other listings (newest first), repeated.
    var newest = function(a,b){ return (b.since || 0) - (a.since || 0); };
    var paid = all.filter(function(x){ return x.level === 'premium'; }).sort(newest)
      .concat(all.filter(function(x){ return x.level === 'featured'; }).sort(newest));
    var rest = all.filter(function(x){ return x.level !== 'premium' && x.level !== 'featured'; }).sort(newest);
    queue = [];
    if (!paid.length) queue = rest;
    else if (!rest.length) queue = paid;
    else {
      var pi = 0;
      for (var i = 0; i < rest.length; i += 2){
        queue.push(paid[pi % paid.length]); pi++;
        queue.push(rest[i]); if (rest[i+1]) queue.push(rest[i+1]);
      }
    }
    pos = -1;
  }
  var BROKER_EVERY = 3, slideNo = 0, brokers = [], bIdx = 0;
  function agentKey(n){ var w = String(n || '').toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(Boolean); return w.length ? w[0] + '|' + w[w.length-1] : ''; }
  function buildBrokers(){
    var m = {};
    all.forEach(function(x){
      var k = agentKey(x.agent); if (!k || /portfolio/i.test(x.agent)) return;
      var b = m[k] || (m[k] = {name:x.agent, avatar:null, n:0, sale:0, rent:0, areas:{}, photos:[]});
      if (x.agent.length > b.name.length) b.name = x.agent;
      if (!b.avatar && x.avatar) b.avatar = x.avatar;
      b.n++; if (x.type === 'Sale') b.sale++; else b.rent++;
      if (x.area) b.areas[x.area] = (b.areas[x.area] || 0) + 1;
      if (b.photos.length < 4 && x.imgs[0]) b.photos.push(x.imgs[0]);
    });
    brokers = Object.keys(m).map(function(k){ return m[k]; }).filter(function(b){ return b.n >= 2; })
      .sort(function(a,b){ return b.n - a.n; });
    if (bIdx >= brokers.length) bIdx = 0;
  }
  function showBroker(b){
    var ph = $('tvph');
    imgs.forEach(function(el){ el.remove(); }); imgs = []; clearInterval(photoTimer);
    var old = ph.querySelector('.grid'); if (old) old.remove();
    var oldS = ph.querySelector('.spot'); if (oldS) oldS.remove();
    var g = document.createElement('div'); g.className = 'grid';
    var ps = b.photos.slice(); while (ps.length < 4 && ps.length) ps.push(ps[ps.length % b.photos.length]);
    g.innerHTML = ps.map(function(u){ return '<div style="background-image:url(\'' + u.replace(/'/g,'') + '\')"></div>'; }).join('');
    ph.insertBefore(g, $('tvtags'));
    var sp = document.createElement('div'); sp.className = 'spot fd';
    sp.innerHTML = '<span>Broker spotlight</span><b>' + b.n + ' live listings</b><i>' + b.sale + ' for sale · ' + b.rent + ' for rent</i>';
    ph.appendChild(sp);
    $('tvtags').innerHTML = ''; $('tvdots').innerHTML = '';
    var ini = b.name.split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
    $('tvag').innerHTML = (b.avatar ? '<img class="av" src="' + esc(b.avatar) + '" alt="">' : '<div class="av ini">' + esc(ini) + '</div>')
      + '<div class="fd"><span>Listing agent</span><b>' + esc(b.name) + '</b></div>';
    var av = tv.querySelector('#tvag img.av'); if (av) av.onerror = function(){ av.outerHTML = '<div class="av ini">' + esc(ini) + '</div>'; };
    var top = Object.keys(b.areas).map(function(a){ return [a, b.areas[a]]; }).sort(function(x,y){ return y[1] - x[1]; }).slice(0,5);
    var max = top.length ? top[0][1] : 1;
    $('tvbd').innerHTML = '<div class="areas fd"><h3>Where ' + esc(b.name.split(' ')[0]) + ' has the most listings</h3>'
      + top.map(function(t){ return '<div class="arow"><b>' + esc(t[0]) + '</b><em>' + t[1] + '</em><div class="tr"><i data-w="' + Math.round(t[1]/max*100) + '"></i></div></div>'; }).join('') + '</div>';
    setTimeout(function(){ [].forEach.call(tv.querySelectorAll('.tr i'), function(i){ i.style.width = i.dataset.w + '%'; }); }, 300);
    $('tvref').textContent = '';
    var bar = $('tvbar'); bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth;
    bar.style.transition = 'width ' + SLIDE_MS + 'ms linear'; bar.style.width = '100%';
  }
  function next(){
    slideNo++;
    if (brokers.length && slideNo % (BROKER_EVERY + 1) === 0){ showBroker(brokers[bIdx]); bIdx = (bIdx + 1) % brokers.length; }
    else show();
  }
  function published(t){
    if (!t) return '';
    var d = new Date(t), now = new Date();
    var day = function(x){ return Math.floor((x.getTime() + 4*3600000) / 864e5); }; // Dubai calendar day
    var n = day(now) - day(d);
    var rel = n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago';
    var date = d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Dubai'});
    return 'Published ' + rel + ' · ' + date;
  }
  function priceHtml(x){
    if (x.por || !x.price) return '<span style="font-size:3vw">Price on request</span>';
    var p = x.price, t = p >= 1e6 ? (p/1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : num(p);
    return '<span class="cur">AED</span>' + t + (x.type === 'Sale' ? '' : '<small>/ ' + x.period + '</small>');
  }
  function show(){
    if (!queue.length) return;
    pos = (pos + 1) % queue.length;
    var x = queue[pos], ph = $('tvph');
    imgs.forEach(function(el){ el.remove(); }); clearInterval(photoTimer);
    [].forEach.call(ph.querySelectorAll('.grid,.spot'), function(el){ el.remove(); });
    imgs = x.imgs.map(function(u){ var el = new Image(); el.onerror = function(){ el.dataset.bad = 1; }; el.src = u; ph.insertBefore(el, $('tvtags')); return el; });
    var dots = $('tvdots'); dots.innerHTML = x.imgs.map(function(){ return '<i></i>'; }).join('');
    var p = 0;
    function step(){
      var k = 0; while (imgs[p] && imgs[p].dataset.bad && k < imgs.length){ p = (p+1) % imgs.length; k++; }
      imgs.forEach(function(el,i){ el.classList.toggle('on', i === p); });
      [].forEach.call(dots.children, function(d,i){ d.classList.toggle('on', i === p); });
      p = (p+1) % imgs.length;
    }
    step(); photoTimer = setInterval(step, SLIDE_MS / imgs.length);
    $('tvtags').innerHTML = '<div class="tg ' + (x.type === 'Sale' ? 'Sale">FOR SALE' : 'Rent">FOR RENT') + '</div>' + (x.isNew ? '<div class="tg New">NEW</div>' : '') + (x.level === 'premium' ? '<div class="tg Prem">PREMIUM</div>' : x.level === 'featured' ? '<div class="tg Feat">FEATURED</div>' : '');
    var ini = (x.agent || '').split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
    $('tvag').innerHTML = x.agent ? ((x.avatar ? '<img class="av" src="' + esc(x.avatar) + '" alt="">' : '<div class="av ini">' + esc(ini) + '</div>')
      + '<div class="fd"><span>Listing agent</span><b>' + esc(x.agent) + '</b></div>') : '';
    var av = tv.querySelector('#tvag img.av'); if (av) av.onerror = function(){ av.outerHTML = '<div class="av ini">' + esc(ini) + '</div>'; };
    var area = x.area || String(x.loc || '').split(' · ').pop();
    var sub = String(x.loc || '').split(' · ').filter(function(p){ return p && p !== area; }).join(' · ');
    $('tvbd').innerHTML = '<div class="loc fd">' + esc(area) + '</div>' + (sub ? '<div class="sub fd">' + esc(sub) + '</div>' : '')
      + '<div class="ti fd" style="animation-delay:.1s">' + esc(x.title) + '</div>'
      + '<div class="pt fd" style="animation-delay:.15s">' + esc(x.ptype || '') + (x.since ? '<span class="pub">' + esc(published(x.since)) + '</span>' : '') + '</div>'
      + '<div class="pr fd" style="animation-delay:.2s">' + priceHtml(x) + '</div>'
      + '<div class="sp fd" style="animation-delay:.3s"><div><b>' + (x.beds === 0 ? 'Studio' : (x.beds == null || isNaN(x.beds) ? '–' : x.beds)) + '</b><span>' + (x.beds === 0 ? 'Bedroom' : 'Beds') + '</span></div>'
      + '<div><b>' + (x.baths == null || isNaN(x.baths) ? '–' : x.baths) + '</b><span>Baths</span></div>'
      + '<div><b>' + (x.size ? num(x.size) : '–') + '</b><span>Sq ft</span></div></div>';
    $('tvref').textContent = x.ref;
    var bar = $('tvbar'); bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth;
    bar.style.transition = 'width ' + SLIDE_MS + 'ms linear'; bar.style.width = '100%';
    var nx = queue[(pos + 1) % queue.length]; if (nx) nx.imgs.forEach(function(u){ new Image().src = u; });
    if (pos === queue.length - 1) buildQueue();
  }
  function header(){
    var n = all.filter(function(x){ return x.isNew; }).length;
    $('tvhead').textContent = all.length + ' live listings' + (n ? ' · ' + n + ' new this week' : '') + (status.err.length ? ' · ' + status.err.join(' & ') + ' not reachable' : '');
  }
  var timer = null;
  function refresh(){
    load().then(function(list){
      var first = !all.length; all = list; header(); buildBrokers();
      if (!all.length){ $('tvmsg').textContent = 'No live listings right now.'; $('tvmsg').style.display = 'grid'; return; }
      $('tvmsg').style.display = 'none';
      if (first){ buildQueue(); show(); timer = setInterval(next, SLIDE_MS); }
      else {
        var live = {}; all.forEach(function(x){ live[x.key] = x; });
        var seen = {}; queue.forEach(function(x){ seen[x.key] = 1; });
        var cur = queue[pos];
        queue = queue.filter(function(x){ return live[x.key]; }).map(function(x){ return live[x.key]; });
        var fresh = all.filter(function(x){ return !seen[x.key]; });
        pos = cur ? Math.max(-1, queue.findIndex(function(x){ return x.key === cur.key; })) : -1;
        queue.splice.apply(queue, [pos + 1, 0].concat(fresh));
      }
    }).catch(function(e){
      if (!all.length){ $('tvmsg').textContent = 'Could not load the listings — check the internet connection. Retrying…'; $('tvmsg').style.display = 'grid'; setTimeout(refresh, 60000); }
    });
  }
  function clock(){ $('tvclock').textContent = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'Asia/Dubai'}); }
  refresh(); setInterval(refresh, REFRESH_MIN * 60000);
  clock(); setInterval(clock, 15000);
  tv.addEventListener('click', function(){ var el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen(); });
  setTimeout(function(){ location.reload(); }, 6*3600000);
  document.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === 'f'){ var el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen(); } });
})();
