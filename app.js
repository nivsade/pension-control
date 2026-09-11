const app = document.getElementById('app');
const resetBtn = document.getElementById('resetBtn');
const STORAGE_KEY = 'pension-control-v4';

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

function save(){
  // פרטים מזהים של מסלול בדיקת אמת אינם נשמרים ב-localStorage ב-MVP.
  const safeState={...state};
  delete safeState.verification;
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
  resetBtn.classList.toggle('hidden', !state.profile && !state.pension);
  if(view==='onboarding') renderOnboarding();
  else if(view==='verification') renderVerification();
  else if(view==='data') renderData();
  else if(view==='dashboard' && state.pension) renderDashboard();
  else renderHome();
  bindNavigation();
  app.focus({preventScroll:true});
}

function bindNavigation(){
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
}

function renderHome(){
  app.appendChild(tpl('homeTpl'));
  document.querySelector('[data-demo]').addEventListener('click',()=>{
    state.mode='anonymous';
    state.profile={age:27,salary:17000,family:'single',risk:'medium',goal:'understand'};
    state.pension={pensionBalance:312000,pensionDeposit:3150,pensionAssetFee:.28,pensionDepositFee:1.6,pensionTrack:'general',studyBalance:121000,studyFee:.65,studyTrack:'sp500',otherBalance:50500,otherActive:'no',depositsOk:true};
    save(); navigate('dashboard');
  });
  const scrollBtn=document.querySelector('[data-scroll-checks]');
  if(scrollBtn) scrollBtn.addEventListener('click',()=>document.getElementById('checkTypes')?.scrollIntoView({behavior:'smooth'}));
  document.querySelectorAll('[data-start-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    state.mode=btn.dataset.startMode;
    state.profile=null; state.pension=null; state.verification=null;
    save(); navigate('onboarding');
  }));
}

function renderOnboarding(){
  if(!state.mode) state.mode='anonymous';
  app.appendChild(tpl('onboardingTpl'));
  const isReal=state.mode==='real';
  const pill=document.getElementById('onboardingModePill');
  const step=document.getElementById('onboardingStepLabel');
  const continueBtn=document.getElementById('profileContinue');
  if(pill){ pill.textContent=isReal?'בדיקת אמת':'בדיקה אנונימית'; pill.classList.add(isReal?'real-pill':'anon-pill'); }
  if(step) step.textContent=isReal?'בדיקת אמת · שלב 1 מתוך 4':'בדיקה אנונימית · שלב 1 מתוך 3';
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
    // במכוון לא שומרים את תמונת החתימה ב-localStorage בגרסת ה-MVP.
    state.verification=obj; navigate('data');
  });
}

function renderData(){
  if(!state.profile) return navigate('onboarding');
  if(state.mode==='real' && !state.verification) return navigate('verification');
  app.appendChild(tpl('dataTpl'));
  const isReal=state.mode==='real';
  const step=document.getElementById('dataStepLabel');
  const pill=document.getElementById('dataModePill');
  const intro=document.getElementById('dataIntro');
  if(step) step.textContent=isReal?'בדיקת אמת · שלב 3 מתוך 4':'בדיקה אנונימית · שלב 2 מתוך 3';
  if(pill){ pill.textContent=isReal?'בדיקת אמת':'בדיקה אנונימית'; pill.classList.add(isReal?'real-pill':'anon-pill'); }
  if(intro) intro.textContent=isReal?'העלה דוח אמיתי והזן את הנתונים המרכזיים ממנו. בגרסת ה-MVP הניתוח מתבצע על הנתונים שהוזנו; חיבור אוטומטי למסלקה יתווסף ב-backend.':'אין צורך בשם, ת״ז או פרטי קשר. הזן את הנתונים שברשותך כדי לקבל הערכה ראשונית.';
  const form=document.getElementById('pensionForm');
  if(state.pension){ Object.entries(state.pension).forEach(([k,v])=>{ const el=form.elements[k]; if(!el)return; if(el.type==='checkbox')el.checked=!!v; else el.value=v; }); }
  document.getElementById('pickFile').addEventListener('click',()=>document.getElementById('reportFile').click());
  document.getElementById('reportFile').addEventListener('change',e=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>10*1024*1024){ alert('הקובץ גדול מ-10MB'); e.target.value=''; return; }
    document.getElementById('fileName').textContent=`נבחר: ${file.name} — ב-MVP הנתונים עדיין מוזנים ידנית`;
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const fd=new FormData(form); const obj=Object.fromEntries(fd.entries());
    ['pensionBalance','pensionDeposit','pensionAssetFee','pensionDepositFee','studyBalance','studyFee','otherBalance'].forEach(k=>obj[k]=Number(obj[k]||0));
    obj.depositsOk=form.elements.depositsOk.checked;
    state.pension=obj; save(); navigate('dashboard');
  });
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
  const p=state.pension, pr=state.profile||{};
  const r=scoreEngine(pr,p); const [label,desc]=scoreLabel(r.score);
  const container=document.getElementById('dashboardContent');
  const productCount=[p.pensionBalance,p.studyBalance,p.otherBalance].filter(x=>Number(x)>0).length;
  const issueCount=r.insights.filter(x=>x.level!=='good').length;
  const isReal=state.mode==='real';
  container.innerHTML=`
    <div class="dashboard-head">
      <div><span class="dashboard-mode">${isReal?'בדיקת אמת':'בדיקה אנונימית'}</span><br><span class="eyebrow">התמונה הפנסיונית שלך</span><h1>${isReal?'תמונת המצב שלך':'ההערכה האנונימית שלך'}</h1><p>${isReal?'התוצאה מבוססת על הנתונים האמיתיים שהוזנו מהדוח.':'הציון מבוסס רק על הנתונים שהזנת, ללא פרטים מזהים.'}</p></div>
      <div class="cta-row"><button class="secondary" id="editData">עריכת נתונים</button></div>
    </div>
    <div class="grid-score">
      <article class="metric-card">
        <h3>Pension Score</h3>
        <div class="score-large"><div class="score-ring" style="--score:${r.score}"><span>${r.score}</span><small>/100</small></div><div><h2>${label}</h2><p class="muted">${desc}</p></div></div>
      </article>
      <article class="metric-card">
        <h3>סיכום החיסכון</h3>
        <div class="metric-row"><span>פנסיה</span><strong>${money(p.pensionBalance)}</strong></div>
        <div class="metric-row"><span>קרן השתלמות</span><strong>${money(p.studyBalance)}</strong></div>
        <div class="metric-row"><span>קופות נוספות</span><strong>${money(p.otherBalance)}</strong></div>
        <div class="metric-row"><span>סה"כ</span><strong>${money(r.savings)}</strong></div>
      </article>
    </div>
    <div class="metrics-3">
      <div class="small-metric"><span>חיסכון כולל</span><strong>${money(r.savings)}</strong></div>
      <div class="small-metric"><span>הפקדה שנתית משוערת</span><strong>${money(r.annualDeposit)}</strong></div>
      <div class="small-metric"><span>נקודות לבדיקה</span><strong>${issueCount}</strong></div>
    </div>
    <section class="insights"><h2>מה כדאי לבדוק</h2><div class="insight-list">
      ${r.insights.map((i,idx)=>`<article class="insight-card ${i.level}"><header><span class="insight-icon">${i.level==='good'?'✓':i.level==='warn'?'!':'×'}</span><div><small>#${idx+1}</small><h3>${i.title}</h3></div></header><p>${i.text}</p></article>`).join('')}
    </div></section>
    <div class="disclaimer"><strong>חשוב:</strong> ${isReal?'בדיקת האמת ב-MVP מבוססת על מידע אמיתי שהוזן/הועלה, אך עדיין אין משיכת נתונים אוטומטית מהמסלקה.':'הבדיקה האנונימית היא הערכה ראשונית ואינה מאמתת את הנתונים מול גוף חיצוני.'} אין כאן המלצה לבצע ניוד, שינוי מסלול, ביטול מוצר או רכישת מוצר פיננסי.</div>
  `;
  document.getElementById('editData').addEventListener('click',()=>navigate('data'));
}

resetBtn.addEventListener('click',()=>{
  if(confirm('למחוק את כל הנתונים המקומיים ולהתחיל מחדש?')){ localStorage.removeItem(STORAGE_KEY); Object.keys(state).forEach(k=>delete state[k]); navigate('home'); }
});

window.addEventListener('hashchange',()=>render());
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
render();
