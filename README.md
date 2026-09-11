# Pension Control V5 — Real Requests + Admin

גרסת V5 הופכת את ה-MVP מדמו למערכת שמסוגלת לקבל בקשות אמת ולשמור אותן ב-Supabase.

## מה נוסף

- בדיקה אנונימית ממשיכה לעבוד בלי פרטים מזהים ובלי backend.
- בדיקת אמת שולחת ל-backend: שם, ת״ז, תאריך הנפקה, טלפון, אימייל, פרופיל בסיסי, הסכמות וחתימה.
- החתימה נשמרת ב-Supabase Storage בבאקט פרטי.
- נתוני הפנסיה שהלקוח מזין נשמרים על אותה בקשה.
- `admin.html` / `/admin` — מערכת ניהול בקשות עם התחברות מנהל, צפייה בפרטים, חתימה ועדכון סטטוס.
- RLS: דפדפן רגיל לא יכול לקרוא את טבלת הבקשות. רק משתמש שמופיע ב-`admin_users`.
- Edge Function ציבורית מקבלת את טופס הלקוח ושומרת אותו בצד שרת עם secret key. ה-secret key לעולם לא נמצא בקוד הדפדפן.

## מבנה

- `index.html` — האפליקציה לציבור
- `admin.html` — מערכת ניהול
- `app.js` — ה-flow וחישוב Pension Score
- `backend.js` — תקשורת ל-Edge Function
- `admin.js` — התחברות ומערכת ניהול
- `config.js` — URL + Publishable Key של Supabase
- `supabase/schema.sql` — טבלאות, RLS ו-Storage
- `supabase/functions/submit-check/index.ts` — API מאובטח לקבלת בקשות
- `supabase/config.toml` — הגדרת Edge Function

## שלב 1 — צור פרויקט Supabase

1. צור פרויקט חדש ב-Supabase.
2. פתח SQL Editor.
3. העתק והרץ את כל `supabase/schema.sql`.
4. ב-Authentication צור משתמש Admin עם האימייל שלך וסיסמה חזקה.
5. העתק את UUID של המשתמש והריץ ב-SQL:

```sql
insert into public.admin_users (user_id)
values ('PUT-YOUR-AUTH-USER-UUID-HERE');
```

## שלב 2 — Edge Function

העלה את `supabase/functions/submit-check` בשם `submit-check`.

אם אתה משתמש ב-Supabase CLI:

```bash
supabase functions deploy submit-check --no-verify-jwt
```

Supabase מספק ל-Edge Function את `SUPABASE_URL` ואת `SUPABASE_SECRET_KEYS` אוטומטית בפרויקט Hosted.

> לעולם אל תעתיק Secret Key / service role key ל-`config.js`, ל-GitHub או לקוד בדפדפן.

## שלב 3 — חבר את ה-Frontend

ב-Supabase > Connect / API Keys קח:

- Project URL
- Publishable key (`sb_publishable_...`)

עדכן `config.js`:

```js
window.PENSION_CONFIG = {
  supabaseUrl: 'https://PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_...',
  submitFunctionName: 'submit-check'
};
```

ה-Publishable key מיועד לקוד ציבורי. האבטחה בפועל נשענת על RLS והרשאות מינימליות.

## שלב 4 — בדיקה

1. פתח את האפליקציה.
2. בחר `בדיקת אמת`.
3. במסך ההרשאה אמורה להופיע הודעה ירוקה שה-backend מחובר.
4. שלח משתמש בדיקה בלבד.
5. פתח `/admin.html` (או `/admin` ב-Vercel עם `vercel.json`).
6. התחבר עם משתמש ה-Admin.
7. ודא שהבקשה מופיעה ושהחתימה נפתחת באמצעות URL זמני.

## שלב 5 — Vercel + app.l-lyn.com

העלה את התיקייה ל-GitHub וחבר את ה-Repository ל-Vercel. לאחר ה-Deploy אפשר להוסיף ב-Vercel דומיין מותאם אישית:

`app.l-lyn.com`

בניהול ה-DNS של הדומיין תוסיף את הרשומה ש-Vercel יציג לך. אין צורך לנחש מראש את ערך ה-DNS — Vercel ייתן את הרשומה המדויקת לפרויקט.

## לפני לקוחות אמיתיים

הקוד הוא בסיס טכני טוב לפיילוט, אבל מידע כמו ת״ז, תאריך הנפקה, חתימה ומידע פנסיוני הוא מידע רגיש. לפני פתיחה לקהל הרחב יש לבצע לפחות:

- נוסח פרטיות, הרשאה וגילוי נאות שעבר בדיקה משפטית/רגולטורית.
- הגדרת מטרות עיבוד המידע ותקופת שמירה/מחיקה.
- הגבלת CORS לדומיין שלך, rate limiting ו-CAPTCHA נגד ספאם.
- MFA לחשבון Admin.
- לוגים ובקרת גישה.
- גיבויים ונוהל אירוע אבטחת מידע.
- בדיקה האם הפעולות שאתה מתכוון לבצע מול מסלקה/גופים דורשות הרשאה, רישיון או נוסח ייפוי כוח מסוים.

אל תפתח את V5 לציבור עם פרטים אמיתיים לפני השלמת הנקודות האלה.
