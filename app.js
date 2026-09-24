const app = document.getElementById('app');
const resetBtn = document.getElementById('resetBtn');
const STORAGE_KEY = 'pension-control-v5';

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

function save(){
  // פרטים מזהים של מסלול בדיקת אמת אינם נשמרים ב-localStorage ב-MVP.
  const safeState={...state};
  delete safeState.verification;
  // דוח ביטוחי אמיתי אינו נשמר ב-localStorage בגרסת ה-MVP.
  delete safeState.insurance;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
}
function money(n){ return new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(n||0)); }
function pct(n){ return `${Number(n||0).toFixed(2)}%`; }
function tpl(id){ return document.getElementById(id).content.cloneNode(true); }

function navigate(view){
  history.replaceState({},'',`#${view}`);
  render(view);
  window.scrollTo({top:0,behavior:'smooth'});
}

function render(view=(location.hash||'#home').slice(1)){
  app.innerHTML='';
  resetBtn.classList.toggle('hidden', !state.profile && !state.pension && !state.insurance);
  if(view==='onboarding') renderOnboarding();
  else if(view==='verification') renderVerification();
  else if(view==='data') renderData();
  else if(view==='dashboard' && (state.pension || state.insurance)) renderDashboard();
  else renderHome();
  bindNavigation();
  app.focus({preventScroll:true});
}

function bindNavigation(){
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
}

function renderHome(){
  app.appendChild(tpl('homeTpl'));

  // כפתור דמו קיים רק בחלק מהגרסאות של מסך הבית.
  // בדיקת null מונעת קריסה של כל מסך הבית כאשר הכפתור אינו קיים.
  const demoBtn=document.querySelector('[data-demo]');
  if(demoBtn) demoBtn.addEventListener('click',()=>{
    state.mode='anonymous';
    state.profile={age:27,salary:17000,family:'single',risk:'medium',goal:'understand'};
    state.pension={pensionBalance:312000,pensionDeposit:3150,pensionAssetFee:.28,pensionDepositFee:1.6,pensionTrack:'general',studyBalance:121000,studyFee:.65,studyTrack:'sp500',otherBalance:50500,otherActive:'no',depositsOk:true};
    save(); navigate('dashboard');
  });

  const scrollBtn=document.querySelector('[data-scroll-checks]');
  if(scrollBtn) scrollBtn.addEventListener('click',()=>document.getElementById('checkTypes')?.scrollIntoView({behavior:'smooth'}));

  const startFlow=(mode)=>{
    state.mode=mode;
    state.profile=null; state.pension=null; state.insurance=null; state.reportType=null; state.verification=null;
    save(); navigate('onboarding');
  };

  document.querySelectorAll('[data-start-mode]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    startFlow(btn.dataset.startMode);
  }));

  // גם לחיצה על כל הכרטיס מתחילה את התהליך, לא רק על החץ.
  document.querySelectorAll('.home-check-card').forEach(card=>{
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    const btn=card.querySelector('[data-start-mode]');
    if(!btn) return;
    const activate=(e)=>{
      if(e.target.closest('[data-start-mode]')) return;
      startFlow(btn.dataset.startMode);
    };
    card.addEventListener('click',activate);
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); startFlow(btn.dataset.startMode); }
    });
  });

  const paidModal=document.getElementById('paidCheckModal');
  const openPaid=()=>{ paidModal?.classList.remove('hidden'); paidModal?.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const closePaid=()=>{ paidModal?.classList.add('hidden'); paidModal?.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
  document.querySelectorAll('[data-open-paid]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPaid();}));
  document.querySelectorAll('[data-close-paid]').forEach(el=>el.addEventListener('click',closePaid));

  const sendLead=async(form,source,statusEl)=>{
    const fd=new FormData(form);
    const payload={action:'submit_lead',source,fullName:String(fd.get('fullName')||''),phone:String(fd.get('phone')||''),email:String(fd.get('email')||''),idNumber:String(fd.get('idNumber')||''),idIssueDate:String(fd.get('idIssueDate')||'')};
    if(!window.PensionBackend?.configured()) throw new Error('BACKEND_NOT_CONFIGURED');
    const out=await window.PensionBackend.callFunction(payload);
    if(statusEl) statusEl.textContent='הפרטים התקבלו ✓';
    return out;
  };
  const homeLead=document.getElementById('homeLeadForm');
  homeLead?.addEventListener('submit',async e=>{
    e.preventDefault(); const st=document.getElementById('homeLeadStatus'); const btn=homeLead.querySelector('button');
    btn.disabled=true; if(st) st.textContent='שולח…';
    try{ await sendLead(homeLead,'home_callback',st); homeLead.reset(); }catch(_){ if(st) st.textContent='לא הצלחנו לשלוח כרגע. אפשר להתקשר ל־04-8220228.'; }finally{btn.disabled=false;}
  });
  const paidForm=document.getElementById('paidCheckForm');
  paidForm?.addEventListener('submit',async e=>{
    e.preventDefault(); const st=document.getElementById('paidLeadStatus'); const btn=paidForm.querySelector('button[type=submit]');
    btn.disabled=true; if(st) st.textContent='שומר פרטים ומעביר לתשלום…';
    try{ await sendLead(paidForm,'paid_pension_49',st); window.location.href='https://live.payme.io/sale/template/SALE1790-257222CL-FRUJKNEW-ILZG7KC3'; }
    catch(_){ if(st) st.textContent='לא הצלחנו לשמור את הפרטים. נסו שוב או התקשרו ל־04-8220228.'; btn.disabled=false; }
  });
}

function renderOnboarding(){
  if(!state.mode) state.mode='anonymous';
  app.appendChild(tpl('onboardingTpl'));
  const isReal=state.mode==='real';
  const pill=document.getElementById('onboardingModePill');
  const step=document.getElementById('onboardingStepLabel');
  const continueBtn=document.getElementById('profileContinue');
  if(pill){ pill.textContent=isReal?'בדיקת התיק הפנסיוני והביטוחי':'בדיקה אנונימית'; pill.classList.add(isReal?'real-pill':'anon-pill'); }
  if(step) step.textContent=isReal?'בדיקת התיק הפנסיוני והביטוחי · שלב 1 מתוך 4':'בדיקה אנונימית · שלב 1 מתוך 3';
  if(continueBtn) continueBtn.textContent=isReal?'המשך להרשאה וזיהוי':'המשך לנתונים הפנסיוניים';
  const form=document.getElementById('profileForm');
  if(state.profile){ Object.entries(state.profile).forEach(([k,v])=>{ if(form.elements[k]) form.elements[k].value=v; }); }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    state.profile=Object.fromEntries(new FormData(form).entries());
    state.profile.age=Number(state.profile.age); state.profile.salary=Number(state.profile.salary);
    save(); navigate(isReal?'verification':'data');
  });
}

function renderVerification(){
  if(state.mode!=='real') return navigate('onboarding');
  if(!state.profile) return navigate('onboarding');
  app.appendChild(tpl('verificationTpl'));
  const form=document.getElementById('verificationForm');
  const panel=form.closest('.panel');
  const backendBox=document.createElement('div');
  backendBox.className='backend-status '+(window.PensionBackend?.configured?.()?'ok':'');
  backendBox.textContent=window.PensionBackend?.configured?.() ? '✓ המערכת מחוברת ל-backend. הבקשה תישמר ותופיע במערכת הניהול.' : 'מצב דמו: עדיין לא הוגדר חיבור ל-Supabase ולכן הפרטים לא יישלחו אליך.';
  panel.insertBefore(backendBox, form);
  const canvas=document.getElementById('signaturePad');
  const ctx=canvas.getContext('2d');
  let drawing=false, hasSignature=false;

  if(state.verification){
    ['fullName','idNumber','idIssueDate','phone','email'].forEach(k=>{ if(form.elements[k] && state.verification[k]) form.elements[k].value=state.verification[k]; });
    ['consentAccess','consentPrivacy','consentDisclaimer'].forEach(k=>{ if(form.elements[k]) form.elements[k].checked=!!state.verification[k]; });
  }

  function canvasPoint(e){
    const rect=canvas.getBoundingClientRect();
    const src=e.touches?e.touches[0]:e;
    return {x:(src.clientX-rect.left)*(canvas.width/rect.width), y:(src.clientY-rect.top)*(canvas.height/rect.height)};
  }
  function start(e){ e.preventDefault(); drawing=true; const p=canvasPoint(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }
  function move(e){ if(!drawing)return; e.preventDefault(); const p=canvasPoint(e); ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#0f172a'; ctx.lineTo(p.x,p.y); ctx.stroke(); hasSignature=true; }
  function end(e){ if(e)e.preventDefault(); drawing=false; }
  ['mousedown','touchstart'].forEach(ev=>canvas.addEventListener(ev,start,{passive:false}));
  ['mousemove','touchmove'].forEach(ev=>canvas.addEventListener(ev,move,{passive:false}));
  ['mouseup','mouseleave','touchend','touchcancel'].forEach(ev=>canvas.addEventListener(ev,end,{passive:false}));
  document.getElementById('clearSignature').addEventListener('click',()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); hasSignature=false; });

  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!hasSignature && !state.verification?.signatureProvided){ alert('יש להוסיף חתימה לפני שממשיכים'); return; }
    const fd=new FormData(form);
    const obj=Object.fromEntries(fd.entries());
    obj.consentAccess=form.elements.consentAccess.checked;
    obj.consentPrivacy=form.elements.consentPrivacy.checked;
    obj.consentDisclaimer=form.elements.consentDisclaimer.checked;
    obj.signatureProvided=true;
    obj.signatureDataUrl=canvas.toDataURL('image/png');
    state.verification=obj;
    const backendReady=window.PensionBackend?.configured?.();
    if(!backendReady){
      alert('המערכת עדיין לא מחוברת ל-Supabase. ניתן להמשיך כדמו, אך הפרטים לא יישלחו אליך עד להשלמת config.js וה-Edge Function.');
      navigate('data');
      return;
    }
    const submitBtn=form.querySelector('button[type=submit]');
    submitBtn.disabled=true; submitBtn.textContent='שולח בקשה מאובטחת...';
    window.PensionBackend.callFunction({action:'submit_identity',profile:state.profile,verification:obj,signatureDataUrl:obj.signatureDataUrl})
      .then(res=>{ state.requestId=res.requestId; navigate('data'); })
      .catch(err=>{ console.error(err); alert('שליחת הבקשה נכשלה. נסה שוב או בדוק את חיבור ה-backend.'); submitBtn.disabled=false; submitBtn.textContent='אישור והמשך'; });
  });
}

function renderData(){
  if(!state.profile) return navigate('onboarding');
  if(state.mode==='real' && !state.verification) return navigate('verification');
  app.appendChild(tpl('dataTpl'));
  const isReal=state.mode==='real';

  // In a real check the client does not enter pension balances manually.
  // After identity/consent submission, the request waits for the back-office report.
  if(isReal){
    const panel=app.querySelector('.panel');
    if(panel){
      panel.innerHTML=`
        <span class="eyebrow">בדיקת התיק הפנסיוני והביטוחי · הבקשה התקבלה</span>
        <div class="mode-pill real-pill">בדיקת אמת</div>
        <div style="text-align:center;padding:28px 8px 12px">
          <div style="width:64px;height:64px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:#eaf2ff;color:#1769e0;font-size:30px;font-weight:800">✓</div>
          <h2 style="margin-bottom:10px">הבקשה שלך התקבלה בהצלחה</h2>
          <p class="muted" style="max-width:620px;margin:0 auto 14px">אין צורך להזין יתרות, הפקדות או סכומים מקרן הפנסיה. אנחנו נפיק את הנתונים הרלוונטיים ונכין עבורך את הבדיקה.</p>
          <p class="muted" style="max-width:620px;margin:0 auto 24px">התוצאות יהיו מוכנות עד 3 ימי עסקים. כשהבדיקה תהיה מוכנה נוכל לשלוח לך קישור אישי לצפייה בתוצאות.</p>
          <button type="button" class="primary" data-go="home">חזרה למסך הבית</button>
        </div>`;
      panel.querySelector('[data-go="home"]')?.addEventListener('click',()=>navigate('home'));
    }
    return;
  }

  const step=document.getElementById('dataStepLabel');
  const pill=document.getElementById('dataModePill');
  const intro=document.getElementById('dataIntro');
  if(step) step.textContent=isReal?'בדיקת אמת · שלב 3 מתוך 4':'בדיקה אנונימית · שלב 2 מתוך 3';
  if(pill){ pill.textContent=isReal?'בדיקת התיק הפנסיוני והביטוחי':'בדיקה אנונימית'; pill.classList.add(isReal?'real-pill':'anon-pill'); }
  if(intro) intro.textContent=isReal?'העלה דוח אמיתי והזן את הנתונים המרכזיים ממנו. בגרסת ה-MVP הניתוח מתבצע על הנתונים שהוזנו; חיבור אוטומטי למסלקה יתווסף ב-backend.':'אין צורך בשם, ת״ז או פרטי קשר. הזן את הנתונים שברשותך כדי לקבל הערכה ראשונית.';
  const form=document.getElementById('pensionForm');
  if(state.pension){ Object.entries(state.pension).forEach(([k,v])=>{ const el=form.elements[k]; if(!el)return; if(el.type==='checkbox')el.checked=!!v; else el.value=v; }); }
  document.getElementById('pickFile').addEventListener('click',()=>document.getElementById('reportFile').click());
  document.getElementById('reportFile').addEventListener('change',async e=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>10*1024*1024){ alert('הקובץ גדול מ-10MB'); e.target.value=''; return; }
    const status=document.getElementById('reportParseStatus');
    const preview=document.getElementById('insurancePreview');
    document.getElementById('fileName').textContent=`נבחר: ${file.name}`;
    status.className='report-parse-status'; status.textContent='קורא את הדוח ומרכז את הפוליסות...';
    preview.classList.add('hidden');
    try{
      const analysis=await parseInsuranceWorkbook(file);
      state.insurance=analysis; state.reportType='insurance';
      status.textContent=`✓ זוהה דוח הר הביטוח: ${analysis.rowsCount} שורות, ${analysis.policyCount} פוליסות מרכזיות.`;
      preview.innerHTML=insurancePreviewHtml(analysis); preview.classList.remove('hidden');
      preview.querySelector('[data-analyze-insurance]')?.addEventListener('click',()=>navigate('dashboard'));
    }catch(err){
      console.error(err); state.insurance=null;
      status.className='report-parse-status error';
      status.textContent='לא הצלחנו לזהות דוח הר הביטוח בקובץ. ודא שזה Excel שהופק מאתר הר הביטוח ושכותרות העמודות נשמרו.';
    }
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const fd=new FormData(form); const obj=Object.fromEntries(fd.entries());
    ['pensionBalance','pensionDeposit','pensionAssetFee','pensionDepositFee','studyBalance','studyFee','otherBalance'].forEach(k=>obj[k]=Number(obj[k]||0));
    obj.depositsOk=form.elements.depositsOk.checked;
    state.pension=obj; state.reportType='pension'; state.insurance=null; save();
    if(isReal && state.requestId && window.PensionBackend?.configured?.()){
      const submitBtn=form.querySelector('button[type=submit]');
      submitBtn.disabled=true; submitBtn.textContent='שומר נתונים...';
      window.PensionBackend.callFunction({action:'submit_pension',requestId:state.requestId,pension:obj})
        .then(()=>navigate('dashboard'))
        .catch(err=>{console.error(err); alert('הפרטים המזהים נשמרו, אך שמירת הנתונים הפנסיוניים נכשלה. אפשר לנסות שוב.'); submitBtn.disabled=false; submitBtn.textContent='נתח את החיסכון שלי';});
    } else navigate('dashboard');
  });
}


function cleanCell(v){ return String(v??'').trim(); }
function numCell(v){
  if(typeof v==='number' && Number.isFinite(v)) return v;
  const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9.\-]/g,''));
  return Number.isFinite(n)?n:0;
}
function annualizePremium(amount,type){
  const t=cleanCell(type);
  if(/חודש/.test(t)) return amount*12;
  if(/רבע/.test(t)) return amount*4;
  return amount;
}
function parseStartYear(period){
  const m=cleanCell(period).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m?Number(m[3]):null;
}
function insuranceBucket(main){
  const v=cleanCell(main);
  if(v.includes('רכב')||v.includes('דירה')) return 'general';
  if(v.includes('בריאות')||v.includes('סיעודי')||v.includes('כתב שירות')||v.includes('תאונות')) return 'health';
  if(v.includes('חיים')||v.includes('כושר עבודה')) return 'life';
  return 'other';
}
function maskPolicy(v){
  const s=cleanCell(v);
  if(!s) return 'ללא מספר';
  return s.length<=4?s:`••••${s.slice(-4)}`;
}
async function parseInsuranceWorkbook(file){
  if(!window.XLSX) throw new Error('Excel parser unavailable');
  const buf=await file.arrayBuffer();
  const book=XLSX.read(buf,{type:'array',raw:false});
  const ws=book.Sheets[book.SheetNames[0]];
  const grid=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
  const headerIndex=grid.findIndex(row=>row.some(v=>cleanCell(v)==='תעודת זהות') && row.some(v=>cleanCell(v)==='ענף ראשי') && row.some(v=>cleanCell(v).includes('פרמיה')));
  if(headerIndex<0) throw new Error('headers not found');
  const headers=grid[headerIndex].map(cleanCell);
  const idx=(name,partial=false)=>headers.findIndex(h=>partial?h.includes(name):h===name);
  const c={id:idx('תעודת זהות'),main:idx('ענף ראשי'),sub:idx('ענף (משני)'),product:idx('סוג מוצר'),company:idx('חברה'),period:idx('תקופת ביטוח'),details:idx('פרטים נוספים'),premium:idx('פרמיה',true),premiumType:idx('סוג פרמיה'),policy:idx('מספר פוליסה')};
  if([c.main,c.sub,c.company,c.premium,c.premiumType].some(x=>x<0)) throw new Error('required columns missing');
  const records=[];
  for(const row of grid.slice(headerIndex+1)){
    const main=cleanCell(row[c.main]);
    if(!main || main.startsWith('תחום -')) continue;
    const amount=numCell(row[c.premium]);
    if(!cleanCell(row[c.company]) && !amount) continue;
    records.push({
      main, sub:cleanCell(row[c.sub]), product:cleanCell(row[c.product]), company:cleanCell(row[c.company]),
      period:cleanCell(row[c.period]), details:cleanCell(row[c.details]), premium:amount,
      premiumType:cleanCell(row[c.premiumType]), policy:cleanCell(row[c.policy]), annual:annualizePremium(amount,row[c.premiumType])
    });
  }
  if(!records.length) throw new Error('no insurance records');
  const nameRow=grid.slice(0,headerIndex).flat().map(cleanCell).find(v=>v && !v.includes('התיק הביטוחי') && !/^\d{2}\/\d{2}\/\d{4}$/.test(v))||'';
  const generatedText=grid.slice(0,headerIndex).flat().map(cleanCell).find(v=>/^\d{2}\/\d{2}\/\d{4}$/.test(v))||'';
  const sum=arr=>arr.reduce((a,b)=>a+b,0);
  const annualTotal=sum(records.map(r=>r.annual));
  const monthlyAverage=annualTotal/12;
  const categories={general:0,health:0,life:0,other:0};
  records.forEach(r=>categories[insuranceBucket(r.main)]+=r.annual);
  const policies=new Map();
  records.forEach(r=>{
    const key=r.policy||`${r.company}|${r.main}|${r.sub}`;
    if(!policies.has(key)) policies.set(key,{policyMasked:maskPolicy(r.policy),company:r.company,main:r.main,annual:0,coverages:new Set(),period:r.period,startYear:parseStartYear(r.period)});
    const p=policies.get(key); p.annual+=r.annual; p.coverages.add(r.sub||r.product); if(!p.startYear) p.startYear=parseStartYear(r.period);
  });
  const policyList=[...policies.values()].map(p=>({...p,coverages:[...p.coverages].filter(Boolean)})).sort((a,b)=>b.annual-a.annual);
  const companies={}; records.forEach(r=>companies[r.company]=(companies[r.company]||0)+r.annual);
  const mandatoryPolicies=new Set(records.filter(r=>r.sub.includes('רכב חובה')).map(r=>r.policy||r.company));
  const comprehensivePolicies=new Set(records.filter(r=>r.sub.includes('ביטוח מקיף') && r.product==='פוליסת ביטוח').map(r=>r.policy||r.company));
  const lifeAnnual=sum(records.filter(r=>r.main.includes('ביטוח חיים')).map(r=>r.annual));
  const nursingRecords=records.filter(r=>r.main.includes('סיעודי'));
  const healthPolicy=policyList.find(p=>p.main.includes('בריאות') && p.coverages.length>=3);
  const oldest=policyList.filter(p=>p.startYear).sort((a,b)=>a.startYear-b.startYear)[0];
  const zeroCostRiders=records.filter(r=>r.premium===0).length;
  const insights=[];
  insights.push({level:'info',title:'עלות הביטוחים בתיק',text:`לפי הדוח, סך הפרמיות הוא כ-${money(annualTotal)} לשנה, שהם כ-${money(monthlyAverage)} לחודש בממוצע.`,priority:1});
  if(lifeAnnual>0) insights.push({level:'warn',title:'ביטוח החיים הוא רכיב משמעותי בעלות',text:`ביטוח החיים עולה כ-${money(lifeAnnual/12)} לחודש (${money(lifeAnnual)} לשנה). לפני שינוי חשוב לבדוק סכום ביטוח, צורך משפחתי ומצב בריאותי.`,priority:2});
  if(nursingRecords.length){
    const nursingAnnual=sum(nursingRecords.map(r=>r.annual)); const year=Math.min(...nursingRecords.map(r=>parseStartYear(r.period)||9999));
    insights.push({level:'warn',title:'פוליסת סיעוד ותיקה דורשת זהירות',text:`נמצאה פוליסת סיעוד בעלות של כ-${money(nursingAnnual/12)} לחודש${year<9999?`, שמתחילה בשנת ${year}`:''}. פוליסות ותיקות עשויות לכלול תנאים ייחודיים ולכן אין לבטל או להחליף לפני בדיקה מקצועית.`,priority:2});
  }
  if(mandatoryPolicies.size>1 || comprehensivePolicies.size>1) insights.push({level:'warn',title:'מספר פוליסות רכב פעילות',text:`בדוח נמצאו ${mandatoryPolicies.size} פוליסות חובה ו-${comprehensivePolicies.size} פוליסות מקיף. אם מדובר במספר כלי רכב זה עשוי להיות תקין; אם מדובר באותו רכב, כדאי לבדוק חפיפה.`,priority:1});
  if(healthPolicy) insights.push({level:'good',title:'כיסויי בריאות מרוכזים בפוליסה מרכזית',text:`בפוליסה ${healthPolicy.policyMasked} אצל ${healthPolicy.company} מרוכזים ${healthPolicy.coverages.length} כיסויים/שירותים. ריכוז לפי מספר פוליסה מונע ספירה שגויה של כל כיסוי כפוליסה נפרדת.`,priority:3});
  if(oldest && oldest.startYear && oldest.startYear<=new Date().getFullYear()-10) insights.push({level:'info',title:'נמצאה פוליסה ותיקה',text:`הפוליסה הוותיקה ביותר בדוח מתחילה בשנת ${oldest.startYear}. לפני שינוי בפוליסה ותיקה כדאי לבדוק תנאים, החרגות וזכויות שנצברו.`,priority:3});
  if(zeroCostRiders) insights.push({level:'good',title:'כתבי שירות ללא פרמיה נפרדת',text:`נמצאו ${zeroCostRiders} רכיבים שמופיעים בדוח בעלות 0 ₪. הם עשויים להיות כלולים במסגרת פוליסה אחרת ולא בהכרח מייצגים כיסוי חינמי עצמאי.`,priority:4});
  const topCategory=Object.entries(categories).sort((a,b)=>b[1]-a[1])[0];
  return {
    clientLabel:nameRow.replace(/\s*-\s*[^-]+$/,''), generatedAt:generatedText, rowsCount:records.length, policyCount:policies.size,
    annualTotal, monthlyAverage, categories, policyList, companies, insights,
    mandatoryCount:mandatoryPolicies.size, comprehensiveCount:comprehensivePolicies.size, lifeAnnual, zeroCostRiders,
    topCategory:topCategory?.[0]||'general'
  };
}
function insurancePreviewHtml(a){
  return `<strong>הדוח נקרא בהצלחה</strong><div class="insurance-preview-grid"><div><small>עלות שנתית</small><strong>${money(a.annualTotal)}</strong></div><div><small>ממוצע חודשי</small><strong>${money(a.monthlyAverage)}</strong></div><div><small>פוליסות מרכזיות</small><strong>${a.policyCount}</strong></div></div><button class="primary" type="button" data-analyze-insurance>הצג סיכום ותובנות</button>`;
}
function insuranceCategoryLabel(k){ return ({general:'רכב ודירה',health:'בריאות וסיעוד',life:'חיים',other:'אחר'})[k]||k; }
function renderInsuranceDashboard(){
  const a=state.insurance; const container=document.getElementById('dashboardContent');
  const total=Math.max(a.annualTotal,1);
  const general=Math.round(a.categories.general/total*100), health=Math.round(a.categories.health/total*100), life=Math.round(a.categories.life/total*100), other=Math.max(0,100-general-health-life);
  const reviewCount=a.insights.filter(x=>x.level==='warn').length;
  const firstName=(state.verification?.fullName||a.clientLabel||'').trim().split(/\s+/)[0]||'';
  const categoryRows=Object.entries(a.categories).filter(([,v])=>v>0).sort((x,y)=>y[1]-x[1]);
  const topPolicies=a.policyList.slice(0,7);
  container.innerHTML=`
    <div class="client-dashboard-shell">
      <aside class="client-sidebar"><div class="client-sidebar-brand"><span class="sidebar-logo">PC</span><span>Pension Control</span></div><nav class="client-nav">
        <button class="client-nav-item active" data-dash-target="overview"><span class="nav-icon">⌂</span><span>מבט מהיר</span></button>
        <button class="client-nav-item" data-dash-target="distribution"><span class="nav-icon">◔</span><span>חלוקת עלויות</span></button>
        <button class="client-nav-item" data-dash-target="recommendations"><span class="nav-icon">✦</span><span>נקודות לבדיקה</span></button>
        <button class="client-nav-item" data-dash-target="policies"><span class="nav-icon">▤</span><span>פוליסות</span></button>
        <button class="client-nav-item" id="editDataSide"><span class="nav-icon">↥</span><span>העלאת דוח אחר</span></button>
      </nav><div class="sidebar-help"><span class="sidebar-help-icon">i</span><div><strong>ניתוח דוח הר הביטוח</strong><small>המערכת מרכזת שורות לפי מספר פוליסה ומסמנת נקודות לבדיקה, לא המלצות לביטול.</small></div></div></aside>
      <div class="client-main">
        <header class="client-dashboard-head" id="overview"><div><span class="dashboard-mode real-pill">דוח הר הביטוח</span><h1>${firstName?`היי ${firstName}, `:''}הנה התמונה הביטוחית שלך</h1><p>ריכזנו את הדוח לכמה מספרים ברורים והדגשנו נושאים שכדאי לבדוק.</p></div><button class="secondary soft-btn" id="editData">העלה דוח אחר</button></header>
        <div class="insurance-kpi-grid">
          <article class="insurance-kpi"><small>עלות שנתית משוערת</small><strong>${money(a.annualTotal)}</strong></article>
          <article class="insurance-kpi"><small>ממוצע חודשי</small><strong>${money(a.monthlyAverage)}</strong></article>
          <article class="insurance-kpi"><small>פוליסות מרכזיות</small><strong>${a.policyCount}</strong></article>
          <article class="insurance-kpi"><small>נקודות שדורשות בדיקה</small><strong>${reviewCount}</strong></article>
        </div>
        <section class="insurance-summary-grid" id="distribution">
          <article class="insurance-donut-card"><span class="card-kicker">חלוקת הפרמיות</span><h2>לאן הולך הכסף?</h2><div class="insurance-donut" style="--general:${general};--health:${health};--life:${life};--other:${other}"><div class="insurance-donut-center"><small>סה״כ לשנה</small><strong>${money(a.annualTotal)}</strong></div></div><div class="insurance-legend">${categoryRows.map(([k,v])=>`<div class="insurance-legend-row"><i style="background:${k==='general'?'#1539d4':k==='health'?'#6b63e8':k==='life'?'#f59e0b':'#cbd5e1'}"></i><span>${insuranceCategoryLabel(k)}</span><strong>${money(v)}</strong></div>`).join('')}</div></article>
          <article class="policy-card"><span class="card-kicker">סיכום מהיר</span><h2>מה בולט בתיק?</h2><div class="policy-list">${a.insights.slice(0,4).map(x=>`<div class="policy-row"><div><strong>${x.title}</strong><small>${x.text}</small></div><span>${x.level==='warn'?'⚠':'✓'}</span></div>`).join('')}</div></article>
        </section>
        <section class="recommendation-section" id="recommendations"><div class="section-title-row"><div><span class="card-kicker">בדיקה חכמה</span><h2>נקודות שכדאי לעבור עליהן</h2></div><span class="recommendation-count">${reviewCount} דורשות תשומת לב</span></div><div class="recommendation-list-modern">${a.insights.map((x,i)=>`<article class="recommendation-item ${x.level==='info'?'good':x.level}"><span class="recommendation-num">${String(i+1).padStart(2,'0')}</span><div><h3>${x.title}</h3><p>${x.text}</p>${x.level==='warn'?'<div class="insight-note">לא מבצעים שינוי אוטומטי — זו נקודה לבדיקה בלבד.</div>':''}</div><span class="recommendation-arrow">←</span></article>`).join('')}</div></section>
        <section class="all-insights-section" id="policies"><div class="section-title-row"><div><span class="card-kicker">ריכוז לפי מספר פוליסה</span><h2>הפוליסות המרכזיות</h2></div><span class="recommendation-count">${a.policyCount} פוליסות</span></div><div class="policy-card"><div class="policy-list">${topPolicies.map(p=>`<div class="policy-row"><div><strong>${p.company} · ${p.main}</strong><small>${p.policyMasked} · ${p.coverages.length} כיסויים/רכיבים${p.period?' · '+p.period:''}</small></div><strong>${money(p.annual)} / שנה</strong></div>`).join('')}</div></div></section>
        <div class="insurance-source-note"><strong>איך חושב הסיכום?</strong> פרמיה חודשית הומרה לעלות שנתית ×12; פרמיה שנתית נשארה כפי שהיא. רכיבים בעלי אותו מספר פוליסה מאוחדים כדי לא לספור כל כיסוי כפוליסה נפרדת. הדוח מציג מידע קיים ועלויות, אך אינו כולל בהכרח סכומי ביטוח, חריגים, מצב רפואי או התאמה אישית מלאה.</div>
        <div class="disclaimer modern-disclaimer"><strong>גילוי נאות:</strong> התובנות הן כלי סינון והסבר בלבד. אין בהן המלצה לבטל, לרכוש או לשנות פוליסה. במיוחד בפוליסות ותיקות, סיעוד ובריאות, שינוי ללא בדיקה מקצועית עלול לפגוע בזכויות או בכיסוי.</div>
      </div>
    </div>`;
  document.getElementById('pensionMessageBtn')?.addEventListener('click',()=>{
    const url=window.PENSION_CONFIG?.contactMessageUrl||'';
    if(url){ window.open(url,'_blank','noopener,noreferrer'); return; }
    alert('אפשרות שליחת ההודעה תחובר לאחר בחירת ערוץ ההודעות. בינתיים אפשר להתקשר אלינו ב־04-8220228.');
  });
  document.getElementById('editData')?.addEventListener('click',()=>navigate('data'));
  document.getElementById('editDataSide')?.addEventListener('click',()=>navigate('data'));
  document.querySelectorAll('[data-dash-target]').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('.client-nav-item').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); document.getElementById(btn.dataset.dashTarget)?.scrollIntoView({behavior:'smooth',block:'start'}); }));
}

function scoreEngine(profile,p){
  let score=100; const insights=[];
  const add=(level,title,text,points)=>{insights.push({level,title,text}); score-=points||0;};

  if(p.pensionAssetFee>0.25) add('bad','דמי ניהול מצבירה דורשים בדיקה',`דמי הניהול שהזנת הם ${pct(p.pensionAssetFee)}. כדאי להשוות אותם להצעה עדכנית לפני קבלת החלטה.`,10);
  else add('good','דמי הניהול מצבירה נראים תחרותיים',`דמי ניהול של ${pct(p.pensionAssetFee)} נמצאים בטווח שנראה סביר לבדיקה ראשונית.`,0);

  if(p.pensionDepositFee>1.5) add('warn','דמי הניהול מההפקדה יחסית גבוהים',`אתה משלם ${pct(p.pensionDepositFee)} מההפקדה. שווה לבדוק האם ניתן לשפר את התנאים.`,6);
  else add('good','דמי הניהול מההפקדה נראים סבירים',`הזנת ${pct(p.pensionDepositFee)} מההפקדה.`,0);

  if(p.otherBalance>1000 && p.otherActive==='no') add('warn','נמצאה קופה לא פעילה',`יש ${money(p.otherBalance)} בקופה שסימנת כלא פעילה. לפני איחוד/ניוד צריך לבדוק תנאים, כיסויים ומאפיינים היסטוריים.`,8);
  if(!p.depositsOk) add('bad','כדאי לבדוק רצף הפקדות',`סימנת שההפקדות האחרונות אינן נראות תקינות. מומלץ להשוות תלושי שכר מול קליטות בפועל.`,12);
  else add('good','רצף ההפקדות נראה תקין',`לפי הסימון שלך אין כרגע חריגה ידועה בהפקדות האחרונות.`,0);

  const age=Number(profile.age||0);
  if(age && age<40 && profile.risk==='high' && p.pensionTrack==='bonds') add('warn','המסלול עשוי להיות שמרני ביחס לפרופיל שהגדרת',`בגיל ${age} ובפרופיל סיכון גבוה, מסלול אג"חי מצדיק בדיקה מול אופק ההשקעה שלך.`,7);
  if(age && age<35 && profile.risk!=='low' && p.studyTrack==='bonds') add('warn','קרן ההשתלמות במסלול שמרני',`בהתאם לגיל ולפרופיל שהזנת, כדאי לפחות לבדוק אם רמת הסיכון תואמת את מועד השימוש בכסף.`,5);

  const savings=p.pensionBalance+p.studyBalance+p.otherBalance;
  const annualDeposit=p.pensionDeposit*12;
  if(profile.salary>0 && p.pensionDeposit>0 && p.pensionDeposit/profile.salary<0.12) add('warn','יחס ההפקדה לשכר נמוך בבדיקה ראשונית',`ההפקדה החודשית שהזנת היא ${money(p.pensionDeposit)} מתוך שכר של ${money(profile.salary)}. ייתכן שחסרים רכיבים או שהוזן נתון חלקי.`,5);

  score=Math.max(35,Math.min(100,Math.round(score)));
  return {score,insights,savings,annualDeposit};
}

function scoreLabel(s){ if(s>=85)return ['מצוין','הנתונים נראים חזקים. עדיין כדאי לבצע בדיקה תקופתית.']; if(s>=70)return ['טוב','התמונה הכללית טובה, עם כמה נקודות שכדאי לשפר.']; if(s>=55)return ['דורש תשומת לב','יש מספר נושאים שכדאי לבדוק בצורה מסודרת.']; return ['דורש בדיקה','יש כמה נקודות מהותיות שמצדיקות בדיקה מקצועית.']; }

function renderDashboard(){
  app.appendChild(tpl('dashboardTpl'));
  if(state.reportType==='insurance' && state.insurance){ renderInsuranceDashboard(); return; }
  const p=state.pension, pr=state.profile||{};
  const r=scoreEngine(pr,p); const [label,desc]=scoreLabel(r.score);
  const container=document.getElementById('dashboardContent');
  const issueCount=r.insights.filter(x=>x.level!=='good').length;
  const isReal=state.mode==='real';
  const total=Math.max(1,r.savings);
  const pensionPct=Math.round((Number(p.pensionBalance||0)/total)*100);
  const studyPct=Math.round((Number(p.studyBalance||0)/total)*100);
  const otherPct=Math.max(0,100-pensionPct-studyPct);
  const firstName=(state.verification?.fullName||'').trim().split(/\s+/)[0]||'';
  const hello=firstName?`היי ${firstName}, `:'';
  const topIssues=r.insights.filter(x=>x.level!=='good').slice(0,3);
  const goodCount=r.insights.filter(x=>x.level==='good').length;

  container.innerHTML=`
    <div class="client-dashboard-shell">
      <aside class="client-sidebar" aria-label="ניווט בדשבורד">
        <div class="client-sidebar-brand"><span class="sidebar-logo">PC</span><span>Pension Control</span></div>
        <nav class="client-nav">
          <button class="client-nav-item active" data-dash-target="overview"><span class="nav-icon">⌂</span><span>מבט מהיר</span></button>
          <button class="client-nav-item" data-dash-target="savings"><span class="nav-icon">◔</span><span>החסכונות שלך</span></button>
          <button class="client-nav-item" data-dash-target="recommendations"><span class="nav-icon">✦</span><span>המלצות לשיפור</span></button>
          <button class="client-nav-item" id="editDataSide"><span class="nav-icon">✎</span><span>עריכת נתונים</span></button>
          <button class="client-nav-item" id="newCheckSide"><span class="nav-icon">＋</span><span>בדיקה חדשה</span></button>
        </nav>
        <div class="sidebar-help"><span class="sidebar-help-icon">?</span><div><strong>משהו לא ברור?</strong><small>המערכת מציגה תמונת מצב ראשונית בלבד.</small></div></div>
      </aside>

      <div class="client-main">
        <header class="client-dashboard-head" id="overview">
          <div>
            <span class="dashboard-mode ${isReal?'real-pill':'anon-pill'}">${isReal?'בדיקת התיק הפנסיוני והביטוחי':'בדיקה אנונימית'}</span>
            <h1>${hello}הנה התמונה הפנסיונית שלך</h1>
            <p>${isReal?'ריכזנו את הנתונים שהזנת והדגשנו את הנקודות שכדאי לבדוק.':'זו הערכה ראשונית המבוססת על הנתונים שהזנת בלבד.'}</p>
          </div>
          <button class="secondary soft-btn" id="editData">עריכת נתונים</button>
        </header>

        <div class="dashboard-highlight-row">
          <article class="welcome-score-card">
            <div class="welcome-score-top"><div><span class="card-kicker">Pension Score</span><h2>${label}</h2></div><span class="score-badge">${r.score}<small>/100</small></span></div>
            <p>${desc}</p>
            <div class="friendly-meter" aria-label="ציון ${r.score} מתוך 100"><span style="width:${r.score}%"></span></div>
            <div class="meter-labels"><span>כדאי לשפר</span><span>שווה בדיקה</span><span>נראה טוב</span></div>
          </article>

          <article class="total-savings-card" id="savings">
            <div class="savings-chart-wrap">
              <div class="savings-donut" style="--pension:${pensionPct};--study:${studyPct};--other:${otherPct}">
                <div class="savings-donut-center"><small>סה״כ חיסכון</small><strong>${money(r.savings)}</strong></div>
              </div>
            </div>
            <div class="savings-legend">
              <h3>החסכונות שלך</h3>
              <div><span class="legend-dot pension-dot"></span><span>קרן פנסיה</span><strong>${money(p.pensionBalance)}</strong></div>
              <div><span class="legend-dot study-dot"></span><span>קרן השתלמות</span><strong>${money(p.studyBalance)}</strong></div>
              <div><span class="legend-dot other-dot"></span><span>קופות נוספות</span><strong>${money(p.otherBalance)}</strong></div>
            </div>
          </article>
        </div>

        <div class="quick-stats-row">
          <article class="quick-stat-card"><span class="quick-stat-icon">₪</span><div><small>הפקדה שנתית משוערת</small><strong>${money(r.annualDeposit)}</strong></div></article>
          <article class="quick-stat-card"><span class="quick-stat-icon">!</span><div><small>נקודות שכדאי לבדוק</small><strong>${issueCount}</strong></div></article>
          <article class="quick-stat-card"><span class="quick-stat-icon">✓</span><div><small>מדדים שנראים תקינים</small><strong>${goodCount}</strong></div></article>
        </div>

        <section class="recommendation-section" id="recommendations">
          <div class="section-title-row"><div><span class="card-kicker">הצעד הבא שלך</span><h2>המלצות לשיפור</h2></div><span class="recommendation-count">${issueCount} נקודות לבדיקה</span></div>
          <div class="recommendation-layout">
            <article class="recommendation-meter-card">
              <h3>כמה מקום יש לשיפור?</h3>
              <div class="recommendation-scale"><span style="width:${Math.min(100,Math.max(8,100-r.score))}%"></span></div>
              <div class="recommendation-scale-labels"><span>נראה טוב</span><span>שווה בדיקה</span><span>ניתן לשפר</span></div>
              <div class="recommendation-summary"><strong>${issueCount===0?'התמונה נראית טובה':'יש כמה דברים ששווה לבדוק'}</strong><p>${issueCount===0?'לא זוהו כרגע נקודות משמעותיות לפי הנתונים שהזנת.':'אפשר לעבור על הנקודות מטה לפי סדר עדיפות, בלי לבצע שינוי אוטומטי באף מוצר.'}</p></div>
            </article>
            <div class="recommendation-list-modern">
              ${(topIssues.length?topIssues:[{level:'good',title:'לא זוהו כרגע חריגות משמעותיות',text:'מומלץ להמשיך לבצע בדיקה תקופתית ולוודא שהנתונים מעודכנים.'}]).map((i,idx)=>`
                <article class="recommendation-item ${i.level}">
                  <span class="recommendation-num">${String(idx+1).padStart(2,'0')}</span>
                  <div><h3>${i.title}</h3><p>${i.text}</p></div>
                  <span class="recommendation-arrow">←</span>
                </article>`).join('')}
            </div>
          </div>
        </section>

        <section class="pension-help-cta" aria-label="סיוע לשיפור התיק הפנסיוני">
          <div>
            <h2>רוצה לבדוק איך אפשר לשפר את התיק הפנסיוני שלך?</h2>
            <p>אם תרצה לעבור על התוצאות, להבין את הנקודות שעלו ולבחון מה כדאי לבדוק לעומק — אפשר לדבר איתנו. נשמח לעשות סדר ולכוון אותך להמשך הבדיקה.</p>
          </div>
          <div class="pension-help-actions">
            <a class="pension-help-call" href="tel:048220228">התקשרו 04-8220228</a>
            <button class="pension-help-message" id="pensionMessageBtn" type="button">שלחו הודעה</button>
          </div>
        </section>

        <section class="all-insights-section">
          <div class="section-title-row"><div><span class="card-kicker">פירוט מלא</span><h2>כל התובנות</h2></div></div>
          <div class="insight-list modern-insights">
            ${r.insights.map((i,idx)=>`<article class="insight-card ${i.level}"><header><span class="insight-icon">${i.level==='good'?'✓':i.level==='warn'?'!':'×'}</span><div><small>#${idx+1}</small><h3>${i.title}</h3></div></header><p>${i.text}</p></article>`).join('')}
          </div>
        </section>

        <div class="disclaimer modern-disclaimer"><strong>חשוב:</strong> ${isReal?'בדיקת האמת ב-MVP מבוססת על מידע אמיתי שהוזן/הועלה, אך עדיין אין משיכת נתונים אוטומטית מהמסלקה.':'הבדיקה האנונימית היא הערכה ראשונית ואינה מאמתת את הנתונים מול גוף חיצוני.'} אין כאן המלצה לבצע ניוד, שינוי מסלול, ביטול מוצר או רכישת מוצר פיננסי.</div>
      </div>
    </div>
  `;

  document.getElementById('editData')?.addEventListener('click',()=>navigate('data'));
  document.getElementById('editDataSide')?.addEventListener('click',()=>navigate('data'));
  document.getElementById('newCheckSide')?.addEventListener('click',()=>navigate('home'));
  document.querySelectorAll('[data-dash-target]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.client-nav-item').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.dashTarget)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
}


resetBtn.addEventListener('click',()=>{
  if(confirm('למחוק את כל הנתונים המקומיים ולהתחיל מחדש?')){ localStorage.removeItem(STORAGE_KEY); Object.keys(state).forEach(k=>delete state[k]); navigate('home'); }
});

window.addEventListener('hashchange',()=>render());
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
render();
