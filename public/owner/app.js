const $ = id => document.getElementById(id);
let page = 1, pages = 0, busy = false;
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'UTC' }) : '—';
const number = value => Number(value).toLocaleString('en-IN');
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
    const metrics = [['Total companies',s.total],['Independent companies',s.independent],['Active subscriptions',s.active],['Blocked companies',s.blocked],['Registrations in range',s.registrations],['Total branches',s.branches],['Bookings in range',s.bookings],['Freight value in range','?' + number(s.freightValue)]];
    $('cards').innerHTML = metrics.map(([label,value]) => `<div class="card"><span>${label}</span><strong>${typeof value === 'number' ? number(value) : value}</strong></div>`).join('');
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
    $('companies').innerHTML = data.companies.map(c => `<tr><td><strong>${escape(c.name)}</strong><small>${escape(c.state || '—')}</small></td><td>${escape(c.email)}<small>${escape(c.phone || '—')}</small></td><td>${c.parentCompany ? 'Subsidiary' : 'Independent'}</td><td>${date(c.createdAt)}</td><td><span class="badge ${c.status}">${c.status}</span></td><td>${escape(c.subscription?.plan || '—')}<small>${date(c.subscription?.validTill)}</small></td><td>${c.branches}</td><td>${c.bookings}</td></tr>`).join('') || '<tr><td colspan="8">No companies match these filters.</td></tr>';
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
    const rows = [['Company','Email','Phone','Type','Registered UTC','Status','Plan','Expiry UTC','Branches','Bookings in range']];
    for (let p = 1, end = 1; p <= end; p++) {
      const data = await api('/reports?' + query(p)); end = data.pagination.pages;
      for (const c of data.companies) rows.push([c.name,c.email,c.phone,c.parentCompany ? 'Subsidiary':'Independent',date(c.createdAt),c.status,c.subscription?.plan,date(c.subscription?.validTill),c.branches,c.bookings]);
    }
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g,'""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv],{type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'cargo-companies.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch(error) { $('message').textContent = error.message; }
  finally { $('export').disabled = false; }
};
const now = new Date(); $('to').value = now.toISOString().slice(0,10); $('from').value = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);
api('/session').then(load).catch(error => { if (error.message !== 'Owner login required') $('message').textContent = error.message; });
