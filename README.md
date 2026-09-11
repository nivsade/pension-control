# Pension Control – MVP

MVP בעברית לבדיקת בריאות פנסיונית. עובד ללא backend וללא חבילות חיצוניות.

## מה כלול
- Landing page
- שאלון משתמש
- הזנת פנסיה / השתלמות / קופות נוספות
- סימולציית העלאת דוח
- Pension Score מחושב בצד הלקוח
- מנוע תובנות בסיסי
- Dashboard רספונסיבי
- שמירת נתונים מקומית בדפדפן (`localStorage`)
- PWA + Service Worker לשימוש בסיסי offline
- RTL מלא

## הפעלה מקומית
אפשר לפתוח את `index.html`, אך בגלל Service Worker מומלץ להריץ שרת מקומי:

```bash
python -m http.server 8000
```

ואז לפתוח:

```text
http://localhost:8000
```

## העלאה ל-GitHub Pages
1. צור Repository חדש ב-GitHub.
2. העלה את כל הקבצים שבתיקייה זו לשורש ה-Repository.
3. ב-GitHub: Settings → Pages.
4. תחת Build and deployment בחר `Deploy from a branch`.
5. בחר `main` ו-`/(root)` ושמור.
6. GitHub ייתן לך URL ציבורי.

## לפני שימוש מסחרי אמיתי
גרסה זו היא Prototype ואינה מתאימה עדיין לאחסון מידע פנסיוני אמיתי. לפני השקה מסחרית יש להוסיף לפחות:
- Authentication אמיתי
- Database מאובטח (למשל Supabase/Postgres)
- Backend/API
- אחסון מסמכים מוצפן והרשאות משתמש
- Parser למסמכים אמיתיים
- לוגים, ניטור וגיבויים
- מדיניות פרטיות ותנאי שימוש
- בדיקת אבטחת מידע ורגולציה
- הפרדה ברורה בין מידע/אנליזה לבין ייעוץ או שיווק מפוקח

## השלב הבא המומלץ
להעביר את ה-UI ל-Next.js/Vercel ולחבר Supabase Auth + Database + Storage, תוך שמירה על אותו flow.
