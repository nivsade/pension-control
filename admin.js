const cfg=window.PENSION_CONFIG||{};
const $=s=>document.querySelector(s);
let client=null, rows=[];
function msg(text,bad=false){const el=$('#loginMsg');el.textContent=text;el.classList.remove('hidden');el.classList.toggle('ok',!bad)}
function money(n){return new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(n||0))}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function statusLabel(s){return ({new:'חדש',in_review:'בטיפול',waiting_data:'ממתין למידע',completed:'הושלם',closed:'נסגר'})[s]||s}
async function init(){
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey){msg('יש להשלים config.js לפני שימוש במערכת הניהול.',true);return}
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const {data:{session}}=await client.auth.getSession(); if(session) showAdmin();
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const {error}=await client.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});if(error)return msg('הכניסה נכשלה. בדוק אימייל, סיסמה והרשאת Admin.',true);showAdmin()});
async function showAdmin(){ $('#loginView').classList.add('hidden');$('#adminView').classList.remove('hidden');$('#logoutBtn').classList.remove('hidden');await loadRows() }
async function loadRows(){
  const {data,error}=await client.from('check_requests').select('*').order('created_at',{ascending:false}).limit(200);
  if(error){alert('לא ניתן לטעון בקשות. ודא שהמשתמש מוגדר ב-admin_users.');return}
  rows=data||[]; $('#requestsBody').innerHTML=rows.length?rows.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString('he-IL')}</td><td>${esc(r.full_name)}</td><td>${esc(r.phone||'—')}</td><td>${esc(r.email||'—')}</td><td><span class="status-chip">${statusLabel(r.status)}</span></td><td><button class="secondary" data-id="${r.id}">פתח</button></td></tr>`).join(''):'<tr><td colspan="6">אין בקשות עדיין</td></tr>';
  document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openDetail(b.dataset.id));
}
function openDetail(id){
 const r=rows.find(x=>x.id===id);if(!r)return;const p=r.pension_data||{};
 $('#detailContent').innerHTML=`<div class="admin-detail"><div><small>שם</small><strong>${esc(r.full_name)}</strong></div><div><small>ת״ז</small><strong>${esc(r.id_number)}</strong></div><div><small>תאריך הנפקה</small><strong>${esc(r.id_issue_date)}</strong></div><div><small>טלפון</small><strong>${esc(r.phone||'—')}</strong></div><div><small>אימייל</small><strong>${esc(r.email||'—')}</strong></div><div><small>גיל / שכר</small><strong>${esc(r.age||'—')} · ${r.salary?money(r.salary):'—'}</strong></div><div><small>יתרת פנסיה</small><strong>${p.pensionBalance!==undefined?money(p.pensionBalance):'טרם הוזן'}</strong></div><div><small>חתימה</small><strong>${r.signature_path?'נשמרה באופן פרטי':'לא נמצאה'}</strong><div id="signatureAction"></div></div></div><h3 style="margin-top:20px">סטטוס</h3><div class="admin-actions"><select id="statusSelect"><option value="new">חדש</option><option value="in_review">בטיפול</option><option value="waiting_data">ממתין למידע</option><option value="completed">הושלם</option><option value="closed">נסגר</option></select><button class="primary" id="saveStatus">שמור סטטוס</button></div>`;
 if(r.signature_path){ client.storage.from('signatures').createSignedUrl(r.signature_path,300).then(({data})=>{if(data?.signedUrl)$('#signatureAction').innerHTML=`<a class="secondary" style="display:inline-flex;margin-top:8px" target="_blank" rel="noopener" href="${data.signedUrl}">צפה בחתימה</a>`}); }
 $('#statusSelect').value=r.status;$('#saveStatus').onclick=async()=>{const status=$('#statusSelect').value;const {error}=await client.from('check_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert('שמירת הסטטוס נכשלה');r.status=status;$('#detailModal').classList.remove('show');loadRows()};
 $('#detailModal').classList.add('show');
}
$('#closeModal').onclick=()=>$('#detailModal').classList.remove('show');$('#detailModal').onclick=e=>{if(e.target.id==='detailModal')e.currentTarget.classList.remove('show')};$('#refreshBtn').onclick=loadRows;$('#logoutBtn').onclick=async()=>{await client.auth.signOut();location.reload()};
init();
