const $ = id => document.getElementById(id);
let page = 1, pages = 0, busy = false;
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—';
const number = value => Number(value).toLocaleString('en-IN');
const money = (value,currency='INR') => new Intl.NumberFormat('en-IN',{style:'currency',currency}).format(Number(value||0)/100);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function api(path, options) {
  const response = await fetch('/api/owner' + path, options);
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) show(false);
    throw new Error(data.message || 'Request failed');
  }
  return data;
}
function show(signedIn) { $('login').hidden = signedIn; $('dashboard').hidden = !signedIn; $('logout').hidden = !signedIn; }
function query(currentPage) { return new URLSearchParams({ from: $('from').value, to: $('to').value, search: $('search').value, status: $('status').value, page: currentPage }); }
async function load() {
  if (busy) return;
  busy = true; $('message').textContent = 'Loading reports…';
  try {
    const data = await api('/reports?' + query(page));
    show(true); pages = data.pagination.pages;
    const s = data.summary;
    const revenue=(data.revenue||[]).find(r=>r._id==='INR');
    const metrics = [['Registered companies',number(s.total),'All-time registrations'],['Companies with quota',number(s.active),'Unblocked, with available bookings'],['Captured platform payments',money(revenue?.amount),'Selected dates | INR'],['Bookings created',number(s.bookings),'Selected dates | includes cancelled'],['Available bookings',number(s.available),'Across all companies'],['Quota exhausted',number(s.exhausted),'Companies needing more bookings'],['Total branches',number(s.branches),number(s.franchises)+' franchise branches'],['New companies',number(s.registrations),'Registered in selected dates']];
    $('cards').innerHTML = metrics.map(([label,value,hint]) => `<div class="card"><span>${escape(label)}</span><strong>${escape(value)}</strong><small>${escape(hint)}</small></div>`).join('');
    const percent=Math.min(100,s.granted?s.used/s.granted*100:0);
    $('quota').innerHTML=`<div class="quota-total">${number(s.used)} <small>of ${number(s.granted)} bookings used</small></div><div class="progress" role="progressbar" aria-label="Company booking quota used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><div class="quota-line"><span>Available for bookings</span><strong>${number(s.available)}</strong></div><div class="quota-line"><span>Pending booking holds</span><strong>${number(s.held)}</strong></div><div class="quota-line"><span>Blocked companies</span><strong>${number(s.blocked)}</strong></div>`;
    $('network-data').innerHTML=[['Own branches',s.branches-s.franchises],['Franchise branches',s.franchises],['Franchise bookings allocated',s.franchiseAllocated],['Franchise quota used',s.franchiseUsed],['External bookings in range',s.external],['International bookings in range',s.international],['Cancelled bookings in range',s.cancelled]].map(([label,value])=>`<div><span>${label}</span><strong>${number(value)}</strong></div>`).join('');
    $('couriers').innerHTML=(data.couriers||[]).map(c=>`<div><span>${escape(c._id==='production'?'Production':c._id==='staging'?'Staging / testing':'Environment not set')}</span><strong>${number(c.connected)} connected</strong></div><p>${number(c.enabled)} company accounts with purchased service access</p>`).join('')||'<p>No Delhivery accounts connected yet.</p>';
    $('revenue').innerHTML=(data.revenue||[]).map(r=>`<div><small>Captured (${escape(r._id)})</small><strong>${escape(money(r.amount,r._id))}</strong><p>Booking packs: ${escape(money(r.bookingPacks,r._id))}<br>Service fees: ${escape(money(r.services,r._id))}</p></div>`).join('')||'<p>No captured platform payments in this period.</p>';
    $('payment-mode').textContent=data.paymentMode==='test'?'Razorpay test configuration':data.paymentMode==='live'?'Razorpay live configuration':'Payment configuration unavailable';
    $('payment-rows').innerHTML=(data.recentPayments||[]).map(p=>`<tr><td>${escape(p.companyId?.name||'Company unavailable')}</td><td>${p.purpose==='service'?'Courier service':'Booking pack'}<small>${escape(p.providerKey||'')}</small></td><td>${escape(money(p.amount,p.currency))}</td><td>${number(p.bookings||0)}</td><td><span class="badge ${p.status==='paid'?'paid':'created'}">${p.status==='paid'?'Paid':'Not captured'}</span></td><td>${date(p.createdAt)}<small>${p.paidAt?'Paid '+date(p.paidAt):'Capture not recorded'}</small></td></tr>`).join('')||'<tr><td colspan="6">No payment orders in this period.</td></tr>';
    const max = Math.max(1, ...data.trends.map(row => row.count));
    $('trend').replaceChildren();
    for (const row of data.trends) {
      const line = document.createElement('div'); line.className = 'trend-row';
      const label = document.createElement('span'); label.textContent = row._id;
      const track = document.createElement('div'); const bar = document.createElement('div'); bar.className = 'bar'; bar.style.width = (row.count / max * 100) + '%'; track.append(bar);
      const count = document.createElement('span'); count.textContent = row.count;
      line.append(label,track,count); $('trend').append(line);
    }
    if (!data.trends.length) $('trend').textContent = 'No registrations in this period.';
    $('companies').innerHTML = data.companies.map(c => `<tr><td><strong>${escape(c.name)}</strong><small>${escape(c.email)}</small><small>${escape(c.state||'')} | ${escape(c.operatingCategories||'both')}</small></td><td><span class="badge ${['active','blocked','exhausted'].includes(c.status)?c.status:'exhausted'}">${c.status==='active'?'Available quota':c.status==='blocked'?'Blocked':'Quota exhausted'}</span></td><td>${number(c.branches)} branches<small>${number(c.franchises)} franchises</small></td><td>${number(c.quota.total)}</td><td>${number(c.quota.used)} used<small>${number(c.quota.held)} held</small></td><td><strong>${number(c.quota.available)}</strong></td><td>${number(c.bookings)}</td></tr>`).join('') || '<tr><td colspan="7">No companies match these filters.</td></tr>';
    $('pagination').textContent = `${number(data.pagination.total)} companies · Page ${page} of ${pages || 1}`;
    $('previous').disabled = page <= 1; $('next').disabled = page >= pages;
    $('updated').textContent = 'Updated ' + new Date(data.generatedAt).toLocaleString('en-IN');
    $('message').textContent = '';
  } catch (error) { $('message').textContent = error.message; }
  finally { busy = false; }
}
$('login-form').onsubmit = async event => {
  event.preventDefault();
  try { await api('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:$('email').value,password:$('password').value}) }); $('password').value = ''; await load(); }
  catch (error) { $('message').textContent = error.message; }
};
$('logout').onclick = async () => { try { await api('/logout',{method:'POST'}); show(false); $('message').textContent = ''; } catch(error) { $('message').textContent = error.message; } };
$('filters').onsubmit = event => { event.preventDefault(); page = 1; load(); };
$('refresh').onclick = load;
$('previous').onclick = () => { if (!busy && page > 1) { page--; load(); } };
$('next').onclick = () => { if (!busy && page < pages) { page++; load(); } };
$('export').onclick = async () => {
  $('export').disabled = true;
  try {
    const rows = [['Company','Email','Phone','Registered UTC','Booking access','Branches','Franchises','Quota total','Used','Held','Available','Bookings in range']];
    for (let p = 1, end = 1; p <= end; p++) {
      const data = await api('/reports?' + query(p)); end = data.pagination.pages;
      for (const c of data.companies) rows.push([c.name,c.email,c.phone,date(c.createdAt),c.status,c.branches,c.franchises,c.quota.total,c.quota.used,c.quota.held,c.quota.available,c.bookings]);
    }
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g,'""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv],{type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'ciyash-companies.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch(error) { $('message').textContent = error.message; }
  finally { $('export').disabled = false; }
};
const now = new Date(); $('to').value = now.toISOString().slice(0,10); $('from').value = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);
api('/session').then(load).catch(error => { if (error.message !== 'Owner login required') $('message').textContent = error.message; });
