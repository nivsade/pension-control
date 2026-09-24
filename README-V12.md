V12 changes:
- PC logo is visible in the landing-page header (and remains the favicon).
- Paid pension check now asks for full name, ID number, ID issue date, phone and email.
- Paid check states results are ready within up to 3 business days.
- Real/free check confirmation also states up to 3 business days.
- Run supabase/migration-v12-paid-id.sql, then redeploy submit-check Edge Function.
- Keep your existing config.js; do not overwrite it.
