const app = document.getElementById('app');
const resetBtn = document.getElementById('resetBtn');
const STORAGE_KEY = 'pension-control-v5';

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
    state.pension=obj; save();
    if(isReal && state.requestId && window.PensionBackend?.configured?.()){
      const submitBtn=form.querySelector('button[type=submit]');
      submitBtn.disabled=true; submitBtn.textContent='שומר נתונים...';
      window.PensionBackend.callFunction({action:'submit_pension',requestId:state.requestId,pension:obj})
        .then(()=>navigate('dashboard'))
        .catch(err=>{console.error(err); alert('הפרטים המזהים נשמרו, אך שמירת הנתונים הפנסיוניים נכשלה. אפשר לנסות שוב.'); submitBtn.disabled=false; submitBtn.textContent='נתח את החיסכון שלי';});
    } else navigate('dashboard');
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
            <span class="dashboard-mode ${isReal?'real-pill':'anon-pill'}">${isReal?'בדיקת אמת':'בדיקה אנונימית'}</span>
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
