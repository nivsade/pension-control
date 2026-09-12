# Pension Control V9 — flow מלא מתוצאה עד ליד

הגרסה מוסיפה Admin להעלאת Excel, ניתוח אוטומטי, קישור אישי ללקוח, עמוד תוצאה, כפתור "רוצה שיחזרו אליי", ומעקב אחרי נשלח/נצפה/ביקש שיחה.

## התקנה
1. Supabase > SQL Editor: הרץ `supabase/migration-v9-results.sql` פעם אחת.
2. Supabase > Edge Functions > `submit-check`: החלף לקוד שב-`supabase/functions/submit-check/index.ts` ובצע Deploy.
3. GitHub: החלף/הוסף `admin.html`, `admin.js`, `result.html`, `result.js`, `styles.css`, `service-worker.js`.
4. אל תחליף את `config.js` החי שלך.
5. Hard Refresh: `Ctrl+Shift+R`.

## בדיקת קצה לקצה
צור בדיקת אמת → פתח `admin.html` → העלה Excel → צור קישור → פתח אותו בחלון פרטי → לחץ "רוצה שיחזרו אליי" → חזור ל-Admin ורענן.

הקישור הוא קישור סודי עם תוקף 30 יום. לפרודקשן מלא מומלץ בהמשך להוסיף OTP.
